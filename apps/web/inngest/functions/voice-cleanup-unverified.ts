// ---------------------------------------------------------------------------
// Cleanup Unverified Submissions — apps/web/inngest/functions/voice-cleanup-unverified.ts
// ---------------------------------------------------------------------------
// Daily cron (1 AM ET = 5 AM UTC) that deletes voice submissions stuck in
// pending_email status with expired verification tokens.
//
// See Artifact 10 §6.2, function voice-cleanup-unverified.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';

export const voiceCleanupUnverified = inngest.createFunction(
  { id: 'voice-cleanup-unverified' },
  { cron: '0 5 * * *' }, // 1 AM ET = 5 AM UTC
  async ({ step }) => {
    const deletedCount = await step.run('delete-expired-unverified', async () => {
      const supabase = createServiceClient();

      // Delete submissions that are still pending_email and whose
      // verification token has expired.
      const { data, error } = await supabase
        .from('voice_submissions')
        .delete()
        .eq('moderation_status', 'pending_email')
        .lt('email_token_expires', new Date().toISOString())
        .select('id');

      if (error) {
        throw new Error(`Failed to cleanup unverified submissions: ${error.message}`);
      }

      const count = data?.length ?? 0;
      if (count > 0) {
        console.log(`[voice-cleanup-unverified] Deleted ${count} expired unverified submissions`);
      }
      return count;
    });

    return { deletedCount };
  },
);
