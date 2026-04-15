// ---------------------------------------------------------------------------
// Donation Milestones — apps/web/inngest/functions/donation-milestones.ts
// ---------------------------------------------------------------------------
// Inngest function triggered by 'donation/milestone.check' (fired by
// process-donation after each donation). Reads the current campaign total
// from campaign_metrics and fires a milestone event when thresholds are
// crossed.
//
// See Artifact 09 §5 (handoff C-F) and Artifact 07 §2.8.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Donation milestone thresholds in cents.
 * When campaign_metrics.donation_total_cents crosses one of these,
 * a 'donation/milestone.reached' event fires.
 */
const MILESTONE_THRESHOLDS_CENTS = [
  100_00, //   $1,000
  500_00, //   $5,000
  1_000_00, // $10,000
  2_500_00, // $25,000
  5_000_00, // $50,000
  10_000_00, // $100,000
] as const;

// Use dollar amounts for the thresholds (clearer in event data / admin UI)
const MILESTONES = MILESTONE_THRESHOLDS_CENTS.map((cents) => ({
  cents,
  dollars: cents / 100,
  label: `$${(cents / 100).toLocaleString()}`,
}));

export const donationMilestoneCheck = inngest.createFunction(
  {
    id: 'donation-milestone-check',
    name: 'Donation Milestone Check',
    retries: 2,
  },
  { event: 'donation/milestone.check' },

  async ({ event, step }) => {
    const currentTotal = await step.run('read-donation-total', async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('campaign_metrics')
        .select('value')
        .eq('metric', 'donation_total_cents')
        .single();

      if (error || !data) {
        throw new Error(
          `Failed to read donation_total_cents: ${error?.message}`,
        );
      }

      return data.value as number;
    });

    // Check each threshold — fire at most one milestone (the highest crossed).
    // We check from highest to lowest and pick the first one where total >= threshold.
    const crossedMilestone = await step.run('find-crossed-milestone', async () => {
      const supabase = createServiceClient();

      // Find highest milestone that the current total meets or exceeds
      // but that hasn't already been recorded
      for (let i = MILESTONES.length - 1; i >= 0; i--) {
        const milestone = MILESTONES[i];
        if (currentTotal >= milestone.cents) {
          // Check if this milestone was already fired by looking for a record
          // in a simple approach: query donations to see if the total was already
          // above this threshold before this donation. We use a lightweight check:
          // the previous total (current - this donation's amount).
          const previousTotal =
            currentTotal - ((event.data as { amountCents: number }).amountCents ?? 0);

          if (previousTotal < milestone.cents) {
            // This donation pushed us over the threshold
            return milestone;
          }
        }
      }

      return null;
    });

    if (crossedMilestone) {
      await step.run('fire-milestone-event', async () => {
        await inngest.send({
          name: 'donation/milestone.reached',
          data: {
            milestoneCents: crossedMilestone.cents,
            milestoneDollars: crossedMilestone.dollars,
            milestoneLabel: crossedMilestone.label,
            currentTotalCents: currentTotal,
          },
        });
      });
    }
  },
);

/**
 * Handles the donation/milestone.reached event:
 * sends admin notification and optionally triggers social sharing content.
 */
export const donationMilestoneNotify = inngest.createFunction(
  {
    id: 'donation-milestone-notify',
    name: 'Donation Milestone Notification',
    retries: 2,
  },
  { event: 'donation/milestone.reached' },

  async ({ event, step }) => {
    const { milestoneLabel, milestoneDollars, currentTotalCents } =
      event.data as {
        milestoneCents: number;
        milestoneDollars: number;
        milestoneLabel: string;
        currentTotalCents: number;
      };

    // ── Notify admin(s) ──

    await step.run('notify-admins', async () => {
      const supabase = createServiceClient();

      // Fetch admin email addresses
      const { data: admins } = await supabase
        .from('admin_users')
        .select('email')
        .eq('role', 'admin');

      if (!admins || admins.length === 0) {
        console.warn('[Milestone] No admin users found to notify');
        return;
      }

      // Log the milestone for now; admin notification email template
      // can be added as a Brevo template when ready.
      console.log(
        `[Milestone] Donation milestone reached: ${milestoneLabel}. ` +
          `Current total: $${(currentTotalCents / 100).toFixed(2)}. ` +
          `Admins to notify: ${admins.map((a) => a.email).join(', ')}`,
      );

      // If an admin milestone template exists, send it
      // (gracefully skip if not configured yet)
      try {
        const { getEmailAdapter } = await import('@confluenceohio/email');
        const brevo = getEmailAdapter();

        for (const admin of admins) {
          await brevo.sendTransactional({
            templateId: parseInt(
              process.env.BREVO_TEMPLATE_ADMIN_DONATION_MILESTONE ?? '0',
              10,
            ),
            to: admin.email,
            params: {
              MILESTONE: milestoneLabel,
              MILESTONE_DOLLARS: milestoneDollars,
              CURRENT_TOTAL: `$${(currentTotalCents / 100).toFixed(2)}`,
            },
            tags: ['admin', 'donation-milestone'],
          });
        }
      } catch (err) {
        // Non-critical — log and continue
        console.warn('[Milestone] Admin notification email failed:', err);
      }
    });

    // ── Log milestone for social sharing (future: auto-generate share content) ──

    await step.run('log-milestone', async () => {
      console.log(
        `[Milestone] 🎉 Donation milestone: ${milestoneLabel} reached! ` +
          `Total raised: $${(currentTotalCents / 100).toFixed(2)}`,
      );
    });
  },
);
