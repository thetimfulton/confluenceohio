// ---------------------------------------------------------------------------
// Subscriber Nurture — apps/web/inngest/functions/nurture-subscriber.ts
// ---------------------------------------------------------------------------
// Triggered by 'subscriber/created' (fired by POST /api/email/subscribe —
// footer, blog, standalone, or event email signup forms).
//
// For non-signer email subscribers who haven't signed the petition yet:
//  Day 0:  Welcome email (handled by email-subscriber-welcome.ts)
//  Day 2:  "The Case in 5 Minutes" — link to /the-case
//  Day 5:  Petition CTA — "Ready to sign?"
//  Day 10: Community voices + share CTA
//
// At each step, checks whether the subscriber has since signed the petition.
// If they have, the sequence exits early — they'll receive the post-signature
// nurture instead.
//
// See Artifact 07 §4 and Artifact 02 §4.4 for the full specification.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

export const nurtureSubscriber = inngest.createFunction(
  {
    id: 'nurture-subscriber',
    name: 'Non-Signer Subscriber Nurture',
    concurrency: { limit: 50 },
    retries: 3,
  },
  { event: 'subscriber/created' },

  async ({ event, step }) => {
    const { email, firstName, source } = event.data;

    const brevo = getEmailAdapter();

    // Day 0 welcome email is handled by email-subscriber-welcome.ts
    // (which also creates the Brevo contact). This function handles
    // the follow-up nurture drip starting from Day 2.

    // ── Day 2: "The Case in 5 Minutes" ──

    await step.sleep('wait-day-2', '2 days');

    const check2 = await step.run('check-status-day-2', async () => {
      const active = await isSubscriberActive(email);
      if (!active) return { active: false, signed: false };
      const signed = await hasSigned(email);
      return { active: true, signed };
    });

    if (!check2.active) {
      return { email, nurtureStoppedAt: 'day-2', reason: 'unsubscribed' };
    }
    if (check2.signed) {
      return { email, nurtureStoppedAt: 'day-2', reason: 'signed-petition' };
    }

    await step.run('send-case-overview', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('SUBSCRIBER_CASE'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          CASE_URL: `${SITE_URL}/the-case`,
          HISTORY_URL: `${SITE_URL}/the-case/history`,
          RIVERS_URL: `${SITE_URL}/the-case/rivers`,
        },
        tags: ['nurture', 'subscriber', 'case-overview'],
      });
    });

    // ── Day 5: Petition CTA — "Ready to sign?" ──

    await step.sleep('wait-day-5', '3 days');

    const check5 = await step.run('check-status-day-5', async () => {
      const active = await isSubscriberActive(email);
      if (!active) return { active: false, signed: false };
      const signed = await hasSigned(email);
      return { active: true, signed };
    });

    if (!check5.active) {
      return { email, nurtureStoppedAt: 'day-5', reason: 'unsubscribed' };
    }
    if (check5.signed) {
      return { email, nurtureStoppedAt: 'day-5', reason: 'signed-petition' };
    }

    await step.run('send-petition-cta', async () => {
      const supabase = createServiceClient();
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('value')
        .eq('metric', 'signature_count')
        .single();

      await brevo.sendTransactional({
        templateId: getTemplateId('SUBSCRIBER_PETITION_CTA'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          CURRENT_COUNT: ((metrics?.value as number) || 0).toLocaleString(),
          SIGN_URL: `${SITE_URL}/sign`,
        },
        tags: ['nurture', 'subscriber', 'petition-cta'],
      });
    });

    // ── Day 10: Community voices + share CTA ──

    await step.sleep('wait-day-10', '5 days');

    const check10 = await step.run('check-status-day-10', async () => {
      const active = await isSubscriberActive(email);
      if (!active) return { active: false, signed: false };
      const signed = await hasSigned(email);
      return { active: true, signed };
    });

    if (!check10.active) {
      return { email, nurtureStoppedAt: 'day-10', reason: 'unsubscribed' };
    }
    if (check10.signed) {
      return { email, nurtureStoppedAt: 'day-10', reason: 'signed-petition' };
    }

    await step.run('send-voices-share', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('SUBSCRIBER_VOICES_SHARE'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          VOICES_URL: `${SITE_URL}/voices`,
          SHARE_VOICE_URL: `${SITE_URL}/voices/share`,
          SIGN_URL: `${SITE_URL}/sign`,
        },
        tags: ['nurture', 'subscriber', 'voices-share'],
      });
    });

    return { email, nurtureCompleted: true };
  },
);

/**
 * Check whether a subscriber is still active (not unsubscribed/bounced).
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

/**
 * Check whether the subscriber has since signed the petition.
 * If they have, we stop the subscriber nurture — they'll receive
 * the post-signature nurture sequence instead.
 */
async function hasSigned(email: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: sig } = await supabase
    .from('signatures')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  return !!sig;
}
