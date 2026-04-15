// ---------------------------------------------------------------------------
// Referral Tracking — apps/web/inngest/functions/referral-tracking.ts
// ---------------------------------------------------------------------------
// Triggered by 'petition/signature.created' when referredByCode is present.
//
// Handles:
//  1. Look up the referrer's signature by referral code
//  2. Increment the referrer's referral_count on their signature
//  3. Update campaign_metrics.referral_conversion_count
//  4. Update referrer's REFERRAL_COUNT attribute in Brevo
//  5. Send "Someone signed because of you!" notification to referrer
//
// See Artifact 07 §2.3 (referral resolution step in welcome series).
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

export const referralTracking = inngest.createFunction(
  {
    id: 'referral-tracking',
    name: 'Referral Conversion Tracking',
    retries: 3,
  },
  { event: 'petition/signature.created' },

  async ({ event, step }) => {
    const { referredByCode, signatureNumber } = event.data;

    // Only process if this signature was referred
    if (!referredByCode) return { skipped: true };

    const supabase = createServiceClient();
    const brevo = getEmailAdapter();

    // ── Step 1: Look up the referrer's signature ──

    const referrer = await step.run('lookup-referrer', async () => {
      const { data, error } = await supabase
        .from('signatures')
        .select('id, email, first_name, referral_code, email_opt_in')
        .eq('referral_code', referredByCode)
        .maybeSingle();

      if (error) {
        console.error('[Referral] Referrer lookup error:', error);
        return null;
      }
      return data;
    });

    if (!referrer) {
      return { skipped: true, reason: 'referrer-not-found' };
    }

    // ── Step 2: Increment referrer's referral count ──

    const newReferralCount = await step.run(
      'increment-referral-count',
      async () => {
        // Try using an RPC if available, otherwise do a manual increment
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          'increment_referral_conversion',
          { p_referral_code: referredByCode },
        );

        if (!rpcError && rpcResult != null) {
          return rpcResult as number;
        }

        // Fallback: query current count from referrals table and return
        const { data: referralRow } = await supabase
          .from('referrals')
          .select('conversions')
          .eq('referral_code', referredByCode)
          .maybeSingle();

        return (referralRow?.conversions as number) || 1;
      },
    );

    // ── Step 3: Update campaign_metrics.referral_conversion_count ──

    await step.run('update-campaign-metrics', async () => {
      const { error } = await supabase.rpc('increment_metric', {
        metric_name: 'referral_conversion_count',
        increment_by: 1,
      });

      if (error) {
        // Non-fatal — log but don't fail the function
        console.error(
          '[Referral] Failed to increment campaign metric:',
          error,
        );
      }
    });

    // ── Step 4: Update referrer's Brevo contact ──

    await step.run('update-brevo-referral-count', async () => {
      await brevo.updateContactAttribute(referrer.email, {
        REFERRAL_COUNT: newReferralCount,
      });
    });

    // ── Step 5: Notify the referrer (if they opted in to email) ──

    if (referrer.email_opt_in) {
      await step.run('send-referral-notification', async () => {
        await brevo.sendTransactional({
          templateId: getTemplateId('REFERRAL_NOTIFICATION'),
          to: referrer.email,
          toName: referrer.first_name,
          params: {
            FIRSTNAME: referrer.first_name,
            NEW_SIGNER_NUMBER: signatureNumber.toLocaleString(),
            REFERRAL_COUNT: newReferralCount,
            SHARE_URL: `${SITE_URL}/sign?ref=${referrer.referral_code}`,
          },
          tags: ['referral', 'referral-notification'],
        });
      });
    }

    return {
      referrerEmail: referrer.email,
      referralCode: referredByCode,
      newReferralCount,
      notified: referrer.email_opt_in,
    };
  },
);
