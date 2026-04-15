// ---------------------------------------------------------------------------
// Process Donation — apps/web/inngest/functions/process-donation.ts
// ---------------------------------------------------------------------------
// Inngest function triggered by 'donation/received' (fired by the ActBlue
// webhook handler). Updates Brevo contact attributes, adds to Donor list,
// and sends the appropriate thank-you email.
//
// See Artifact 07 §2.10 and Artifact 09 §2.3.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';

interface DonationReceivedData {
  email: string;
  donorName: string;
  amountCents: number;
  recurring: boolean;
  refcode?: string;
  orderNumber: string;
}

export const processDonation = inngest.createFunction(
  {
    id: 'process-donation',
    name: 'Process Donation',
    retries: 3,
  },
  { event: 'donation/received' },

  async ({ event, step }) => {
    const { email, donorName, amountCents, recurring, orderNumber } =
      event.data as DonationReceivedData;

    const brevo = getEmailAdapter();
    const supabase = createServiceClient();

    // ── Step 1: Determine if this is a first-time donor ──

    const isFirstDonation = await step.run('check-first-donation', async () => {
      const { count } = await supabase
        .from('donations')
        .select('id', { count: 'exact', head: true })
        .eq('donor_email', email);

      // count === 1 means this is the only donation for this email
      // (the current one was already inserted by the webhook handler)
      return (count ?? 0) <= 1;
    });

    // ── Step 2: Compute lifetime total for this donor ──

    const lifetimeTotal = await step.run('compute-lifetime-total', async () => {
      const { data } = await supabase
        .from('donations')
        .select('amount_cents')
        .eq('donor_email', email);

      if (!data || data.length === 0) return amountCents;
      return data.reduce((sum, d) => sum + d.amount_cents, 0);
    });

    // ── Step 3: Update Brevo contact with donor attributes ──

    await step.run('update-brevo-donor', async () => {
      await brevo.updateContactAttribute(email, {
        DONOR: true,
        LAST_DONATION_DATE: new Date().toISOString().split('T')[0],
        TOTAL_DONATED: lifetimeTotal,
      });

      const donorListId = parseInt(process.env.BREVO_LIST_DONORS!, 10);
      await brevo.addContactToLists(email, [donorListId]);
    });

    // ── Step 4: Add to Recurring Donor list if applicable ──

    if (recurring) {
      await step.run('add-to-recurring-list', async () => {
        const recurringListId = parseInt(
          process.env.BREVO_LIST_RECURRING_DONORS!,
          10,
        );
        if (!Number.isNaN(recurringListId)) {
          await brevo.addContactToLists(email, [recurringListId]);
        }
      });
    }

    // ── Step 5: Send thank-you email ──

    await step.run('send-donation-thank-you', async () => {
      // First-time donors get a welcome variant; returning donors get standard
      const templateName = recurring
        ? 'DONATION_THANK_YOU_RECURRING'
        : 'DONATION_THANK_YOU';

      await brevo.sendTransactional({
        templateId: getTemplateId(templateName),
        to: email,
        toName: donorName,
        params: {
          DONOR_NAME: donorName,
          AMOUNT: `$${(amountCents / 100).toFixed(2)}`,
          RECURRING: recurring,
          FIRST_DONATION: isFirstDonation,
          ORDER_NUMBER: orderNumber,
        },
        tags: [
          'donation',
          recurring ? 'donation-recurring' : 'donation-one-time',
          ...(isFirstDonation ? ['first-time-donor'] : []),
        ],
      });
    });

    // ── Step 6: Fire milestone check ──

    await step.run('fire-milestone-check', async () => {
      await inngest.send({
        name: 'donation/milestone.check',
        data: { amountCents, orderNumber },
      });
    });
  },
);
