import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';
import { inngest } from '@/inngest/client';

// ---------------------------------------------------------------------------
// Rejection reasons — maps to Artifact 10 §3.3
// ---------------------------------------------------------------------------

const REJECTION_REASONS = [
  'personal_attack',
  'spam',
  'off_topic',
  'hate_speech',
  'ai_generated',
  'other',
] as const;

type RejectionReason = (typeof REJECTION_REASONS)[number];

const REJECTION_LABELS: Record<RejectionReason, string> = {
  personal_attack: 'Contains personal attacks or name-calling',
  spam: 'Spam or commercial content',
  off_topic: 'Off-topic or unrelated to the renaming question',
  hate_speech: 'Hate speech or dehumanizing language',
  ai_generated: 'Appears to be AI-generated',
  other: 'Other community guidelines violation',
};

// ---------------------------------------------------------------------------
// Action schemas
// ---------------------------------------------------------------------------

const ApproveSchema = z.object({
  action: z.literal('approve'),
});

const RejectSchema = z.object({
  action: z.literal('reject'),
  reason: z.enum(REJECTION_REASONS),
  note: z.string().max(500).optional(),
});

const EditSchema = z.object({
  action: z.literal('edit'),
  title: z.string().max(100).optional(),
  body: z.string().min(50).max(2500),
  edit_note: z.string().min(1).max(500),
});

const FeatureSchema = z.object({
  action: z.literal('feature'),
});

const UnfeatureSchema = z.object({
  action: z.literal('unfeature'),
});

const ActionSchema = z.discriminatedUnion('action', [
  ApproveSchema,
  RejectSchema,
  EditSchema,
  FeatureSchema,
  UnfeatureSchema,
]);

// ---------------------------------------------------------------------------
// Role requirements per action
// ---------------------------------------------------------------------------

const ADMIN_ONLY_ACTIONS = new Set(['edit']);

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/admin/voices/[id]/moderate
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await requireAdminFromRequest(request, ['admin', 'moderator']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const action = parsed.data;

  // Enforce admin-only actions
  if (ADMIN_ONLY_ACTIONS.has(action.action) && admin.role !== 'admin') {
    return NextResponse.json(
      { error: 'This action requires admin role' },
      { status: 403 },
    );
  }

  const supabase = createServiceClient();

  // Fetch current submission
  const { data: submission, error: fetchError } = await supabase
    .from('voice_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  switch (action.action) {
    // ── Approve ──
    case 'approve': {
      const { error: updateError } = await supabase
        .from('voice_submissions')
        .update({
          moderation_status: 'approved',
          approved_at: now,
          moderated_by: admin.id,
        })
        .eq('id', id);

      if (updateError) {
        console.error('[Admin/Voices] Approve error:', updateError);
        return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
      }

      await supabase.from('moderation_log').insert({
        voice_submission_id: id,
        action: 'human_approve',
        actor_type: 'human',
        actor_id: admin.id,
        reasoning: 'Manually approved by moderator',
      });

      await inngest.send({
        name: 'voice/human-approved',
        data: { submissionId: id },
      });

      revalidatePath('/voices');
      return NextResponse.json({ status: 'approved' });
    }

    // ── Reject ──
    case 'reject': {
      const rejectionText = REJECTION_LABELS[action.reason];
      const { error: updateError } = await supabase
        .from('voice_submissions')
        .update({
          moderation_status: 'rejected',
          rejected_at: now,
          rejection_reason: rejectionText,
          moderation_note: action.note || null,
          moderated_by: admin.id,
        })
        .eq('id', id);

      if (updateError) {
        console.error('[Admin/Voices] Reject error:', updateError);
        return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
      }

      await supabase.from('moderation_log').insert({
        voice_submission_id: id,
        action: 'human_reject',
        actor_type: 'human',
        actor_id: admin.id,
        reasoning: rejectionText,
        metadata: { reason_code: action.reason, note: action.note },
      });

      await inngest.send({
        name: 'voice/human-rejected',
        data: {
          submissionId: id,
          adminId: admin.id,
          reason: rejectionText,
        },
      });

      revalidatePath('/voices');
      return NextResponse.json({ status: 'rejected' });
    }

    // ── Edit (admin only) ──
    case 'edit': {
      const original = { title: submission.title, body: submission.body };

      const updatePayload: Record<string, unknown> = {
        body: action.body,
      };
      if (action.title !== undefined) {
        updatePayload.title = action.title;
      }

      const { error: updateError } = await supabase
        .from('voice_submissions')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) {
        console.error('[Admin/Voices] Edit error:', updateError);
        return NextResponse.json({ error: 'Failed to edit' }, { status: 500 });
      }

      await supabase.from('moderation_log').insert({
        voice_submission_id: id,
        action: 'edit',
        actor_type: 'human',
        actor_id: admin.id,
        reasoning: action.edit_note,
        metadata: { original },
      });

      await inngest.send({
        name: 'voice/edited',
        data: {
          submissionId: id,
          adminId: admin.id,
          editNote: action.edit_note,
        },
      });

      revalidatePath('/voices');
      return NextResponse.json({ status: 'edited' });
    }

    // ── Feature ──
    case 'feature': {
      // Anonymous submissions cannot be featured
      if (
        !submission.author_name ||
        submission.author_name.toLowerCase() === 'anonymous'
      ) {
        return NextResponse.json(
          { error: 'Anonymous submissions cannot be featured' },
          { status: 422 },
        );
      }

      // Only approved submissions can be featured
      if (
        submission.moderation_status !== 'approved' &&
        submission.moderation_status !== 'auto_approved'
      ) {
        return NextResponse.json(
          { error: 'Only approved submissions can be featured' },
          { status: 422 },
        );
      }

      const { error: updateError } = await supabase
        .from('voice_submissions')
        .update({ featured: true })
        .eq('id', id);

      if (updateError) {
        console.error('[Admin/Voices] Feature error:', updateError);
        return NextResponse.json({ error: 'Failed to feature' }, { status: 500 });
      }

      await supabase.from('moderation_log').insert({
        voice_submission_id: id,
        action: 'feature',
        actor_type: 'human',
        actor_id: admin.id,
        reasoning: 'Marked as featured',
      });

      revalidatePath('/voices');
      return NextResponse.json({ status: 'featured' });
    }

    // ── Unfeature ──
    case 'unfeature': {
      const { error: updateError } = await supabase
        .from('voice_submissions')
        .update({ featured: false })
        .eq('id', id);

      if (updateError) {
        console.error('[Admin/Voices] Unfeature error:', updateError);
        return NextResponse.json({ error: 'Failed to unfeature' }, { status: 500 });
      }

      await supabase.from('moderation_log').insert({
        voice_submission_id: id,
        action: 'unfeature',
        actor_type: 'human',
        actor_id: admin.id,
        reasoning: 'Removed from featured',
      });

      revalidatePath('/voices');
      return NextResponse.json({ status: 'unfeatured' });
    }
  }
}
