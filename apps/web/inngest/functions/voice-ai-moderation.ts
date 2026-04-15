// ---------------------------------------------------------------------------
// Voice AI Moderation — apps/web/inngest/functions/voice-ai-moderation.ts
// ---------------------------------------------------------------------------
// Triggered by 'voice/submitted' (fired when email verification completes).
// Runs Claude Haiku 4.5 moderation, updates the submission status, logs
// the decision, and routes to the appropriate notification event.
//
// Fails open: API errors route to human review, never silent discard.
// See Artifact 10 §2.2–§2.3 for the full spec.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getAiModerator } from '@/lib/ai/moderation-adapter';
import { moderateSubmission } from '@confluenceohio/core/voices/moderate';
import type { VoicePosition } from '@confluenceohio/core/voices/types';

export const moderateVoiceSubmission = inngest.createFunction(
  { id: 'voice-ai-moderation', retries: 2 },
  { event: 'voice/submitted' },
  async ({ event, step }) => {
    const submission = event.data.submission as {
      id: string;
      author_name: string;
      author_email: string;
      author_neighborhood: string | null;
      position: VoicePosition;
      title: string;
      body: string;
      slug: string;
    };

    // ── Step 1: Run AI moderation ──
    const outcome = await step.run('ai-moderation', async () => {
      const moderator = getAiModerator();
      return moderateSubmission(moderator, {
        position: submission.position,
        author_name: submission.author_name,
        author_neighborhood: submission.author_neighborhood,
        title: submission.title,
        body: submission.body,
      });
    });

    const { aiResult, newStatus } = outcome;

    // ── Step 2: Update submission status + log moderation action ──
    await step.run('update-submission-status', async () => {
      const supabase = createServiceClient();

      const updatePayload: Record<string, unknown> = {
        moderation_status: newStatus,
        moderation_ai_result: aiResult,
        moderation_ai_at: new Date().toISOString(),
      };

      // Set approved/rejected timestamps per status
      if (newStatus === 'auto_approved') {
        updatePayload.approved_at = new Date().toISOString();
      } else if (newStatus === 'rejected') {
        updatePayload.rejected_at = new Date().toISOString();
        updatePayload.rejection_reason = aiResult.reasoning;
      }

      const { error: updateError } = await supabase
        .from('voice_submissions')
        .update(updatePayload)
        .eq('id', submission.id);

      if (updateError) {
        throw new Error(`Failed to update voice submission: ${updateError.message}`);
      }

      // Insert moderation log entry (audit trail)
      const { error: logError } = await supabase
        .from('moderation_log')
        .insert({
          voice_submission_id: submission.id,
          action: `ai_${aiResult.decision}`,
          actor_type: 'ai',
          ai_confidence: aiResult.confidence,
          reasoning: aiResult.reasoning,
          metadata: { flagged_issues: aiResult.flagged_issues },
        });

      if (logError) {
        // Non-fatal — log but don't fail the function
        console.error('[voice-ai-moderation] Failed to insert moderation log:', logError);
      }
    });

    // ── Step 3: Route to notification event ──
    if (newStatus === 'auto_approved') {
      await step.sendEvent('notify-auto-approved', {
        name: 'voice/auto-approved',
        data: { submissionId: submission.id },
      });
    } else if (newStatus === 'rejected') {
      await step.sendEvent('notify-rejected', {
        name: 'voice/ai-rejected',
        data: { submissionId: submission.id, aiResult },
      });
    } else {
      // needs_review (from flag_for_review, low-confidence reject, or API error)
      await step.sendEvent('notify-needs-review', {
        name: 'voice/needs-review',
        data: { submissionId: submission.id, aiResult },
      });
    }

    return { submissionId: submission.id, status: newStatus, aiResult };
  },
);
