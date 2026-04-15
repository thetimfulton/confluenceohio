// ---------------------------------------------------------------------------
// Petition Welcome — apps/web/inngest/functions/petition-welcome.ts
// ---------------------------------------------------------------------------
// Triggered by 'petition/signature.created' (fired by POST /api/petition/sign).
//
// Handles:
//  1. Send email verification link via Brevo
//  2. Create/update Brevo contact with signer attributes
//  3. Add to Petition Signers list (+ Newsletter list if opted in)
//  4. Wait 24h, send verification reminder if not yet verified
//  5. Wait 48h more, send final verification reminder
//
// See Artifact 07 §2.3 for the full workflow definition.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';

export const petitionWelcome = inngest.createFunction(
  {
    id: 'petition-welcome',
    name: 'Petition Signer Welcome',
    concurrency: { limit: 50 },
    retries: 3,
  },
  { event: 'petition/signature.created' },

  async ({ event, step }) => {
    const {
      email,
      firstName,
      signatureNumber,
      referralCode,
      emailOptIn,
      verificationUrl,
      verificationStatus,
    } = event.data;

    const brevo = getEmailAdapter();

    // ── Step 1: Send email verification (always — it's a service message) ──

    await step.run('send-verification-email', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('EMAIL_VERIFICATION'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          SIGNATURE_NUMBER: signatureNumber.toLocaleString(),
          VERIFICATION_URL: verificationUrl,
        },
        tags: ['transactional', 'email-verification'],
      });
    });

    // ── Step 2: Create/update Brevo contact with signer attributes ──

    await step.run('create-brevo-contact', async () => {
      const allListId = parseInt(process.env.BREVO_LIST_ALL!, 10);
      const signersListId = parseInt(process.env.BREVO_LIST_SIGNERS!, 10);

      const listIds = [allListId, signersListId].filter(
        (id) => !Number.isNaN(id),
      );

      await brevo.createOrUpdateContact({
        email,
        firstName,
        source: 'petition',
        signatureNumber,
        referralCode,
        verificationStatus: verificationStatus as
          | 'verified'
          | 'flagged'
          | 'rejected',
        signedAt: new Date().toISOString(),
        listIds,
      });
    });

    // ── Step 3: Send welcome confirmation email (Email 1 of welcome series) ──

    if (emailOptIn) {
      await step.run('send-welcome-confirmation', async () => {
        const supabase = createServiceClient();

        const { data: metrics } = await supabase
          .from('campaign_metrics')
          .select('value')
          .eq('metric', 'signature_count')
          .single();

        const currentCount = metrics?.value || signatureNumber;
        const nextMilestone = getNextMilestone(currentCount);

        await brevo.sendTransactional({
          templateId: getTemplateId('WELCOME_1_CONFIRMATION'),
          to: email,
          toName: firstName,
          params: {
            FIRSTNAME: firstName,
            SIGNATURE_NUMBER: signatureNumber.toLocaleString(),
            CURRENT_COUNT: currentCount.toLocaleString(),
            NEXT_MILESTONE: nextMilestone.toLocaleString(),
            REFERRAL_CODE: referralCode,
            SHARE_URL: `https://confluenceohio.org/sign?ref=${referralCode}`,
          },
          tags: ['welcome-series', 'welcome-1'],
        });
      });
    }

    // ── Step 4: Wait 24 hours, check if email verified ──

    await step.sleep('wait-24h-for-verification', '24 hours');

    const isVerifiedAfter24h = await step.run(
      'check-verified-24h',
      async () => {
        const supabase = createServiceClient();
        const { data: sig } = await supabase
          .from('signatures')
          .select('email_verified')
          .eq('email', email)
          .maybeSingle();

        return sig?.email_verified === true;
      },
    );

    // ── Step 5: If not verified, send first reminder ──

    if (!isVerifiedAfter24h) {
      await step.run('send-verification-reminder-1', async () => {
        await brevo.sendTransactional({
          templateId: getTemplateId('VERIFICATION_REMINDER'),
          to: email,
          toName: firstName,
          params: {
            FIRSTNAME: firstName,
            SIGNATURE_NUMBER: signatureNumber.toLocaleString(),
            VERIFICATION_URL: verificationUrl,
            REMINDER_NUMBER: 1,
          },
          tags: ['transactional', 'verification-reminder', 'reminder-1'],
        });
      });

      // ── Step 6: Wait 48 more hours ──

      await step.sleep('wait-48h-for-verification', '48 hours');

      const isVerifiedAfter72h = await step.run(
        'check-verified-72h',
        async () => {
          const supabase = createServiceClient();
          const { data: sig } = await supabase
            .from('signatures')
            .select('email_verified')
            .eq('email', email)
            .maybeSingle();

          return sig?.email_verified === true;
        },
      );

      // ── Step 7: If still not verified, send final reminder ──

      if (!isVerifiedAfter72h) {
        await step.run('send-verification-reminder-final', async () => {
          await brevo.sendTransactional({
            templateId: getTemplateId('VERIFICATION_REMINDER'),
            to: email,
            toName: firstName,
            params: {
              FIRSTNAME: firstName,
              SIGNATURE_NUMBER: signatureNumber.toLocaleString(),
              VERIFICATION_URL: verificationUrl,
              REMINDER_NUMBER: 2,
              IS_FINAL: true,
            },
            tags: ['transactional', 'verification-reminder', 'reminder-final'],
          });
        });
      }
    }

    return {
      signatureId: event.data.signatureId,
      email,
      verificationEmailSent: true,
      contactCreated: true,
    };
  },
);

/** Milestone thresholds (matches Artifact 06 §1.5). */
function getNextMilestone(current: number): number {
  const milestones = [1000, 2500, 5000, 10000, 15000, 22000];
  return milestones.find((m) => m > current) || 22000;
}
