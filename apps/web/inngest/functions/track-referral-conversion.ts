// ---------------------------------------------------------------------------
// Referral Conversion Attribution — apps/web/inngest/functions/track-referral-conversion.ts
// ---------------------------------------------------------------------------
// Triggered by 'petition/signature.created' when referredByCode is present.
//
// Handles first-touch attribution:
//   1. Look up the referral click record for this code
//   2. Link the click to the conversion (set converted_signature_id)
//   3. Compute first-touch attribution (earliest click for that ref code)
//   4. Update referral_clicks with attribution data
//
// The existing referral-tracking.ts handles the referrer notification side.
// This function handles the analytics/attribution side.
//
// See Artifact 11 §1.3 and §4-5.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { captureServerEvent } from '@confluenceohio/core/analytics/posthog-server';

export const trackReferralConversion = inngest.createFunction(
  {
    id: 'track-referral-conversion',
    name: 'Track Referral Conversion Attribution',
    retries: 3,
  },
  { event: 'petition/signature.created' },

  async ({ event, step }) => {
    const { referredByCode, signatureId } = event.data;

    // Only process referred signatures
    if (!referredByCode) return { skipped: true };

    const supabase = createServiceClient();

    // ── Step 1: Find the first click for this referral code ──
    // First-touch attribution: the earliest click record for this code
    const firstClick = await step.run('find-first-click', async () => {
      const { data, error } = await supabase
        .from('referral_clicks')
        .select('id, referral_code, platform, landing_page, created_at')
        .eq('referral_code', referredByCode)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[Referral Attribution] Click lookup error:', error);
        return null;
      }
      return data;
    });

    // ── Step 2: Link click to conversion ──
    if (firstClick) {
      await step.run('link-click-to-conversion', async () => {
        const { error } = await supabase
          .from('referral_clicks')
          .update({
            converted_signature_id: signatureId,
            converted_at: new Date().toISOString(),
          })
          .eq('id', firstClick.id);

        if (error) {
          // Non-fatal — the conversion is still recorded on the signature
          console.error('[Referral Attribution] Failed to link click:', error);
        }
      });
    }

    // ── Step 3: Increment the referrals table conversion counter ──
    await step.run('increment-referrals-conversion', async () => {
      // Try the RPC first (atomic increment)
      const { error: rpcError } = await supabase.rpc(
        'increment_referral_conversion',
        { p_referral_code: referredByCode },
      );

      if (rpcError) {
        // If RPC doesn't exist, try direct update on the referrals table
        if (rpcError.code === '42883') {
          // Look for existing referral row
          const { data: referralRow } = await supabase
            .from('referrals')
            .select('id, conversions')
            .eq('referral_code', referredByCode)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (referralRow) {
            await supabase
              .from('referrals')
              .update({
                conversions: (referralRow.conversions ?? 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', referralRow.id);
          }
        } else {
          console.error('[Referral Attribution] Increment RPC error:', rpcError);
        }
      }
    });

    // ── Step 4: Increment global referral conversion metric ──
    await step.run('increment-conversion-metric', async () => {
      const { error } = await supabase.rpc('increment_metric', {
        metric_name: 'referral_conversion_count',
        increment_by: 1,
      });

      if (error) {
        console.error('[Referral Attribution] Metric increment failed:', error);
      }
    });

    // ── Step 5: PostHog referral_conversion event (§3.2.7) ──
    await step.run('posthog-referral-conversion', async () => {
      captureServerEvent(signatureId, 'referral_conversion', {
        ref_code: referredByCode,
        referrer_signature_id: firstClick?.id ?? null,
        platform: firstClick?.platform ?? null,
      });
    });

    return {
      signatureId,
      referredByCode,
      firstClickId: firstClick?.id ?? null,
      firstClickPlatform: firstClick?.platform ?? null,
      attributed: !!firstClick,
    };
  },
);
