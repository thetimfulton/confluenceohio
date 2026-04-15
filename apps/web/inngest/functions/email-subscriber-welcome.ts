// ---------------------------------------------------------------------------
// Email Subscriber Welcome — apps/web/inngest/functions/email-subscriber-welcome.ts
// ---------------------------------------------------------------------------
// Triggered by 'subscriber/created' (fired by POST /api/email/subscribe —
// footer, blog, standalone, or event email signups).
//
// Handles:
//  1. Create/update Brevo contact (adds to All Subscribers + Standalone lists)
//  2. Send standalone welcome email with campaign overview + petition CTA
//
// The subscriber nurture drip (Day 2, 5, 10 follow-ups) is handled by
// nurture-subscriber.ts, which also triggers on 'subscriber/created'.
//
// See Artifact 07 §2.9 for the full workflow specification.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';
import type { Contact } from '@confluenceohio/email';

export const emailSubscriberWelcome = inngest.createFunction(
  {
    id: 'email-subscriber-welcome',
    name: 'Email Subscriber Welcome',
    concurrency: { limit: 50 },
    retries: 3,
  },
  { event: 'subscriber/created' },

  async ({ event, step }) => {
    const { email, firstName, source } = event.data;

    const brevo = getEmailAdapter();

    // -- Step 1: Create/update Brevo contact --
    await step.run('create-brevo-contact', async () => {
      const allListId = parseInt(process.env.BREVO_LIST_ALL || '0', 10);
      const standaloneListId = parseInt(
        process.env.BREVO_LIST_STANDALONE || '0',
        10,
      );
      const listIds = [allListId, standaloneListId].filter((id) => id > 0);

      await brevo.createOrUpdateContact({
        email,
        firstName: firstName || 'friend',
        source: source as Contact['source'],
        listIds,
      });
    });

    // -- Step 2: Send standalone welcome email --
    await step.run('send-welcome-email', async () => {
      const supabase = createServiceClient();
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('value')
        .eq('metric', 'signature_count')
        .single();

      await brevo.sendTransactional({
        templateId: getTemplateId('STANDALONE_WELCOME'),
        to: email,
        toName: firstName || undefined,
        params: {
          FIRSTNAME: firstName || 'friend',
          CURRENT_COUNT: (
            (metrics?.value as number) || 0
          ).toLocaleString(),
          SIGN_URL: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org'}/sign`,
        },
        tags: ['standalone', 'standalone-welcome'],
      });
    });

    return { email, welcomeSent: true };
  },
);
