// ---------------------------------------------------------------------------
// Petition Verified — apps/web/inngest/functions/petition-verified.ts
// ---------------------------------------------------------------------------
// Triggered by 'petition/email.verified' (fired by GET /sign/verify).
//
// Handles the immediate verification response only:
//  1. Update Brevo contact: EMAIL_VERIFIED=true, EMAIL_VERIFIED_AT
//  2. Add to Verified Signers list
//  3. Send "Welcome — you're verified!" email with share + volunteer CTAs
//
// The multi-day nurture drip (Emails 2–6) is handled separately by
// nurture-post-signature.ts, which also triggers on petition/email.verified.
//
// See Artifact 07 §2.3 for the complete welcome series specification.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

export const petitionVerified = inngest.createFunction(
  {
    id: 'petition-verified',
    name: 'Petition Email Verified — Nurture Series',
    concurrency: { limit: 50 },
    retries: 3,
  },
  { event: 'petition/email.verified' },

  async ({ event, step }) => {
    const { email, firstName, referralCode, signatureNumber } = event.data;

    const brevo = getEmailAdapter();

    // ── Step 1: Update Brevo contact — mark as email-verified ──

    await step.run('update-brevo-verified', async () => {
      await brevo.updateContactAttribute(email, {
        EMAIL_VERIFIED: true,
        EMAIL_VERIFIED_AT: new Date().toISOString().split('T')[0],
      });

      // Add to Verified Signers list
      const verifiedListId = parseInt(process.env.BREVO_LIST_VERIFIED!, 10);
      if (!Number.isNaN(verifiedListId)) {
        await brevo.addContactToLists(email, [verifiedListId]);
      }
    });

    // ── Step 2: Send "You're verified!" welcome email ──

    await step.run('send-verified-welcome', async () => {
      const shareUrl = `${SITE_URL}/sign?ref=${referralCode}`;
      const twitterText = encodeURIComponent(
        `I just signed the petition to rename Columbus to Confluence, Ohio. Join me: ${shareUrl}`,
      );

      await brevo.sendTransactional({
        templateId: getTemplateId('VERIFIED_WELCOME'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          SIGNATURE_NUMBER: signatureNumber.toLocaleString(),
          SHARE_URL: shareUrl,
          VOLUNTEER_URL: `${SITE_URL}/volunteer`,
          TWITTER_SHARE_URL: `https://twitter.com/intent/tweet?text=${twitterText}`,
          FACEBOOK_SHARE_URL: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        },
        tags: ['verified-welcome'],
      });
    });

    // Nurture drip (Emails 2–6) is handled by nurture-post-signature.ts,
    // which also triggers on petition/email.verified.

    return { email, verified: true, welcomeSent: true };
  },
);
