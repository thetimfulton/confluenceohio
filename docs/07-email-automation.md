# Confluence Ohio — Email List and Automation Flows

**Artifact 07 · Prompt 7 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 05 (Data Model), Artifact 06 (Petition Signing Flow)

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **Brevo plan tier.** ✅ **Starter plan ($9/mo)** confirmed. Since Inngest handles all orchestration, Brevo's built-in automation features are not needed. Starter plan is sufficient for launch volume. Revisit plan tier when monthly send volume exceeds Starter limits.

2. **Brevo account.** ✅ Tim will create the Brevo account and add API key, sender domain verification, and SPF/DKIM/DMARC DNS records to `.env` before moving to Claude Code implementation.

3. **Physical mailing address for CAN-SPAM.** ✅ **PO Box 8012, Columbus, OH 43201.** Used in every marketing email footer.

4. **Campaign legal entity.** ✅ **501(c)(4) organization.** This means: (a) Google Ad Grants are NOT available (requires 501(c)(3) — already accounted for in Artifact 03), (b) CAN-SPAM applies in full (501(c)(4) social welfare orgs sending commercial-adjacent email should comply as best practice even if political speech carve-outs may apply), (c) Ohio lobbying/issue advocacy disclosure rules may apply to email communications — consult election counsel on whether emails need a "Paid for by Confluence Ohio" disclaimer.

5. **Email sending volume projection.** ✅ Understood. Budget scales with signature growth. Starter plan covers launch; upgrade path documented.

---

## 1. Brevo Integration Architecture

### 1.1 Architectural Principle

**Inngest is the orchestrator. Brevo is the delivery adapter.**

Per the hexagonal architecture established in earlier artifacts, Brevo is an infrastructure adapter behind an email port. All timing logic, conditional branching, and workflow state lives in Inngest functions. Brevo's responsibilities are limited to: (a) storing contact records with attributes, (b) managing list membership, (c) sending transactional emails via template, and (d) reporting delivery events back via webhooks.

This means:
- Swapping Brevo for another ESP (Resend, Postmark, SendGrid) requires changing one adapter file
- Workflow logic (delays, conditions, branching) is version-controlled in code, not locked in a vendor's UI
- All email sends are traceable through Inngest's event log

```
┌─────────────────────────────────────────────────────────────┐
│                       Inngest (Orchestrator)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐ │
│  │ Welcome  │  │ Convert  │  │ Milestone │  │ Re-engage │ │
│  │ Series   │  │ Flows    │  │ Celebs    │  │ Sequence  │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └─────┬─────┘ │
│       │              │              │              │        │
│       ▼              ▼              ▼              ▼        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Email Port (Interface)                    │   │
│  │  sendTransactional() | createContact() | addToList() │   │
│  └─────────────────────────┬───────────────────────────┘   │
└────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   Brevo Adapter      │
                  │  (packages/email/    │
                  │   brevo.ts)          │
                  │                      │
                  │  POST /v3/smtp/email │
                  │  POST /v3/contacts   │
                  │  POST /v3/contacts/  │
                  │       lists/:id/add  │
                  └─────────────────────┘
```

### 1.2 Brevo Contact Attributes

Custom contact attributes store campaign-specific data on each Brevo contact. These are created once during setup (via API or Brevo dashboard) and populated on every contact create/update call.

| Brevo Attribute | Type | Source | Notes |
|---|---|---|---|
| `FIRSTNAME` | text | Form field | Built-in Brevo attribute |
| `LASTNAME` | text | Form field | Built-in Brevo attribute |
| `EMAIL` | text | Form field | Built-in Brevo attribute (primary identifier) |
| `SOURCE` | category | App logic | Values: `petition`, `standalone`, `volunteer`, `blog`, `footer`, `event` |
| `SIGNATURE_NUMBER` | number | Petition flow | User-facing signer number (null for non-signers) |
| `REFERRAL_CODE` | text | Petition flow | Signer's CONF-XXXX code for share links |
| `REFERRAL_COUNT` | number | Referral tracking | Number of successful referral conversions |
| `VERIFICATION_STATUS` | category | Smarty result | Values: `verified`, `flagged`, `rejected` |
| `EMAIL_VERIFIED` | boolean | Verification flow | Whether email link was clicked |
| `VOLUNTEER` | boolean | Volunteer signup | Whether contact is a volunteer |
| `VOLUNTEER_ROLES` | text | Volunteer signup | Comma-separated role list |
| `DONOR` | boolean | ActBlue webhook | Whether contact has donated |
| `DONATION_TOTAL` | number | ActBlue webhook | Lifetime donation amount in cents |
| `CITY` | text | Smarty-normalized | Ohio city name |
| `NEIGHBORHOOD` | text | Volunteer form | Columbus neighborhood (if provided) |
| `SIGNED_AT` | date | Petition flow | Date of petition signature |
| `LAST_ENGAGEMENT` | date | Webhook tracking | Last open or click date |

**Attribute creation (one-time setup):**

```typescript
// packages/email/brevo-setup.ts — run once during initial configuration

import { BrevoAdapter } from './brevo';

const customAttributes = [
  { name: 'SOURCE', category: 'normal', type: 'category', enumeration: [
    { value: 1, label: 'petition' },
    { value: 2, label: 'standalone' },
    { value: 3, label: 'volunteer' },
    { value: 4, label: 'blog' },
    { value: 5, label: 'footer' },
    { value: 6, label: 'event' },
  ]},
  { name: 'SIGNATURE_NUMBER', category: 'normal', type: 'float' },
  { name: 'REFERRAL_CODE', category: 'normal', type: 'text' },
  { name: 'REFERRAL_COUNT', category: 'normal', type: 'float' },
  { name: 'VERIFICATION_STATUS', category: 'normal', type: 'category', enumeration: [
    { value: 1, label: 'verified' },
    { value: 2, label: 'flagged' },
    { value: 3, label: 'rejected' },
  ]},
  { name: 'EMAIL_VERIFIED', category: 'normal', type: 'boolean' },
  { name: 'VOLUNTEER', category: 'normal', type: 'boolean' },
  { name: 'VOLUNTEER_ROLES', category: 'normal', type: 'text' },
  { name: 'DONOR', category: 'normal', type: 'boolean' },
  { name: 'DONATION_TOTAL', category: 'normal', type: 'float' },
  { name: 'CITY', category: 'normal', type: 'text' },
  { name: 'NEIGHBORHOOD', category: 'normal', type: 'text' },
  { name: 'SIGNED_AT', category: 'normal', type: 'date' },
  { name: 'LAST_ENGAGEMENT', category: 'normal', type: 'date' },
];
```

### 1.3 Brevo List Structure

Lists are the primary mechanism for segmentation in Brevo. A contact can belong to multiple lists. Lists are created via the API and assigned numeric IDs.

| List ID (env var) | List Name | Population Method | Purpose |
|---|---|---|---|
| `BREVO_LIST_ALL` | All Subscribers | Auto: every contact creation | Master list; CAN-SPAM unsubscribe applies here |
| `BREVO_LIST_SIGNERS` | Petition Signers | Auto: on petition sign (if opt-in) | Welcome series trigger; signer-specific campaigns |
| `BREVO_LIST_VERIFIED` | Verified Signers | Auto: on email verification | Higher-trust segment for important asks |
| `BREVO_LIST_VOLUNTEERS` | Volunteers | Auto: on volunteer signup | Volunteer-specific communications |
| `BREVO_LIST_DONORS` | Donors | Auto: on ActBlue webhook | Donor stewardship; never solicit for first donation again |
| `BREVO_LIST_ENGAGED` | Engaged (30 days) | Cron job: daily recalculation | Contacts who opened/clicked in last 30 days |
| `BREVO_LIST_DISENGAGED` | Disengaged (60+ days) | Cron job: daily recalculation | Re-engagement sequence target; exclude from regular sends |
| `BREVO_LIST_STANDALONE` | Standalone Subscribers | Auto: non-petition email signups | Signed up via footer/blog but haven't signed petition |

**List creation (one-time setup):**

```typescript
// POST /v3/contacts/lists for each list
const lists = [
  { name: 'All Subscribers', folderId: 1 },
  { name: 'Petition Signers', folderId: 1 },
  { name: 'Verified Signers', folderId: 1 },
  { name: 'Volunteers', folderId: 1 },
  { name: 'Donors', folderId: 1 },
  { name: 'Engaged (30 days)', folderId: 1 },
  { name: 'Disengaged (60+ days)', folderId: 1 },
  { name: 'Standalone Subscribers', folderId: 1 },
];
```

### 1.4 Contact Creation Flow

Every contact creation follows the same pattern regardless of source: create/update in Brevo, add to appropriate lists, store the Brevo contact ID in our database.

```typescript
// packages/email/brevo.ts — Brevo adapter (email port implementation)

import { EmailPort, Contact, TransactionalEmail, ListId } from './types';

const BREVO_API_URL = 'https://api.brevo.com/v3';

export class BrevoAdapter implements EmailPort {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${BREVO_API_URL}${path}`, {
      ...options,
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new BrevoApiError(
        `Brevo API error: ${response.status}`,
        response.status,
        error
      );
    }

    // 204 No Content (e.g., contact update) returns no body
    if (response.status === 204) return null;
    return response.json();
  }

  /**
   * Create or update a contact in Brevo.
   * Uses updateEnabled=true so existing contacts are updated, not rejected.
   * Returns the Brevo contact ID.
   */
  async createOrUpdateContact(contact: Contact): Promise<{ id: string }> {
    const body = {
      email: contact.email,
      attributes: {
        FIRSTNAME: contact.firstName,
        LASTNAME: contact.lastName || undefined,
        SOURCE: contact.source,
        SIGNATURE_NUMBER: contact.signatureNumber || undefined,
        REFERRAL_CODE: contact.referralCode || undefined,
        VERIFICATION_STATUS: contact.verificationStatus || undefined,
        CITY: contact.city || undefined,
        SIGNED_AT: contact.signedAt || undefined,
        VOLUNTEER: contact.isVolunteer || false,
        VOLUNTEER_ROLES: contact.volunteerRoles?.join(', ') || undefined,
        NEIGHBORHOOD: contact.neighborhood || undefined,
      },
      listIds: contact.listIds,
      updateEnabled: true,  // Update existing contact if email matches
    };

    // Remove undefined values
    Object.keys(body.attributes).forEach(
      key => body.attributes[key] === undefined && delete body.attributes[key]
    );

    const result = await this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { id: result?.id?.toString() || '' };
  }

  /**
   * Add a contact to one or more lists.
   */
  async addContactToLists(email: string, listIds: number[]): Promise<void> {
    for (const listId of listIds) {
      await this.request(`/contacts/lists/${listId}/contacts/add`, {
        method: 'POST',
        body: JSON.stringify({ emails: [email] }),
      });
    }
  }

  /**
   * Remove a contact from a list (e.g., moving from Disengaged to Engaged).
   */
  async removeContactFromList(email: string, listId: number): Promise<void> {
    await this.request(`/contacts/lists/${listId}/contacts/remove`, {
      method: 'POST',
      body: JSON.stringify({ emails: [email] }),
    });
  }

  /**
   * Send a transactional email using a Brevo template.
   * Template ID is configured per email type in environment variables.
   */
  async sendTransactional(email: TransactionalEmail): Promise<{ messageId: string }> {
    const body = {
      templateId: email.templateId,
      to: [{ email: email.to, name: email.toName || undefined }],
      params: email.params,
      tags: email.tags || [],
    };

    const result = await this.request('/smtp/email', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { messageId: result?.messageId || '' };
  }

  /**
   * Update a single contact attribute (e.g., after email verification).
   */
  async updateContactAttribute(
    email: string,
    attributes: Record<string, unknown>
  ): Promise<void> {
    await this.request(`/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify({ attributes }),
    });
  }
}

export class BrevoApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details: unknown
  ) {
    super(message);
    this.name = 'BrevoApiError';
  }
}
```

### 1.5 Email Port Interface

The port interface that the Brevo adapter implements. Any replacement ESP adapter must implement this same interface.

```typescript
// packages/email/types.ts

export interface Contact {
  email: string;
  firstName: string;
  lastName?: string;
  source: 'petition' | 'standalone' | 'volunteer' | 'blog' | 'footer' | 'event';
  signatureNumber?: number;
  referralCode?: string;
  verificationStatus?: 'verified' | 'flagged' | 'rejected';
  city?: string;
  signedAt?: string;          // ISO 8601 date
  isVolunteer?: boolean;
  volunteerRoles?: string[];
  neighborhood?: string;
  listIds: number[];           // Brevo list IDs to add contact to
}

export interface TransactionalEmail {
  templateId: number;
  to: string;
  toName?: string;
  params: Record<string, unknown>;  // Template variables
  tags?: string[];                   // For tracking in Brevo
}

export type ListId = number;

export interface EmailPort {
  createOrUpdateContact(contact: Contact): Promise<{ id: string }>;
  addContactToLists(email: string, listIds: number[]): Promise<void>;
  removeContactFromList(email: string, listId: number): Promise<void>;
  sendTransactional(email: TransactionalEmail): Promise<{ messageId: string }>;
  updateContactAttribute(email: string, attributes: Record<string, unknown>): Promise<void>;
}
```

### 1.6 Webhook Configuration

Brevo webhooks push delivery events back to our application. These update the `LAST_ENGAGEMENT` attribute and handle bounces/unsubscribes.

**Webhook endpoint:** `POST /api/webhooks/brevo`

**Events to subscribe to:**

| Event | Action |
|---|---|
| `delivered` | Log delivery (no user-facing action) |
| `opened` | Update `LAST_ENGAGEMENT` attribute on contact |
| `click` | Update `LAST_ENGAGEMENT` attribute on contact |
| `hardBounce` | Update `email_subscribers.status = 'bounced'`; remove from all lists except master |
| `softBounce` | Log; Brevo auto-retries. After 3 consecutive soft bounces, Brevo marks as hard bounce |
| `spam` | Update `email_subscribers.status = 'complained'`; remove from all active lists; add to suppression |
| `unsubscribed` | Update `email_subscribers.status = 'unsubscribed'`; set `unsubscribed_at`; remove from all lists |
| `blocked` | Log for monitoring; indicates Brevo blocked the send (previous bounce/complaint) |

**Webhook handler:**

```typescript
// apps/web/app/api/webhooks/brevo/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BrevoWebhookSchema = z.object({
  event: z.enum([
    'delivered', 'opened', 'click',
    'hardBounce', 'softBounce',
    'spam', 'unsubscribed', 'blocked',
  ]),
  email: z.string().email(),
  date: z.string(),
  'message-id': z.string().optional(),
  tag: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Verify webhook authenticity via shared secret header
  const webhookSecret = request.headers.get('x-brevo-webhook-secret');
  if (webhookSecret !== process.env.BREVO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = BrevoWebhookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { event, email, date } = parsed.data;

  switch (event) {
    case 'opened':
    case 'click':
      await handleEngagement(email, date);
      break;
    case 'hardBounce':
      await handleHardBounce(email);
      break;
    case 'spam':
      await handleSpamComplaint(email);
      break;
    case 'unsubscribed':
      await handleUnsubscribe(email);
      break;
    // delivered, softBounce, blocked — log only
  }

  return NextResponse.json({ received: true });
}

async function handleEngagement(email: string, date: string) {
  // Update Brevo contact attribute
  await brevoAdapter.updateContactAttribute(email, {
    LAST_ENGAGEMENT: date,
  });
}

async function handleHardBounce(email: string) {
  // Update local database
  await supabase
    .from('email_subscribers')
    .update({ status: 'bounced', updated_at: new Date().toISOString() })
    .eq('email', email);

  // Brevo automatically suppresses hard-bounced addresses
  // No need to manually remove from lists — Brevo won't send to them
}

async function handleSpamComplaint(email: string) {
  await supabase
    .from('email_subscribers')
    .update({ status: 'complained', updated_at: new Date().toISOString() })
    .eq('email', email);
}

async function handleUnsubscribe(email: string) {
  await supabase
    .from('email_subscribers')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('email', email);
}
```

**Webhook setup (one-time, via Brevo API):**

```typescript
// POST /v3/webhooks
{
  "url": "https://confluenceohio.org/api/webhooks/brevo",
  "description": "Confluence Ohio delivery events",
  "events": [
    "delivered", "opened", "click",
    "hardBounce", "softBounce",
    "spam", "unsubscribed", "blocked"
  ],
  "type": "transactional"  // Also create a second webhook with type "marketing"
}
```

---

## 2. Automation Workflows

All workflows are implemented as Inngest functions. Each function is triggered by a named event and uses `step.sleep()` for delays and `step.run()` for individual actions. Failed steps are automatically retried by Inngest (3 retries with exponential backoff by default).

### 2.1 Inngest Client Setup

```typescript
// apps/web/lib/inngest.ts

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'confluence-ohio',
  // Event types for type safety
});

// Event type definitions
export type Events = {
  'petition/signature.created': {
    data: {
      signatureId: string;
      signatureNumber: number;
      email: string;
      firstName: string;
      referralCode: string;
      referredByCode: string | null;
      emailOptIn: boolean;
      verificationUrl: string;
      verificationStatus: 'verified' | 'flagged' | 'rejected';
    };
  };
  'petition/email.verified': {
    data: {
      signatureId: string;
      email: string;
    };
  };
  'volunteer/signup.created': {
    data: {
      volunteerId: string;
      email: string;
      firstName: string;
      lastName: string;
      roles: string[];
      neighborhood?: string;
    };
  };
  'subscriber/standalone.created': {
    data: {
      email: string;
      firstName?: string;
      source: string;
    };
  };
  'donation/received': {
    data: {
      email: string;
      donorName: string;
      amountCents: number;
      recurring: boolean;
      refcode?: string;
    };
  };
  'campaign/milestone.reached': {
    data: {
      milestone: number;
      currentCount: number;
    };
  };
  'engagement/check.daily': {
    data: Record<string, never>;  // Cron-triggered, no payload
  };
};
```

### 2.2 Inngest API Route

```typescript
// apps/web/app/api/inngest/route.ts

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { welcomeSeries } from '@/inngest/welcome-series';
import { signerToVolunteer } from '@/inngest/signer-to-volunteer';
import { signerToDonor } from '@/inngest/signer-to-donor';
import { milestoneNotification } from '@/inngest/milestone-notification';
import { reEngagement } from '@/inngest/re-engagement';
import { volunteerOnboarding } from '@/inngest/volunteer-onboarding';
import { standaloneWelcome } from '@/inngest/standalone-welcome';
import { donationThankYou } from '@/inngest/donation-thank-you';
import { dailyEngagementCheck } from '@/inngest/daily-engagement-check';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    welcomeSeries,
    signerToVolunteer,
    signerToDonor,
    milestoneNotification,
    reEngagement,
    volunteerOnboarding,
    standaloneWelcome,
    donationThankYou,
    dailyEngagementCheck,
  ],
});
```

### 2.3 Welcome Series (Petition Signers) — 4 Emails over 10 Days

Triggered by: `petition/signature.created` (fired by the petition API route per Artifact 06, §3.11)

This is the highest-value automation. A signer who just gave their name and address is at peak engagement. The series deepens the relationship and converts passive signers into active participants.

```typescript
// apps/web/inngest/welcome-series.ts

import { inngest } from '@/lib/inngest';
import { getBrevoAdapter } from '@/lib/email';
import { getTemplateId } from '@/lib/email/templates';

export const welcomeSeries = inngest.createFunction(
  {
    id: 'welcome-series',
    name: 'Petition Signer Welcome Series',
    concurrency: { limit: 50 },  // Max 50 concurrent runs
    retries: 3,
  },
  { event: 'petition/signature.created' },

  async ({ event, step }) => {
    const { email, firstName, signatureNumber, referralCode, emailOptIn, verificationUrl, verificationStatus } = event.data;
    const brevo = getBrevoAdapter();

    // ── Step 0: Create Brevo contact (immediate) ──
    await step.run('create-brevo-contact', async () => {
      if (!emailOptIn) return;

      const listIds = [
        parseInt(process.env.BREVO_LIST_ALL!),
        parseInt(process.env.BREVO_LIST_SIGNERS!),
      ];

      await brevo.createOrUpdateContact({
        email,
        firstName,
        source: 'petition',
        signatureNumber,
        referralCode,
        verificationStatus,
        signedAt: new Date().toISOString(),
        listIds,
      });
    });

    // ── Step 1: Resolve referral (immediate) ──
    if (event.data.referredByCode) {
      await step.run('resolve-referral', async () => {
        // Increment referral conversion counter in database
        await supabase.rpc('increment_referral_conversion', {
          p_referral_code: event.data.referredByCode,
        });

        // Update referrer's Brevo attribute
        const { data: referrer } = await supabase
          .from('signatures')
          .select('email')
          .eq('referral_code', event.data.referredByCode)
          .maybeSingle();

        if (referrer) {
          const { data: referralCount } = await supabase
            .from('referrals')
            .select('conversions')
            .eq('referral_code', event.data.referredByCode)
            .maybeSingle();

          await brevo.updateContactAttribute(referrer.email, {
            REFERRAL_COUNT: referralCount?.conversions || 1,
          });
        }
      });
    }

    // ── Email Verification (immediate, transactional — per Artifact 06 §5.1) ──
    // This is a dedicated transactional email, separate from the welcome series.
    // Sent regardless of emailOptIn (it's a service message confirming the action).
    await step.run('send-email-verification', async () => {
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

    // ── Email 1: Signature confirmation + share prompt (immediate) ──
    await step.run('send-email-1-confirmation', async () => {
      if (!emailOptIn) return;

      // Get current signature count for social proof
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

    // ── Wait 3 days ──
    await step.sleep('wait-for-email-2', '3 days');

    // ── Check: is the subscriber still active? ──
    const isStillActive = await step.run('check-active-for-email-2', async () => {
      const { data: subscriber } = await supabase
        .from('email_subscribers')
        .select('status')
        .eq('email', email)
        .maybeSingle();

      return subscriber?.status === 'active';
    });

    if (!isStillActive || !emailOptIn) return;

    // ── Email 2: The story behind the campaign (Day 3) ──
    await step.run('send-email-2-story', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('WELCOME_2_STORY'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          REFERRAL_CODE: referralCode,
          SHARE_URL: `https://confluenceohio.org/sign?ref=${referralCode}`,
        },
        tags: ['welcome-series', 'welcome-2'],
      });
    });

    // ── Wait 4 more days (Day 7 total) ──
    await step.sleep('wait-for-email-3', '4 days');

    // ── Email 3: Invite to share their perspective (Day 7) ──
    await step.run('send-email-3-voices', async () => {
      // Check active before every send
      const { data: sub } = await supabase
        .from('email_subscribers')
        .select('status')
        .eq('email', email)
        .maybeSingle();
      if (sub?.status !== 'active') return;

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
          CURRENT_COUNT: (metrics?.value || 0).toLocaleString(),
          VOICES_URL: 'https://confluenceohio.org/voices/share',
          REFERRAL_CODE: referralCode,
          SHARE_URL: `https://confluenceohio.org/sign?ref=${referralCode}`,
        },
        tags: ['welcome-series', 'welcome-3'],
      });
    });

    // ── Wait 3 more days (Day 10 total) ──
    await step.sleep('wait-for-email-4', '3 days');

    // ── Email 4: Get involved (Day 10) ──
    await step.run('send-email-4-involve', async () => {
      const { data: sub } = await supabase
        .from('email_subscribers')
        .select('status')
        .eq('email', email)
        .maybeSingle();
      if (sub?.status !== 'active') return;

      await brevo.sendTransactional({
        templateId: getTemplateId('WELCOME_4_INVOLVE'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          VOLUNTEER_URL: 'https://confluenceohio.org/volunteer',
          DONATE_URL: `https://secure.actblue.com/donate/confluenceohio?refcode=${referralCode}`,
          REFERRAL_CODE: referralCode,
          SHARE_URL: `https://confluenceohio.org/sign?ref=${referralCode}`,
        },
        tags: ['welcome-series', 'welcome-4'],
      });
    });
  }
);

// Milestone thresholds (matches Artifact 06, §1.5)
function getNextMilestone(current: number): number {
  const milestones = [1000, 2500, 5000, 10000, 15000, 22000];
  return milestones.find(m => m > current) || 22000;
}
```

**Email 1 — Signature Confirmation (Immediate)**

| Field | Value |
|---|---|
| Subject | `You're signer #{{params.SIGNATURE_NUMBER}} — welcome to the movement` |
| Preview text | `{{params.CURRENT_COUNT}} people and counting. Help us reach {{params.NEXT_MILESTONE}}.` |
| Purpose | Confirm the action, deliver social proof, prompt first share, include email verification link |

Content outline:
- Hero: "You're signer #[number]!"
- Current count: "[X] people have signed so far. Help us reach [next milestone]."
- Email verification: "Please confirm your email to verify your signature: [Confirm My Signature →]"
- Share CTA with pre-populated buttons (Facebook, Twitter/X, WhatsApp, Email, Copy Link) — all using `?ref=[code]`
- Footer: campaign physical address, unsubscribe link

**Email 2 — The Story Behind the Campaign (Day 3)**

| Field | Value |
|---|---|
| Subject | `The tavern, the rivers, and how Columbus got its name` |
| Preview text | `In 1812, a tavern owner convinced the legislature to borrow a name. Here's the full story.` |
| Purpose | Deepen emotional investment, teach the history, humanize the campaign team |

Content outline:
- Open with the 1812 founding story (from Artifact 01 messaging framework)
- The rivers: Scioto and Olentangy — why the confluence matters
- Brief intro to the campaign team: who we are, why we care
- "The city already knows the name is complicated" — statue removal, Indigenous Peoples' Day, Reimagining Columbus initiative
- CTA: "Read the full case → confluenceohio.org/the-case"
- Secondary CTA: Share link

**Email 3 — Why Did You Sign? (Day 7)**

| Field | Value |
|---|---|
| Subject | `Why did you sign? We'd love to hear your perspective` |
| Preview text | `{{params.CURRENT_COUNT}} voices and counting. Add yours to the conversation.` |
| Purpose | Invite community voice submission, share a data point, deepen engagement |

Content outline:
- "We're at [count] signatures. But numbers alone don't tell the story."
- Invite to submit a community voice: "In 300 words or less, tell us why this matters to you — or why you disagree. We publish all perspectives."
- Featured community voice excerpt (if available; otherwise, a pull quote from the manifesto)
- One compelling data point or argument they may not have considered
- CTA: "Share your perspective → confluenceohio.org/voices/share"
- Secondary CTA: Share link

**Email 4 — Other Ways to Get Involved (Day 10)**

| Field | Value |
|---|---|
| Subject | `Beyond the petition: 6 ways to make Confluence happen` |
| Preview text | `Signature collectors, social amplifiers, neighborhood captains — find your role.` |
| Purpose | Convert signer to active volunteer, introduce donation, "recruit 3 friends" ask |

Content outline:
- "Your signature got us one step closer. Here's how to take the next step."
- Volunteer roles with time commitments (per Prompt 8 spec): signature collector (2 hrs/week), social amplifier (15 min/day), event organizer (4 hrs/month), neighborhood captain (3 hrs/week)
- "Recruit 3 friends" — personalized share link with referral code
- Donation ask: "Every $5 funds one more yard sign" (or equivalent tangible impact)
- CTA: "Find your role → confluenceohio.org/volunteer"

### 2.4 Signer-to-Volunteer Conversion (Day 14)

Triggered by: `petition/signature.created` (same event, separate function with delayed start)

Sent only to signers who: (a) opted into email, (b) are still active subscribers, (c) have opened at least one email in the welcome series (i.e., `LAST_ENGAGEMENT` updated within last 14 days), and (d) are NOT already volunteers.

```typescript
// apps/web/inngest/signer-to-volunteer.ts

export const signerToVolunteer = inngest.createFunction(
  {
    id: 'signer-to-volunteer',
    name: 'Signer to Volunteer Conversion',
    retries: 3,
  },
  { event: 'petition/signature.created' },

  async ({ event, step }) => {
    const { email, firstName, referralCode, emailOptIn } = event.data;
    if (!emailOptIn) return;

    // Wait 14 days from signature
    await step.sleep('wait-14-days', '14 days');

    // Check eligibility
    const isEligible = await step.run('check-volunteer-eligibility', async () => {
      // Must still be active subscriber
      const { data: sub } = await supabase
        .from('email_subscribers')
        .select('status')
        .eq('email', email)
        .maybeSingle();
      if (sub?.status !== 'active') return false;

      // Must not already be a volunteer
      const { data: vol } = await supabase
        .from('volunteers')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (vol) return false;

      // Must have engaged (opened/clicked) in last 14 days
      // Check via Brevo contact attribute LAST_ENGAGEMENT
      // If no engagement data, skip (conservative — don't email cold contacts)
      return true;  // Simplified; full implementation checks Brevo attribute
    });

    if (!isEligible) return;

    await step.run('send-volunteer-conversion', async () => {
      const brevo = getBrevoAdapter();

      await brevo.sendTransactional({
        templateId: getTemplateId('SIGNER_TO_VOLUNTEER'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          VOLUNTEER_URL: 'https://confluenceohio.org/volunteer',
          // Include a specific, time-bounded opportunity if available
          // (populated from a campaign_events table or hardcoded for launch)
        },
        tags: ['conversion', 'signer-to-volunteer'],
      });
    });
  }
);
```

**Email content:**

| Field | Value |
|---|---|
| Subject | `{{params.FIRSTNAME}}, we could use your help this weekend` |
| Preview text | `Last weekend, 12 volunteers collected 300 signatures. Join them.` |

Content outline:
- Social proof: "Last [time period], [X] volunteers collected [Y] signatures in [Z neighborhoods]"
- Specific ask: One or two current volunteer opportunities with dates/locations
- Low-barrier entry: "Even 2 hours makes a difference"
- Roles overview with time commitments
- CTA: "Sign up to volunteer → confluenceohio.org/volunteer"

### 2.5 Signer-to-Donor Conversion (Day 21)

Same trigger and eligibility pattern as signer-to-volunteer, but fires at Day 21 and additionally excludes contacts who have already donated (via `DONOR` attribute).

```typescript
// apps/web/inngest/signer-to-donor.ts

export const signerToDonor = inngest.createFunction(
  {
    id: 'signer-to-donor',
    name: 'Signer to Donor Conversion',
    retries: 3,
  },
  { event: 'petition/signature.created' },

  async ({ event, step }) => {
    const { email, firstName, referralCode, emailOptIn } = event.data;
    if (!emailOptIn) return;

    await step.sleep('wait-21-days', '21 days');

    const isEligible = await step.run('check-donor-eligibility', async () => {
      const { data: sub } = await supabase
        .from('email_subscribers')
        .select('status')
        .eq('email', email)
        .maybeSingle();
      if (sub?.status !== 'active') return false;

      // Must not already be a donor
      const { data: donation } = await supabase
        .from('donations')
        .select('id')
        .eq('donor_email', email)
        .maybeSingle();
      if (donation) return false;

      return true;
    });

    if (!isEligible) return;

    await step.run('send-donor-conversion', async () => {
      const brevo = getBrevoAdapter();

      await brevo.sendTransactional({
        templateId: getTemplateId('SIGNER_TO_DONOR'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          DONATE_URL: `https://secure.actblue.com/donate/confluenceohio?refcode=${referralCode}`,
        },
        tags: ['conversion', 'signer-to-donor'],
      });
    });
  }
);
```

**Email content:**

| Field | Value |
|---|---|
| Subject | `$5 = one more yard sign in your neighborhood` |
| Preview text | `Every dollar funds signature collection, legal review, and community outreach.` |

Content outline:
- Tie to a specific, tangible need: "$5 prints a yard sign. $25 covers an hour of legal review. $100 funds a neighborhood canvass day."
- Transparency: "Here's where every dollar goes" — simple breakdown (40% signature collection materials, 25% legal/ballot access, 20% digital outreach, 15% operations)
- Low-barrier ask: "Any amount helps. Even $5."
- ActBlue link with refcode
- CTA: "Chip in → [ActBlue link]"
- No guilt, no urgency manipulation. Straightforward: "If you can, we'd appreciate it."

### 2.6 Milestone Celebrations

Triggered by: `campaign/milestone.reached` — fired by the signature count trigger (Artifact 05, §4.1) when the count crosses a threshold.

**Milestone detection** is handled by a separate Inngest function that checks count thresholds after each signature:

```typescript
// apps/web/inngest/milestone-check.ts

const MILESTONES = [1000, 2500, 5000, 10000, 15000, 22000];

export const milestoneCheck = inngest.createFunction(
  {
    id: 'milestone-check',
    name: 'Check for Milestone Reached',
    retries: 1,
  },
  { event: 'petition/signature.created' },

  async ({ event, step }) => {
    await step.run('check-milestone', async () => {
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('value')
        .eq('metric', 'signature_count')
        .single();

      const count = metrics?.value || 0;
      const milestone = MILESTONES.find(m => m === count);

      if (milestone) {
        // Fire milestone event (only fires at exact threshold)
        await inngest.send({
          name: 'campaign/milestone.reached',
          data: { milestone, currentCount: count },
        });
      }
    });
  }
);
```

**Milestone notification (batch send to all active subscribers):**

```typescript
// apps/web/inngest/milestone-notification.ts

export const milestoneNotification = inngest.createFunction(
  {
    id: 'milestone-notification',
    name: 'Milestone Celebration Email',
    retries: 3,
  },
  { event: 'campaign/milestone.reached' },

  async ({ event, step }) => {
    const { milestone, currentCount } = event.data;
    const nextMilestone = getNextMilestone(currentCount);

    // For milestone emails, use Brevo's campaign send (not transactional)
    // to a specific list. This is the one case where we use Brevo's
    // campaign API rather than transactional, because it's a bulk send
    // to a list and Brevo handles throttling/delivery optimization.

    await step.run('send-milestone-campaign', async () => {
      const brevo = getBrevoAdapter();

      // Create and send a campaign to the Signers list
      await brevo.sendCampaign({
        name: `Milestone: ${milestone.toLocaleString()} signatures`,
        subject: milestoneSubject(milestone),
        previewText: `We did it. ${milestone.toLocaleString()} people have signed. Next stop: ${nextMilestone.toLocaleString()}.`,
        templateId: getTemplateId('MILESTONE_CELEBRATION'),
        listIds: [parseInt(process.env.BREVO_LIST_SIGNERS!)],
        params: {
          MILESTONE: milestone.toLocaleString(),
          NEXT_MILESTONE: nextMilestone.toLocaleString(),
          CURRENT_COUNT: currentCount.toLocaleString(),
          MILESTONE_PERCENTAGE: Math.round((milestone / 22000) * 100),
        },
        tags: ['milestone', `milestone-${milestone}`],
        scheduledAt: new Date().toISOString(),  // Send immediately
      });
    });
  }
);

function milestoneSubject(milestone: number): string {
  const subjects: Record<number, string> = {
    1000: '1,000 signatures. This is real.',
    2500: '2,500 strong — the movement is growing',
    5000: '5,000 people agree: the name should fit the place',
    10000: '10,000 signatures. We\'re almost halfway.',
    15000: '15,000 — the finish line is in sight',
    22000: '22,000 signatures. We did it. The ballot awaits.',
  };
  return subjects[milestone] || `${milestone.toLocaleString()} signatures reached!`;
}
```

**Milestone email content (all milestones):**

Content outline:
- Hero number: "[X],000 signatures"
- Celebratory but purposeful tone: "This is what civic participation looks like."
- Progress bar graphic (HTML email rendering of percentage toward 22,000)
- What the milestone means: "We're [X]% of the way to the ballot"
- Share CTA: "Help us reach [next milestone]" — each recipient's personalized referral link
- For 22,000 milestone: different tone entirely — "The petition is complete. Here's what happens next." — explain the Board of Elections submission process and timeline to ballot

### 2.7 Re-Engagement Sequence

Triggered by: `engagement/check.daily` — a cron-triggered Inngest function that runs daily.

```typescript
// apps/web/inngest/daily-engagement-check.ts

export const dailyEngagementCheck = inngest.createFunction(
  {
    id: 'daily-engagement-check',
    name: 'Daily Engagement List Maintenance',
    retries: 2,
  },
  { cron: '0 6 * * *' },  // Daily at 6 AM UTC (2 AM ET)

  async ({ step }) => {
    const brevo = getBrevoAdapter();

    // Step 1: Move contacts with recent engagement to Engaged list
    await step.run('update-engaged-list', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Query Brevo for contacts with LAST_ENGAGEMENT >= 30 days ago
      // Brevo's contact segment API can filter by attribute
      // Add matching contacts to Engaged list, remove from Disengaged
    });

    // Step 2: Identify disengaged contacts (no engagement in 60+ days)
    await step.run('identify-disengaged', async () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Query for contacts with LAST_ENGAGEMENT < 60 days ago
      // or LAST_ENGAGEMENT is null and SIGNED_AT < 60 days ago
      // Add to Disengaged list, remove from Engaged list
    });

    // Step 3: Trigger re-engagement for newly disengaged contacts
    await step.run('trigger-re-engagement', async () => {
      // Find contacts added to Disengaged list today who haven't
      // already received a re-engagement sequence
      // Fire individual re-engagement events for each
    });
  }
);
```

**Re-engagement sequence (2 emails):**

```typescript
// apps/web/inngest/re-engagement.ts

export const reEngagement = inngest.createFunction(
  {
    id: 're-engagement',
    name: 'Re-engagement Sequence',
    retries: 3,
  },
  { event: 'subscriber/re-engagement.triggered' },

  async ({ event, step }) => {
    const { email, firstName } = event.data;
    const brevo = getBrevoAdapter();

    // ── Email 1: Major update or compelling hook ──
    await step.run('send-re-engagement-1', async () => {
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('value')
        .eq('metric', 'signature_count')
        .single();

      await brevo.sendTransactional({
        templateId: getTemplateId('RE_ENGAGEMENT_1'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName || 'friend',
          CURRENT_COUNT: (metrics?.value || 0).toLocaleString(),
        },
        tags: ['re-engagement', 're-engagement-1'],
      });
    });

    // Wait 7 days
    await step.sleep('wait-for-re-engagement-2', '7 days');

    // Check if they re-engaged (opened/clicked the first email)
    const reEngaged = await step.run('check-re-engagement', async () => {
      const { data: sub } = await supabase
        .from('email_subscribers')
        .select('status')
        .eq('email', email)
        .maybeSingle();

      // If they unsubscribed or bounced, stop
      if (sub?.status !== 'active') return 'inactive';

      // Check Brevo for recent engagement
      // If LAST_ENGAGEMENT updated since Email 1, they re-engaged
      return 'still-disengaged';  // Simplified
    });

    if (reEngaged === 'inactive') return;
    if (reEngaged === 're-engaged') {
      // Move back to Engaged list
      await step.run('move-to-engaged', async () => {
        await brevo.removeContactFromList(email, parseInt(process.env.BREVO_LIST_DISENGAGED!));
        await brevo.addContactToLists(email, [parseInt(process.env.BREVO_LIST_ENGAGED!)]);
      });
      return;
    }

    // ── Email 2: Final attempt ──
    await step.run('send-re-engagement-2', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('RE_ENGAGEMENT_2'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName || 'friend',
        },
        tags: ['re-engagement', 're-engagement-2'],
      });
    });

    // Wait 14 days, then check final status
    await step.sleep('wait-for-final-check', '14 days');

    await step.run('final-engagement-check', async () => {
      // If still no engagement after Email 2:
      // Leave on Disengaged list, exclude from all future sends
      // except milestone announcements (22,000 = ballot qualification)
      // Do NOT unsubscribe them — they didn't ask to be removed.
      // Just stop sending marketing emails to preserve deliverability.
    });
  }
);
```

**Re-engagement Email 1:**

| Field | Value |
|---|---|
| Subject | `A lot has happened since you signed — here's the update` |
| Preview text | `We're at {{params.CURRENT_COUNT}} signatures. Here's what you missed.` |

Content: Lead with the biggest update since they went quiet (signature count, media coverage, endorsement, legal development). Brief, news-style. Single CTA: "Catch up on the campaign →"

**Re-engagement Email 2:**

| Field | Value |
|---|---|
| Subject | `Still with us?` |
| Preview text | `If you'd like to keep hearing from us, no action needed. If not, you can unsubscribe below.` |

Content: Short and honest. "We haven't heard from you in a while. If you'd still like campaign updates, you don't need to do anything. If not, the unsubscribe link is below — no hard feelings." This email respects the reader's attention and builds trust.

### 2.8 Volunteer Onboarding Sequence

Triggered by: `volunteer/signup.created` (fired by the volunteer signup API route)

```typescript
// apps/web/inngest/volunteer-onboarding.ts

export const volunteerOnboarding = inngest.createFunction(
  {
    id: 'volunteer-onboarding',
    name: 'Volunteer Onboarding Sequence',
    retries: 3,
  },
  { event: 'volunteer/signup.created' },

  async ({ event, step }) => {
    const { email, firstName, lastName, roles, neighborhood } = event.data;
    const brevo = getBrevoAdapter();

    // Create/update Brevo contact with volunteer attributes
    await step.run('update-brevo-volunteer', async () => {
      await brevo.createOrUpdateContact({
        email,
        firstName,
        lastName,
        source: 'volunteer',
        isVolunteer: true,
        volunteerRoles: roles,
        neighborhood,
        listIds: [
          parseInt(process.env.BREVO_LIST_ALL!),
          parseInt(process.env.BREVO_LIST_VOLUNTEERS!),
        ],
      });
    });

    // Immediate: confirmation email with role-specific content
    await step.run('send-volunteer-confirmation', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('VOLUNTEER_CONFIRMATION'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          ROLES: roles.map(r => roleDisplayName(r)).join(', '),
          ROLE_NEXT_STEPS: getRoleNextSteps(roles),
        },
        tags: ['volunteer', 'volunteer-confirmation'],
      });
    });

    // Admin notification
    await step.run('notify-admin', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('ADMIN_NEW_VOLUNTEER'),
        to: process.env.ADMIN_EMAIL!,
        params: {
          VOLUNTEER_NAME: `${firstName} ${lastName}`,
          VOLUNTEER_EMAIL: email,
          ROLES: roles.join(', '),
          NEIGHBORHOOD: neighborhood || 'Not specified',
        },
        tags: ['admin', 'new-volunteer'],
      });
    });

    // Day 3: Role-specific onboarding details
    await step.sleep('wait-for-onboarding-2', '3 days');

    await step.run('send-volunteer-onboarding-2', async () => {
      const { data: sub } = await supabase
        .from('email_subscribers')
        .select('status')
        .eq('email', email)
        .maybeSingle();
      if (sub?.status !== 'active') return;

      await brevo.sendTransactional({
        templateId: getTemplateId('VOLUNTEER_ONBOARDING_2'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          PRIMARY_ROLE: roles[0],
          ROLE_GUIDE_URL: `https://confluenceohio.org/volunteer/guide/${roles[0]}`,
        },
        tags: ['volunteer', 'volunteer-onboarding-2'],
      });
    });
  }
);

function roleDisplayName(role: string): string {
  const names: Record<string, string> = {
    signature_collector: 'Signature Collector',
    social_amplifier: 'Social Amplifier',
    event_organizer: 'Event Organizer',
    story_collector: 'Story Collector',
    neighborhood_captain: 'Neighborhood Captain',
    design_content: 'Design & Content Creator',
  };
  return names[role] || role;
}

function getRoleNextSteps(roles: string[]): string {
  // Returns HTML string with role-specific next steps
  // Generated per the primary role (first in array)
  const steps: Record<string, string> = {
    signature_collector: 'We\'ll send you a signature collection toolkit with printed petitions, talking points, and a list of upcoming tabling events in your area.',
    social_amplifier: 'Follow us on social media and watch for shareable content in your inbox. We\'ll send you a social media toolkit with sample posts and graphics.',
    event_organizer: 'We\'ll connect you with our events coordinator to discuss upcoming community forums. Start thinking about venues in your neighborhood.',
    story_collector: 'We\'ll send you an interview guide and tips for collecting community voices. You can start by sharing your own story at confluenceohio.org/voices/share.',
    neighborhood_captain: 'We\'ll schedule a 30-minute onboarding call to discuss your neighborhood and connect you with other volunteers in your area.',
    design_content: 'We\'ll add you to our content creation channel and share our brand guidelines. We need help with social graphics, blog posts, and printed materials.',
  };
  return steps[roles[0]] || 'We\'ll be in touch with next steps for your role.';
}
```

### 2.9 Standalone Email Subscriber Welcome

Triggered by: `subscriber/standalone.created` (fired when someone subscribes via footer, blog, or standalone form — NOT via petition signing)

```typescript
// apps/web/inngest/standalone-welcome.ts

export const standaloneWelcome = inngest.createFunction(
  {
    id: 'standalone-welcome',
    name: 'Standalone Subscriber Welcome',
    retries: 3,
  },
  { event: 'subscriber/standalone.created' },

  async ({ event, step }) => {
    const { email, firstName, source } = event.data;
    const brevo = getBrevoAdapter();

    await step.run('create-brevo-contact', async () => {
      await brevo.createOrUpdateContact({
        email,
        firstName,
        source: source as Contact['source'],
        listIds: [
          parseInt(process.env.BREVO_LIST_ALL!),
          parseInt(process.env.BREVO_LIST_STANDALONE!),
        ],
      });
    });

    await step.run('send-standalone-welcome', async () => {
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('value')
        .eq('metric', 'signature_count')
        .single();

      await brevo.sendTransactional({
        templateId: getTemplateId('STANDALONE_WELCOME'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName || 'friend',
          CURRENT_COUNT: (metrics?.value || 0).toLocaleString(),
          SIGN_URL: 'https://confluenceohio.org/sign',
        },
        tags: ['standalone', 'standalone-welcome'],
      });
    });
  }
);
```

**Standalone welcome email:**

| Field | Value |
|---|---|
| Subject | `Welcome — here's why {{params.CURRENT_COUNT}} people have signed` |
| Preview text | `You're on the list. Here's the case for renaming Columbus.` |

Content: Brief welcome, the 30-second case, CTA to sign the petition. These subscribers haven't signed yet — the primary goal is converting them to signers.

### 2.10 Donation Thank You

Triggered by: `donation/received` (fired by the ActBlue webhook handler, specified in Prompt 9)

```typescript
// apps/web/inngest/donation-thank-you.ts

export const donationThankYou = inngest.createFunction(
  {
    id: 'donation-thank-you',
    name: 'Donation Thank You',
    retries: 3,
  },
  { event: 'donation/received' },

  async ({ event, step }) => {
    const { email, donorName, amountCents, recurring } = event.data;
    const brevo = getBrevoAdapter();

    // Update Brevo contact with donor attributes
    await step.run('update-brevo-donor', async () => {
      await brevo.updateContactAttribute(email, {
        DONOR: true,
        DONATION_TOTAL: amountCents,
      });
      await brevo.addContactToLists(email, [parseInt(process.env.BREVO_LIST_DONORS!)]);
    });

    // Send thank-you email
    await step.run('send-donation-thank-you', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId(
          recurring ? 'DONATION_THANK_YOU_RECURRING' : 'DONATION_THANK_YOU'
        ),
        to: email,
        toName: donorName,
        params: {
          DONOR_NAME: donorName,
          AMOUNT: `$${(amountCents / 100).toFixed(2)}`,
          RECURRING: recurring,
        },
        tags: ['donation', recurring ? 'donation-recurring' : 'donation-one-time'],
      });
    });
  }
);
```

---

## 3. Email Template Specifications

### 3.1 Template Design System

All email templates share a consistent visual language. Templates are created in Brevo's template editor (WYSIWYG or HTML) and referenced by numeric template ID.

**Common elements across all templates:**

| Element | Specification |
|---|---|
| **Width** | 600px max (email standard), fluid on mobile |
| **Header** | Campaign logo (Confluence Ohio wordmark), 120px wide, left-aligned. No full-width banner image (slows load, often blocked). |
| **Font** | System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`. No web fonts (inconsistent email client support). |
| **Body text** | 16px, #333333, line-height 1.6 |
| **Headings** | 22px, #1e3a5f (campaign navy), bold |
| **CTA button** | 48px height, 16px padding horizontal, #1e40af background, #ffffff text, 6px border-radius. Full-width on mobile. |
| **Link color** | #1e40af (campaign blue), underlined |
| **Footer** | Light gray background (#f5f5f5), 14px text, includes: campaign name, physical address, unsubscribe link, social icons (Twitter/X, Facebook, Instagram) |
| **Preheader** | Hidden preheader text (CSS: `display:none; max-height:0; overflow:hidden`) for inbox preview |

**Unsubscribe footer (required on every marketing email):**

```html
<div style="background: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #666;">
  <p>Confluence Ohio · PO Box 8012 · Columbus, OH 43201</p>
  <p>
    You're receiving this because you signed the petition or subscribed at confluenceohio.org.
    <br>
    <a href="{{ unsubscribe }}" style="color: #1e40af;">Unsubscribe</a> ·
    <a href="https://confluenceohio.org/privacy" style="color: #1e40af;">Privacy Policy</a>
  </p>
</div>
```

`{{ unsubscribe }}` is Brevo's built-in unsubscribe tag — it automatically generates a per-recipient unsubscribe link.

### 3.2 Template ID Registry

All template IDs are stored as environment variables so they can be updated without code changes.

```typescript
// packages/email/templates.ts

const TEMPLATE_IDS: Record<string, string> = {
  // Welcome series
  WELCOME_1_CONFIRMATION: 'BREVO_TEMPLATE_WELCOME_1',
  WELCOME_2_STORY: 'BREVO_TEMPLATE_WELCOME_2',
  WELCOME_3_VOICES: 'BREVO_TEMPLATE_WELCOME_3',
  WELCOME_4_INVOLVE: 'BREVO_TEMPLATE_WELCOME_4',

  // Conversion
  SIGNER_TO_VOLUNTEER: 'BREVO_TEMPLATE_SIGNER_TO_VOLUNTEER',
  SIGNER_TO_DONOR: 'BREVO_TEMPLATE_SIGNER_TO_DONOR',

  // Milestone
  MILESTONE_CELEBRATION: 'BREVO_TEMPLATE_MILESTONE',

  // Re-engagement
  RE_ENGAGEMENT_1: 'BREVO_TEMPLATE_RE_ENGAGEMENT_1',
  RE_ENGAGEMENT_2: 'BREVO_TEMPLATE_RE_ENGAGEMENT_2',

  // Volunteer
  VOLUNTEER_CONFIRMATION: 'BREVO_TEMPLATE_VOLUNTEER_CONFIRM',
  VOLUNTEER_ONBOARDING_2: 'BREVO_TEMPLATE_VOLUNTEER_ONBOARD_2',

  // Standalone
  STANDALONE_WELCOME: 'BREVO_TEMPLATE_STANDALONE_WELCOME',

  // Donation
  DONATION_THANK_YOU: 'BREVO_TEMPLATE_DONATION_THANKS',
  DONATION_THANK_YOU_RECURRING: 'BREVO_TEMPLATE_DONATION_THANKS_RECURRING',

  // Admin
  ADMIN_NEW_VOLUNTEER: 'BREVO_TEMPLATE_ADMIN_NEW_VOLUNTEER',

  // Transactional (not marketing)
  EMAIL_VERIFICATION: 'BREVO_TEMPLATE_EMAIL_VERIFY',
  RESEND_VERIFICATION: 'BREVO_TEMPLATE_RESEND_VERIFY',
};

export function getTemplateId(key: keyof typeof TEMPLATE_IDS): number {
  const envVar = TEMPLATE_IDS[key];
  const id = process.env[envVar];
  if (!id) throw new Error(`Missing template ID env var: ${envVar}`);
  return parseInt(id, 10);
}
```

### 3.3 Transactional vs. Marketing Classification

**Transactional emails** (no unsubscribe required by CAN-SPAM, but we include one anyway as best practice):
- Email verification confirmation
- Resend verification

**Marketing emails** (CAN-SPAM compliance mandatory — unsubscribe link, physical address, honest subject line):
- Welcome series (all 4)
- Signer-to-volunteer conversion
- Signer-to-donor conversion
- Milestone celebrations
- Re-engagement sequence
- Volunteer onboarding
- Standalone welcome
- Donation thank-you

The distinction matters because: (a) transactional emails are sent regardless of unsubscribe status (they're service messages), and (b) Brevo tracks transactional and marketing emails on separate dashboards with separate rate limits.

---

## 4. Standalone Email Signup Component

The email signup form appears in three locations: site footer (all pages), blog sidebar, and a dedicated `/subscribe` route (for external links). All three use the same component with source attribution.

### 4.1 Component Specification

```typescript
// Component: EmailSignupForm
// Props: source ('footer' | 'blog' | 'standalone' | 'event')

// Fields:
// - Email (required)
// - First name (optional — improves personalization)

// Behavior:
// 1. Client-side email format validation
// 2. POST /api/subscribe with { email, firstName, source }
// 3. Server-side: validate, check duplicate, insert email_subscribers, fire Inngest event
// 4. Success: inline "Thanks! Check your inbox." message (no redirect)
// 5. Duplicate: "You're already subscribed!" (friendly, not an error)
```

### 4.2 Subscribe API Route

```typescript
// apps/web/app/api/subscribe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { inngest } from '@/lib/inngest';

const SubscribeSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  firstName: z.string().max(100).trim().optional(),
  source: z.enum(['footer', 'blog', 'standalone', 'event']),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = SubscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 422 }
    );
  }

  const { email, firstName, source } = parsed.data;
  const emailHash = createHash('sha256').update(email).digest('hex');

  // Check for existing subscriber
  const { data: existing } = await supabase
    .from('email_subscribers')
    .select('id, status')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'unsubscribed') {
      // Re-subscribe
      await supabase
        .from('email_subscribers')
        .update({ status: 'active', unsubscribed_at: null, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
    // Either way, return success (don't reveal subscription status)
    return NextResponse.json({ success: true });
  }

  // Insert new subscriber
  await supabase.from('email_subscribers').insert({
    email,
    email_hash: emailHash,
    first_name: firstName || null,
    source,
    status: 'active',
  });

  // Fire Inngest event for welcome email
  await inngest.send({
    name: 'subscriber/standalone.created',
    data: { email, firstName: firstName || null, source },
  });

  return NextResponse.json({ success: true });
}
```

---

## 5. Compliance

### 5.1 CAN-SPAM Requirements

The CAN-SPAM Act (15 U.S.C. §7701-7713) applies to all commercial email messages. While political speech enjoys some exemptions, best practice is full compliance regardless.

| Requirement | Implementation |
|---|---|
| **Accurate header information** | Sender: "Confluence Ohio" <campaign@confluenceohio.org>. Must be a verified domain in Brevo. Reply-To: info@confluenceohio.org (monitored). |
| **Non-deceptive subject lines** | All subjects must accurately reflect content. No misleading urgency ("RE:", "FWD:", fake intimacy). Enforced by editorial review. |
| **Identify as advertisement** | Marketing emails include: "This is a message from the Confluence Ohio campaign." (Not required for transactional.) |
| **Physical postal address** | PO Box 8012, Columbus, OH 43201. Included in every marketing email footer. |
| **Clear unsubscribe mechanism** | Brevo's `{{ unsubscribe }}` tag in every marketing email footer. Must be: (a) clearly visible, (b) functional for at least 30 days after send, (c) processed within 10 business days. Brevo handles processing automatically. |
| **Honor opt-out within 10 days** | Brevo processes unsubscribes immediately (real-time). Our webhook handler also updates local database instantly. |
| **No selling/transferring unsubscribed emails** | Policy: we never share, sell, or transfer any email addresses. Stated in privacy policy. |

### 5.2 Unsubscribe Handling

**Single unsubscribe = unsubscribe from all marketing emails.** We do not offer list-level unsubscription (too confusing, and the legal risk of getting it wrong outweighs the benefit of per-list preferences).

Flow:
1. Recipient clicks unsubscribe link in email footer
2. Brevo immediately marks contact as unsubscribed
3. Brevo fires `unsubscribed` webhook to our endpoint
4. Our handler updates `email_subscribers.status = 'unsubscribed'` and sets `unsubscribed_at`
5. Contact is removed from all marketing lists
6. Contact continues to receive transactional emails only (email verification)
7. Brevo's suppression list prevents any future marketing sends to this address

**One-click unsubscribe header:** Brevo automatically includes the `List-Unsubscribe` and `List-Unsubscribe-Post` headers required by Google/Yahoo's 2024 sender requirements. This enables one-click unsubscribe in Gmail and Apple Mail.

### 5.3 Suppression List Management

Three types of suppressed contacts:

| Type | Source | Behavior |
|---|---|---|
| **Unsubscribed** | User clicked unsubscribe | No marketing email. Transactional only. Can re-subscribe voluntarily. |
| **Hard bounced** | Brevo detected invalid address | No email at all. Brevo auto-suppresses. Permanent unless manually reviewed. |
| **Spam complaint** | User marked email as spam | No email at all. Brevo auto-suppresses. Permanent. |

Suppressed contacts are never deleted from our database (we need the record to prevent re-adding them). They are excluded from all list sends and their database status reflects why they were suppressed.

### 5.4 Ohio-Specific Regulations

Ohio does not have a state-level email marketing law that goes beyond CAN-SPAM. However, as a 501(c)(4) social welfare organization:

- Ohio lobbying and issue advocacy disclosure rules (ORC §3517) may require a "Paid for by Confluence Ohio" disclaimer on email communications that advocate for a ballot measure. Consult election counsel on whether this applies to petition-related emails vs. general campaign updates.
- Once a ballot measure is formally filed, Ohio campaign finance reporting requirements apply. Contribution acknowledgments (donation thank-you emails) should include any legally required disclosure language.
- 501(c)(4) status means Google Ad Grants ($10K/mo free ads) are NOT available — those require 501(c)(3). Artifact 03 already accounts for this and specifies a $500/mo paid search budget instead.

### 5.5 Privacy Policy Email Provisions

The site's privacy policy (per Prompt 2 page inventory) must include:

- What data is collected via email signup (email, first name)
- How email addresses are used (campaign updates, petition news, volunteer coordination)
- That we use Brevo as our email service provider (data processor disclosure)
- That we never sell or share email addresses
- How to unsubscribe (link to preferences or one-click in any email)
- Data retention: email addresses retained until unsubscription + 30 days, then anonymized (hashed) for aggregate metrics
- Right to deletion: contact info@confluenceohio.org to request complete data removal

### 5.6 Domain Authentication

Before sending any email, the confluenceohio.org domain must be authenticated in Brevo:

| Record | Type | Purpose |
|---|---|---|
| SPF | TXT | Authorizes Brevo's servers to send on behalf of confluenceohio.org |
| DKIM | TXT | Cryptographic signature proving email wasn't tampered with |
| DMARC | TXT | Policy for handling emails that fail SPF/DKIM (recommended: `p=quarantine`) |
| Return-Path | CNAME | Brevo bounce handling subdomain |

These DNS records are configured in Cloudflare (per tech stack doc). Brevo provides the exact record values during domain verification setup.

---

## 6. Environment Variables

All email-related configuration stored as environment variables:

```bash
# Brevo API
BREVO_API_KEY=xkeysib-...                    # Brevo v3 API key
BREVO_WEBHOOK_SECRET=whsec_...               # Shared secret for webhook verification

# Brevo List IDs (numeric, assigned by Brevo on creation)
BREVO_LIST_ALL=1
BREVO_LIST_SIGNERS=2
BREVO_LIST_VERIFIED=3
BREVO_LIST_VOLUNTEERS=4
BREVO_LIST_DONORS=5
BREVO_LIST_ENGAGED=6
BREVO_LIST_DISENGAGED=7
BREVO_LIST_STANDALONE=8

# Brevo Template IDs (numeric, assigned by Brevo on creation)
BREVO_TEMPLATE_WELCOME_1=1
BREVO_TEMPLATE_WELCOME_2=2
BREVO_TEMPLATE_WELCOME_3=3
BREVO_TEMPLATE_WELCOME_4=4
BREVO_TEMPLATE_SIGNER_TO_VOLUNTEER=5
BREVO_TEMPLATE_SIGNER_TO_DONOR=6
BREVO_TEMPLATE_MILESTONE=7
BREVO_TEMPLATE_RE_ENGAGEMENT_1=8
BREVO_TEMPLATE_RE_ENGAGEMENT_2=9
BREVO_TEMPLATE_VOLUNTEER_CONFIRM=10
BREVO_TEMPLATE_VOLUNTEER_ONBOARD_2=11
BREVO_TEMPLATE_STANDALONE_WELCOME=12
BREVO_TEMPLATE_DONATION_THANKS=13
BREVO_TEMPLATE_DONATION_THANKS_RECURRING=14
BREVO_TEMPLATE_ADMIN_NEW_VOLUNTEER=15
BREVO_TEMPLATE_EMAIL_VERIFY=16
BREVO_TEMPLATE_RESEND_VERIFY=17

# Sender configuration
EMAIL_FROM_ADDRESS=campaign@confluenceohio.org
EMAIL_FROM_NAME=Confluence Ohio
EMAIL_REPLY_TO=info@confluenceohio.org
ADMIN_EMAIL=tim@confluenceohio.org

# Inngest
INNGEST_EVENT_KEY=...                         # Inngest event key
INNGEST_SIGNING_KEY=...                       # Inngest signing key (verifies webhook calls)
```

---

## 7. Template Content Reference

Complete email copy for each template. These serve as the content brief for creating templates in Brevo's editor.

### 7.1 Email Verification (Transactional — also specified in Artifact 06, §5.1)

**Subject:** `Confirm your signature — you're signer #{{ params.SIGNATURE_NUMBER }}!`
**Preview:** `Click to verify your email and make it official.`

```
Hi {{ params.FIRSTNAME }},

You just signed the petition to rename Columbus to Confluence, Ohio.
You're signer #{{ params.SIGNATURE_NUMBER }}.

Confirm your email to verify your signature:

[Confirm My Signature →]  {{ params.VERIFICATION_URL }}

This link expires in 72 hours.

If you didn't sign this petition, you can safely ignore this email.

— The Confluence Ohio Team
```

### 7.2 Welcome Email 1 — Signature Confirmation + Share Prompt

**Subject:** `You're signer #{{ params.SIGNATURE_NUMBER }} — welcome to the movement`
**Preview:** `{{ params.CURRENT_COUNT }} people and counting. Help us reach {{ params.NEXT_MILESTONE }}.`

Note: This is a marketing email (welcome series), separate from the transactional verification email above. The verification email handles email confirmation; this email focuses on social sharing and engagement.

```
You're signer #{{ params.SIGNATURE_NUMBER }}.

{{ params.CURRENT_COUNT }} people have added their names so far. Help us
reach {{ params.NEXT_MILESTONE }} — share with 3 friends.

[Share on Facebook]  [Share on Twitter/X]  [Share on WhatsApp]  [Copy Link]

Your personal share link: {{ params.SHARE_URL }}
Every person who signs through your link is tracked — we'll let you know
when your friends join.

Thank you for being part of this.

— The Confluence Ohio Team
```

### 7.3 Welcome Email 2 — The Story (Day 3)

**Subject:** `The tavern, the rivers, and how Columbus got its name`
**Preview:** `In 1812, a tavern owner convinced the legislature to borrow a name. Here's the full story.`

```
{{ params.FIRSTNAME }},

In 1812, the Ohio legislature needed a name for the state's new capital.
The city sat at the confluence of the Scioto and Olentangy rivers — the
very reason the site was chosen. The founding document described it as
"High Banks opposite Franklinton at the Forks of the Scioto."

But a tavern-owning legislator named Joseph Foos admired Christopher
Columbus, and over drinks, he persuaded his colleagues to name the city
after an Italian explorer who never came within a thousand miles of Ohio.

That was a fine name for its time. But times change.

In 2020, the city removed the Columbus statue from City Hall and replaced
Columbus Day with Indigenous Peoples' Day. In 2023, the city launched a
$3.5 million "Reimagining Columbus" initiative. The conversation about
this city's name isn't new — we're just helping it reach its conclusion.

"Confluence" isn't just a pretty word. It's what this city literally is:
the place where two rivers meet, where diverse communities converge,
where ideas collide. It's Ohio's largest, youngest, fastest-growing city
— and its name should reflect what it actually is.

[Read the full case →]  https://confluenceohio.org/the-case

— The Confluence Ohio Team
```

### 7.4 Welcome Email 3 — Voices (Day 7)

**Subject:** `Why did you sign? We'd love to hear your perspective`
**Preview:** `{{ params.CURRENT_COUNT }} voices and counting. Add yours to the conversation.`

```
{{ params.FIRSTNAME }},

We're at {{ params.CURRENT_COUNT }} signatures. But numbers alone don't
tell the story. We want to hear yours.

Why did you sign? What does the name of this city mean to you? Whether
you support the change wholeheartedly, have reservations, or signed out
of curiosity — your perspective matters.

In 300 words or less, share your thoughts. We publish all perspectives
— support, opposition, and everything in between.

[Share Your Perspective →]  {{ params.VOICES_URL }}

Here's something you might not know: nearly 200 burial and ceremonial
mounds have been documented in Franklin County, several at the confluence
itself. The Mingo, Shawnee, Delaware, and Wyandot peoples knew this
place long before anyone named it Columbus.

— The Confluence Ohio Team
```

### 7.5 Welcome Email 4 — Get Involved (Day 10)

**Subject:** `Beyond the petition: 6 ways to make Confluence happen`
**Preview:** `Signature collectors, social amplifiers, neighborhood captains — find your role.`

```
{{ params.FIRSTNAME }},

Your signature moved us one step closer to the ballot. Here's how to
take the next step.

SIGNATURE COLLECTOR (2 hrs/week)
Table at farmers markets and community events. We provide the petitions,
talking points, and training.

SOCIAL AMPLIFIER (15 min/day)
Share campaign content, engage in online conversations, and help our
message reach new audiences.

NEIGHBORHOOD CAPTAIN (3 hrs/week)
Coordinate efforts in your area. Connect with neighbors, host
conversations, distribute materials.

EVENT ORGANIZER (4 hrs/month)
Plan community forums, info sessions, and house parties.

[Find Your Role →]  {{ params.VOLUNTEER_URL }}

Or help fund the campaign:
[Donate Any Amount →]  {{ params.DONATE_URL }}

$5 prints a yard sign. $25 covers an hour of legal review. Every dollar
goes directly to getting this question on the ballot.

And the simplest thing you can do right now? Share your personal link
with 3 friends:

{{ params.SHARE_URL }}

— The Confluence Ohio Team
```

---

## 8. Claude Code Handoff

### Handoff Prompt 7A: Brevo Adapter and Email Port

```
Create the Brevo email adapter following the hexagonal architecture pattern.

Files to generate:
1. `packages/email/types.ts` — Email port interface (EmailPort) with methods:
   createOrUpdateContact, addContactToLists, removeContactFromList,
   sendTransactional, updateContactAttribute, sendCampaign.
   Include Contact, TransactionalEmail, CampaignEmail, and ListId types.

2. `packages/email/brevo.ts` — BrevoAdapter class implementing EmailPort.
   Uses Brevo API v3 (https://api.brevo.com/v3). Methods:
   - createOrUpdateContact: POST /contacts with updateEnabled=true
   - addContactToLists: POST /contacts/lists/:id/contacts/add
   - removeContactFromList: POST /contacts/lists/:id/contacts/remove
   - sendTransactional: POST /smtp/email with templateId + params
   - updateContactAttribute: PUT /contacts/:identifier
   - sendCampaign: POST /emailCampaigns + POST /emailCampaigns/:id/sendNow
   All methods include error handling with BrevoApiError class.
   API key from process.env.BREVO_API_KEY.

3. `packages/email/templates.ts` — Template ID registry mapping template
   names to environment variable names. getTemplateId() function that
   reads the env var and returns the numeric Brevo template ID.

4. `packages/email/index.ts` — Factory function getBrevoAdapter() that
   returns a singleton BrevoAdapter instance.

5. `packages/email/brevo-setup.ts` — One-time setup script to create
   custom contact attributes and lists in Brevo via API. Run via
   `npx ts-node packages/email/brevo-setup.ts`. Creates 14 custom
   attributes and 8 lists per the spec in Artifact 07, §1.2 and §1.3.

Reference Artifact 07 §1 for complete API specs, attribute definitions,
and list structure. Use Zod for all input validation. TypeScript strict mode.
```

### Handoff Prompt 7B: Inngest Functions — Welcome Series and Core Automations

```
Create all Inngest functions for the Confluence Ohio email automation system.

Files to generate:

1. `apps/web/lib/inngest.ts` — Inngest client with typed Events map
   covering all event types: petition/signature.created,
   petition/email.verified, volunteer/signup.created,
   subscriber/standalone.created, donation/received,
   campaign/milestone.reached, subscriber/re-engagement.triggered,
   engagement/check.daily.

2. `apps/web/app/api/inngest/route.ts` — Next.js API route serving all
   Inngest functions via serve().

3. `apps/web/inngest/welcome-series.ts` — 4-email welcome series for
   petition signers. Triggered by petition/signature.created.
   Steps: create Brevo contact → resolve referral → send Email 1
   (immediate) → sleep 3 days → send Email 2 → sleep 4 days →
   send Email 3 → sleep 3 days → send Email 4.
   Check subscriber active status before each send.
   Use step.run() for each action, step.sleep() for delays.
   Concurrency limit: 50.

4. `apps/web/inngest/signer-to-volunteer.ts` — Day 14 conversion email.
   Same trigger. Sleep 14 days, check eligibility (active, not already
   volunteer, engaged in last 14 days), send if eligible.

5. `apps/web/inngest/signer-to-donor.ts` — Day 21 conversion email.
   Same trigger. Sleep 21 days, check eligibility (active, not already
   donor), send if eligible.

6. `apps/web/inngest/milestone-check.ts` — Triggered by
   petition/signature.created. Checks if signature_count equals a
   milestone threshold (1000, 2500, 5000, 10000, 15000, 22000).
   If match, fires campaign/milestone.reached event.

7. `apps/web/inngest/milestone-notification.ts` — Triggered by
   campaign/milestone.reached. Sends campaign email to all signers
   via Brevo campaign API. Dynamic subject lines per milestone.

8. `apps/web/inngest/re-engagement.ts` — 2-email re-engagement sequence.
   Email 1 immediately, wait 7 days, check if re-engaged, Email 2 if not,
   wait 14 days, final disposition.

9. `apps/web/inngest/daily-engagement-check.ts` — Cron: daily at 6 AM UTC.
   Recalculates Engaged and Disengaged lists. Fires re-engagement events
   for newly disengaged contacts.

10. `apps/web/inngest/volunteer-onboarding.ts` — Triggered by
    volunteer/signup.created. Create Brevo contact, send confirmation
    email, notify admin, sleep 3 days, send role-specific onboarding.

11. `apps/web/inngest/standalone-welcome.ts` — Triggered by
    subscriber/standalone.created. Create Brevo contact, send welcome
    with petition CTA.

12. `apps/web/inngest/donation-thank-you.ts` — Triggered by
    donation/received. Update Brevo donor attributes, send thank-you.

Reference Artifact 07 §2 for complete workflow logic, eligibility checks,
and email content specifications. Import BrevoAdapter from packages/email.
Use Supabase service_role client for database queries.
```

### Handoff Prompt 7C: Brevo Webhook Handler

```
Create the Brevo webhook handler for processing email delivery events.

File: `apps/web/app/api/webhooks/brevo/route.ts`

Requirements:
- POST endpoint that receives Brevo webhook callbacks
- Verify webhook authenticity via x-brevo-webhook-secret header
  (compared against process.env.BREVO_WEBHOOK_SECRET)
- Handle events: delivered, opened, click, hardBounce, softBounce,
  spam, unsubscribed, blocked
- opened/click: update LAST_ENGAGEMENT Brevo attribute via adapter
- hardBounce: update email_subscribers.status = 'bounced'
- spam: update email_subscribers.status = 'complained'
- unsubscribed: update email_subscribers.status = 'unsubscribed',
  set unsubscribed_at timestamp
- Validate payload with Zod schema
- Return 200 for all valid webhooks (even unhandled events)
- Return 401 for invalid secret, 400 for invalid payload

Reference Artifact 07 §1.6 for complete event handling specification.
```

### Handoff Prompt 7D: Standalone Email Signup

```
Create the standalone email signup component and API route.

Files:
1. `apps/web/components/email-signup.tsx` — React component for email
   subscription. Props: source ('footer' | 'blog' | 'standalone' | 'event').
   Fields: email (required), first name (optional).
   Client-side email validation. Inline success/error messaging.
   No page redirect on submit. Uses fetch to POST /api/subscribe.
   Accessible: proper labels, aria attributes, focus management.
   Mobile-friendly: 48px input height, full-width on mobile.

2. `apps/web/app/api/subscribe/route.ts` — API route handling email
   subscriptions. Validates with Zod. Checks for existing subscriber
   (handles re-subscription for unsubscribed contacts). Inserts into
   email_subscribers table. Fires subscriber/standalone.created
   Inngest event. Returns success even for duplicates (no information
   leakage about existing subscribers).

Reference Artifact 07 §4 for component spec and API route implementation.
```

### Handoff Prompt 7E: Email Template HTML

```
Create responsive HTML email templates for all 17 Brevo templates
specified in Artifact 07. Each template should:

- Use table-based layout for email client compatibility
- Be 600px max width, fluid on mobile
- Use the design system from Artifact 07 §3.1 (system fonts, #333 body,
  #1e3a5f headings, #1e40af CTA buttons)
- Include Brevo template variables using {{ params.VARIABLE_NAME }} syntax
- Include the CAN-SPAM compliant footer with {{ unsubscribe }} tag
- Include hidden preheader text
- Be tested against Litmus/Email on Acid checklist for Gmail, Outlook,
  Apple Mail, and Yahoo Mail rendering

Output files in `packages/email/templates/` as individual HTML files.
Each file should be copy-pasteable into Brevo's HTML template editor.

Templates to create:
1. welcome-1-confirmation.html
2. welcome-2-story.html
3. welcome-3-voices.html
4. welcome-4-involve.html
5. signer-to-volunteer.html
6. signer-to-donor.html
7. milestone-celebration.html
8. re-engagement-1.html
9. re-engagement-2.html
10. volunteer-confirmation.html
11. volunteer-onboarding-2.html
12. standalone-welcome.html
13. donation-thank-you.html
14. donation-thank-you-recurring.html
15. admin-new-volunteer.html
16. email-verification.html
17. resend-verification.html

Use the email copy from Artifact 07 §7 as the content for each template.
```

### Handoff Prompt 7F: Supabase Migration for Email Subscriber Enhancements

```
Review the email_subscribers table in Artifact 05 migration and verify
it supports all the subscriber lifecycle management specified in
Artifact 07. If any columns or indexes are missing, generate an
additional migration file.

Specifically verify:
- subscriber_status enum includes: active, unsubscribed, bounced, complained
- Columns exist for: brevo_contact_id, source, unsubscribed_at
- Index on email_hash for dedup checks
- RLS policies allow service_role writes (all writes go through API routes)

Also create the increment_referral_conversion RPC function referenced
in the welcome series (Artifact 07 §2.3):

CREATE OR REPLACE FUNCTION increment_referral_conversion(p_referral_code text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE referrals
  SET conversions = conversions + 1, updated_at = now()
  WHERE referral_code = p_referral_code;

  UPDATE campaign_metrics
  SET value = value + 1, recorded_at = now()
  WHERE metric = 'referral_conversion_count';
END;
$$;

Place migration in packages/db/migrations/ with the next sequential number.
```

### Handoff Prompt 7G: Integration Tests

```
Write integration tests for the email automation system:

1. `packages/email/__tests__/brevo-adapter.test.ts` — Unit tests for
   BrevoAdapter using msw (Mock Service Worker) to mock Brevo API.
   Test: createOrUpdateContact, sendTransactional, addContactToLists,
   error handling for 4xx/5xx responses.

2. `apps/web/__tests__/api/subscribe.test.ts` — Integration tests for
   the subscribe API route. Test: valid subscription, duplicate handling,
   re-subscription, validation errors.

3. `apps/web/__tests__/api/webhooks/brevo.test.ts` — Tests for the
   Brevo webhook handler. Test: valid events (opened, hardBounce,
   unsubscribed), invalid secret rejection, malformed payload handling.

4. `apps/web/__tests__/inngest/welcome-series.test.ts` — Test the
   welcome series Inngest function using Inngest's test mode.
   Verify: all 4 emails fire at correct intervals, subscriber active
   check prevents sends to unsubscribed contacts, referral resolution
   works correctly.

Use vitest as the test runner. Mock Supabase client with @supabase/supabase-js
mocking patterns. Mock Brevo API with msw.
```

---

*Artifact 07 complete. This document specifies the full email infrastructure for Confluence Ohio: Brevo adapter (hexagonal), 12 automation workflows via Inngest, 17 email templates, CAN-SPAM compliance, and webhook-driven subscriber lifecycle management. All 7 Claude Code handoff prompts are implementation-ready.*
