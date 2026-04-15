// ---------------------------------------------------------------------------
// Post-Signature Nurture — apps/web/inngest/functions/nurture-post-signature.ts
// ---------------------------------------------------------------------------
// Triggered by 'petition/email.verified' (fired by GET /sign/verify).
//
// Handles the multi-day drip series that follows email verification:
//  Email 2 (Day 1):  "The Story Behind Confluence" — history + rivers
//  Email 3 (Day 3):  "What Others Are Saying" — community voices highlights
//  Email 4 (Day 7):  "How You Can Help" — volunteer + share + donate CTAs
//  Email 5 (Day 14): Signer → volunteer conversion
//  Email 6 (Day 21): Signer → donor conversion
//
// Each step checks unsubscribe status before sending. Conversion emails
// additionally check whether the signer has already volunteered / donated.
//
// See Artifact 07 §4 for the complete post-signature nurture specification.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

export const nurturePostSignature = inngest.createFunction(
  {
    id: 'nurture-post-signature',
    name: 'Post-Signature Nurture Sequence',
    concurrency: { limit: 50 },
    retries: 3,
  },
  { event: 'petition/email.verified' },

  async ({ event, step }) => {
    const { email, firstName, referralCode, signatureNumber } = event.data;

    const brevo = getEmailAdapter();
    const shareUrl = `${SITE_URL}/sign?ref=${referralCode}`;

    // ── Step 1: Check email opt-in (gate entire drip) ──

    const signerOptedIn = await step.run('check-email-opt-in', async () => {
      const supabase = createServiceClient();
      const { data: sig } = await supabase
        .from('signatures')
        .select('email_opt_in')
        .eq('email', email)
        .maybeSingle();

      return sig?.email_opt_in === true;
    });

    if (!signerOptedIn) {
      return { email, nurtureSkipped: true, reason: 'no-opt-in' };
    }

    // ── Email 2: "The Story Behind Confluence" (Day 1) ──

    await step.sleep('wait-day-1', '1 day');

    const isActive2 = await step.run('check-active-email-2', async () => {
      return isSubscriberActive(email);
    });

    if (!isActive2) {
      return { email, nurtureStoppedAt: 'email-2-story' };
    }

    await step.run('send-email-2-story', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('WELCOME_2_STORY'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          REFERRAL_CODE: referralCode,
          SHARE_URL: shareUrl,
          CASE_URL: `${SITE_URL}/the-case/history`,
        },
        tags: ['nurture', 'post-signature', 'email-2-story'],
      });
    });

    // ── Email 3: "What Others Are Saying" (Day 3) ──

    await step.sleep('wait-day-3', '2 days');

    const isActive3 = await step.run('check-active-email-3', async () => {
      return isSubscriberActive(email);
    });

    if (!isActive3) {
      return { email, nurtureStoppedAt: 'email-3-voices' };
    }

    await step.run('send-email-3-voices', async () => {
      const supabase = createServiceClient();
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('value')
        .eq('metric', 'signature_count')
        .single();

      await brevo.sendTransactional({
        templateId: getTemplateId('WELCOME_3_VOICES'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          CURRENT_COUNT: ((metrics?.value as number) || 0).toLocaleString(),
          VOICES_URL: `${SITE_URL}/voices`,
          SHARE_VOICE_URL: `${SITE_URL}/voices/share`,
          REFERRAL_CODE: referralCode,
          SHARE_URL: shareUrl,
        },
        tags: ['nurture', 'post-signature', 'email-3-voices'],
      });
    });

    // ── Email 4: "How You Can Help" (Day 7) ──

    await step.sleep('wait-day-7', '4 days');

    const isActive4 = await step.run('check-active-email-4', async () => {
      return isSubscriberActive(email);
    });

    if (!isActive4) {
      return { email, nurtureStoppedAt: 'email-4-involve' };
    }

    await step.run('send-email-4-involve', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('WELCOME_4_INVOLVE'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          VOLUNTEER_URL: `${SITE_URL}/volunteer`,
          DONATE_URL: `https://secure.actblue.com/donate/confluenceohio?refcode=${referralCode}`,
          REFERRAL_CODE: referralCode,
          SHARE_URL: shareUrl,
        },
        tags: ['nurture', 'post-signature', 'email-4-involve'],
      });
    });

    // ── Email 5: Signer → Volunteer Conversion (Day 14) ──

    await step.sleep('wait-day-14', '7 days');

    const shouldSendVolunteer = await step.run(
      'check-volunteer-eligibility',
      async () => {
        const active = await isSubscriberActive(email);
        if (!active) return false;

        // Skip if already a volunteer
        const supabase = createServiceClient();
        const { data: vol } = await supabase
          .from('volunteers')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        return !vol;
      },
    );

    if (shouldSendVolunteer) {
      await step.run('send-email-5-volunteer-conversion', async () => {
        const supabase = createServiceClient();
        const { data: metrics } = await supabase
          .from('campaign_metrics')
          .select('value')
          .eq('metric', 'signature_count')
          .single();

        await brevo.sendTransactional({
          templateId: getTemplateId('SIGNER_TO_VOLUNTEER'),
          to: email,
          toName: firstName,
          params: {
            FIRSTNAME: firstName,
            CURRENT_COUNT: ((metrics?.value as number) || 0).toLocaleString(),
            VOLUNTEER_URL: `${SITE_URL}/volunteer`,
          },
          tags: ['nurture', 'post-signature', 'signer-to-volunteer'],
        });
      });
    }

    // ── Email 6: Signer → Donor Conversion (Day 21) ──

    await step.sleep('wait-day-21', '7 days');

    const shouldSendDonor = await step.run(
      'check-donor-eligibility',
      async () => {
        const active = await isSubscriberActive(email);
        if (!active) return false;

        // Skip if already a donor
        const supabase = createServiceClient();
        const { data: donation } = await supabase
          .from('donations')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        return !donation;
      },
    );

    if (shouldSendDonor) {
      await step.run('send-email-6-donor-conversion', async () => {
        await brevo.sendTransactional({
          templateId: getTemplateId('SIGNER_TO_DONOR'),
          to: email,
          toName: firstName,
          params: {
            FIRSTNAME: firstName,
            DONATE_URL: `https://secure.actblue.com/donate/confluenceohio?refcode=${referralCode}`,
            REFERRAL_CODE: referralCode,
          },
          tags: ['nurture', 'post-signature', 'signer-to-donor'],
        });
      });
    }

    return { email, nurtureCompleted: true };
  },
);

/**
 * Check whether a subscriber is still active (not unsubscribed/bounced).
 * Returns true if no subscriber record exists (conservative default).
 */
async function isSubscriberActive(email: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: sub } = await supabase
    .from('email_subscribers')
    .select('status')
    .eq('email', email)
    .maybeSingle();

  if (!sub) return true;
  return sub.status === 'active';
}
