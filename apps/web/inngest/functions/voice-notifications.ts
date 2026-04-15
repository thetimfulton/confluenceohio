// ---------------------------------------------------------------------------
// Voice Notification Functions — apps/web/inngest/functions/voice-notifications.ts
// ---------------------------------------------------------------------------
// Inngest functions that handle email notifications for voice submission
// lifecycle events: auto-approval, rejection, and human approval.
//
// See Artifact 10 §5 for email template specs and §6.2 for function list.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';
import type { AiModerationResult } from '@confluenceohio/core/voices/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

// ============================================
// Auto-Approval Notification (voice/auto-approved)
// ============================================

export const voiceAutoApproveNotify = inngest.createFunction(
  { id: 'voice-auto-approve-notify', retries: 2 },
  { event: 'voice/auto-approved' },
  async ({ event, step }) => {
    const { submissionId } = event.data as { submissionId: string };

    // Fetch the submission for email params
    const submission = await step.run('fetch-submission', async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('voice_submissions')
        .select('author_name, author_email, title, slug')
        .eq('id', submissionId)
        .single();

      if (error || !data) {
        throw new Error(`Submission ${submissionId} not found: ${error?.message}`);
      }
      return data;
    });

    // Send approval email to the author
    await step.run('send-approval-email', async () => {
      const email = getEmailAdapter();
      const voiceUrl = `${SITE_URL}/voices/${submission.slug}`;
      const twitterText = encodeURIComponent(
        `Read this perspective on renaming Columbus: ${voiceUrl}`,
      );

      await email.sendTransactional({
        templateId: getTemplateId('VOICE_APPROVED'),
        to: submission.author_email,
        toName: submission.author_name,
        params: {
          DISPLAY_NAME: submission.author_name,
          VOICE_URL: voiceUrl,
          TWITTER_SHARE_URL: `https://twitter.com/intent/tweet?text=${twitterText}`,
          FACEBOOK_SHARE_URL: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(voiceUrl)}`,
        },
        tags: ['voice-approved', 'voice-auto'],
      });
    });

    // Increment voice_submission_count metric
    await step.run('increment-metric', async () => {
      const supabase = createServiceClient();
      const { error } = await supabase.rpc('increment_metric', {
        metric_name: 'voice_submission_count',
        increment_by: 1,
      });

      if (error) {
        // Non-fatal — log but don't fail
        console.error('[voice-auto-approve-notify] Failed to increment metric:', error);
      }
    });

    return { submissionId, notified: true };
  },
);

// ============================================
// Rejection Notification (voice/ai-rejected OR voice/human-rejected)
// ============================================

/**
 * Map AI flagged issues to human-readable rejection reasons.
 * Per Artifact 10 §5.3 rejection reason mapping.
 */
function mapRejectionReason(aiResult: AiModerationResult): string {
  const issues = aiResult.flagged_issues.map((i) => i.toLowerCase());

  if (issues.some((i) => i.includes('hate') || i.includes('slur') || i.includes('dehumaniz'))) {
    return 'Your submission contained language that violates our hate speech guidelines.';
  }
  if (issues.some((i) => i.includes('personal attack') || i.includes('name-calling'))) {
    return 'Your submission contained language that targeted specific individuals.';
  }
  if (issues.some((i) => i.includes('spam') || i.includes('commercial') || i.includes('promotion'))) {
    return 'Your submission appeared to be spam or commercial content.';
  }
  if (issues.some((i) => i.includes('off-topic') || i.includes('off topic'))) {
    return "Your submission didn't appear to be about the question of renaming Columbus.";
  }
  if (issues.some((i) => i.includes('ai-generated') || i.includes('ai generated'))) {
    return 'Your submission appeared to be AI-generated rather than a personal perspective.';
  }
  if (issues.some((i) => i.includes('threat') || i.includes('violence'))) {
    return 'Your submission contained language that violates our community guidelines regarding threats or incitement.';
  }

  // Fallback: use the AI reasoning directly
  return aiResult.reasoning;
}

export const voiceRejectionNotify = inngest.createFunction(
  { id: 'voice-rejection-notify', retries: 2 },
  [{ event: 'voice/ai-rejected' }, { event: 'voice/human-rejected' }],
  async ({ event, step }) => {
    const { submissionId } = event.data as {
      submissionId: string;
      aiResult?: AiModerationResult;
      adminId?: string;
      reason?: string;
    };

    const submission = await step.run('fetch-submission', async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('voice_submissions')
        .select('author_name, author_email, rejection_reason, moderation_ai_result, moderation_note')
        .eq('id', submissionId)
        .single();

      if (error || !data) {
        throw new Error(`Submission ${submissionId} not found: ${error?.message}`);
      }
      return data;
    });

    await step.run('send-rejection-email', async () => {
      const email = getEmailAdapter();

      // Determine the rejection reason text
      let rejectionReason: string;
      let moderatorNote = '';

      if (event.name === 'voice/human-rejected') {
        // Human rejection uses the admin's provided reason
        const { reason } = event.data as { reason?: string };
        rejectionReason = submission.rejection_reason || reason || 'Your submission did not meet our community guidelines.';
        moderatorNote = submission.moderation_note || '';
      } else {
        // AI rejection: map flagged issues to friendly reason text
        const aiResult = (event.data as { aiResult?: AiModerationResult }).aiResult
          || submission.moderation_ai_result as AiModerationResult | null;

        if (aiResult) {
          rejectionReason = mapRejectionReason(aiResult);
        } else {
          rejectionReason = 'Your submission did not meet our community guidelines.';
        }
      }

      await email.sendTransactional({
        templateId: getTemplateId('VOICE_REJECTED'),
        to: submission.author_email,
        toName: submission.author_name,
        params: {
          DISPLAY_NAME: submission.author_name,
          REJECTION_REASON: rejectionReason,
          MODERATOR_NOTE: moderatorNote,
        },
        tags: [
          'voice-rejected',
          event.name === 'voice/human-rejected' ? 'voice-human' : 'voice-ai',
        ],
      });
    });

    return { submissionId, notified: true };
  },
);

// ============================================
// Human Approval Notification (voice/human-approved)
// ============================================

export const voiceHumanApprovalNotify = inngest.createFunction(
  { id: 'voice-approval-notify', retries: 2 },
  { event: 'voice/human-approved' },
  async ({ event, step }) => {
    const { submissionId } = event.data as { submissionId: string };

    const submission = await step.run('fetch-submission', async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('voice_submissions')
        .select('author_name, author_email, title, slug')
        .eq('id', submissionId)
        .single();

      if (error || !data) {
        throw new Error(`Submission ${submissionId} not found: ${error?.message}`);
      }
      return data;
    });

    await step.run('send-approval-email', async () => {
      const email = getEmailAdapter();
      const voiceUrl = `${SITE_URL}/voices/${submission.slug}`;
      const twitterText = encodeURIComponent(
        `Read this perspective on renaming Columbus: ${voiceUrl}`,
      );

      await email.sendTransactional({
        templateId: getTemplateId('VOICE_APPROVED'),
        to: submission.author_email,
        toName: submission.author_name,
        params: {
          DISPLAY_NAME: submission.author_name,
          VOICE_URL: voiceUrl,
          TWITTER_SHARE_URL: `https://twitter.com/intent/tweet?text=${twitterText}`,
          FACEBOOK_SHARE_URL: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(voiceUrl)}`,
        },
        tags: ['voice-approved', 'voice-human'],
      });
    });

    // Increment metric
    await step.run('increment-metric', async () => {
      const supabase = createServiceClient();
      const { error } = await supabase.rpc('increment_metric', {
        metric_name: 'voice_submission_count',
        increment_by: 1,
      });

      if (error) {
        console.error('[voice-approval-notify] Failed to increment metric:', error);
      }
    });

    return { submissionId, notified: true };
  },
);

// ============================================
// Edit Notification (voice/edited)
// ============================================

export const voiceEditNotify = inngest.createFunction(
  { id: 'voice-edit-notify', retries: 2 },
  { event: 'voice/edited' },
  async ({ event, step }) => {
    const { submissionId, editNote } = event.data as {
      submissionId: string;
      adminId: string;
      editNote: string;
    };

    const submission = await step.run('fetch-submission', async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('voice_submissions')
        .select('author_name, author_email, slug')
        .eq('id', submissionId)
        .single();

      if (error || !data) {
        throw new Error(`Submission ${submissionId} not found: ${error?.message}`);
      }
      return data;
    });

    await step.run('send-edit-email', async () => {
      const email = getEmailAdapter();
      const voiceUrl = `${SITE_URL}/voices/${submission.slug}`;

      await email.sendTransactional({
        templateId: getTemplateId('VOICE_EDITED'),
        to: submission.author_email,
        toName: submission.author_name,
        params: {
          DISPLAY_NAME: submission.author_name,
          EDIT_NOTE: editNote,
          VOICE_URL: voiceUrl,
        },
        tags: ['voice-edited'],
      });
    });

    return { submissionId, notified: true };
  },
);
