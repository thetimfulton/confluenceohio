// ---------------------------------------------------------------------------
// Voice Admin Digest — apps/web/inngest/functions/voice-admin-digest.ts
// ---------------------------------------------------------------------------
// Daily cron (9 AM ET = 1 PM UTC) that compiles a digest of submissions
// awaiting human review and sends it to all admin users.
//
// Skips sending if there are no pending submissions.
// See Artifact 10 §2.5 for the full spec.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

export const voiceAdminDigest = inngest.createFunction(
  { id: 'voice-admin-digest' },
  { cron: '0 13 * * *' }, // 9 AM ET = 1 PM UTC
  async ({ step }) => {
    // ── Fetch submissions needing review ──
    const pending = await step.run('fetch-pending', async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('voice_submissions')
        .select('id, author_name, position, title, body, submitted_at, moderation_ai_result')
        .eq('moderation_status', 'needs_review')
        .order('submitted_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch pending submissions: ${error.message}`);
      }
      return data ?? [];
    });

    if (pending.length === 0) {
      return { sent: false, reason: 'no_pending_submissions' };
    }

    // ── Count auto-approved in last 24h for context ──
    const autoApprovedCount = await step.run('count-auto-approved', async () => {
      const supabase = createServiceClient();
      const { count, error } = await supabase
        .from('voice_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('moderation_status', 'auto_approved')
        .gte('moderation_ai_at', new Date(Date.now() - 86_400_000).toISOString());

      if (error) {
        console.error('[voice-admin-digest] Failed to count auto-approved:', error);
        return 0;
      }
      return count ?? 0;
    });

    // ── Fetch admin emails ──
    const adminEmails = await step.run('fetch-admin-emails', async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('admin_users')
        .select('email')
        .in('role', ['admin', 'moderator']);

      if (error || !data || data.length === 0) {
        console.error('[voice-admin-digest] No admin emails found:', error);
        return [];
      }
      return data.map((row) => row.email);
    });

    if (adminEmails.length === 0) {
      return { sent: false, reason: 'no_admin_emails' };
    }

    // ── Send digest email to each admin ──
    await step.run('send-digest', async () => {
      const email = getEmailAdapter();

      // Brevo's sendTransactional only supports a single `to` address,
      // so we send one email per admin.
      const submissions = pending.map((s) => {
        const aiResult = s.moderation_ai_result as {
          decision?: string;
          confidence?: number;
          flagged_issues?: string[];
        } | null;

        return {
          id: s.id,
          author: s.author_name,
          position: s.position,
          title: s.title || '(no title)',
          excerpt: s.body.slice(0, 200) + (s.body.length > 200 ? '\u2026' : ''),
          ai_decision: aiResult?.decision ?? 'unknown',
          ai_confidence: aiResult?.confidence ?? 0,
          ai_issues: aiResult?.flagged_issues?.join(', ') || 'none',
          review_url: `${SITE_URL}/admin/voices/${s.id}`,
        };
      });

      for (const adminEmail of adminEmails) {
        try {
          await email.sendTransactional({
            templateId: getTemplateId('VOICE_ADMIN_DIGEST'),
            to: adminEmail,
            params: {
              PENDING_COUNT: pending.length,
              AUTO_APPROVED_COUNT: autoApprovedCount,
              SUBMISSIONS: submissions,
              ADMIN_URL: `${SITE_URL}/admin/voices?status=needs_review`,
            },
            tags: ['voice-admin-digest'],
          });
        } catch (err) {
          console.error(`[voice-admin-digest] Failed to send to ${adminEmail}:`, err);
        }
      }
    });

    return {
      sent: true,
      pendingCount: pending.length,
      autoApprovedCount,
      adminCount: adminEmails.length,
    };
  },
);
