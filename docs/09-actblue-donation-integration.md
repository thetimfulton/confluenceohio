# Artifact 09: ActBlue Donation Integration

**Dependencies:** Artifact 02 (donate page spec), Artifact 05 (donations table), Artifact 07 (donation/received event + Inngest workflow)

**Produced by:** Prompt 9 from the Confluence Ohio Cowork Plan

---

## Resolved Questions

1. **ActBlue form slug.** ✅ Confirmed: `https://secure.actblue.com/donate/confluence`. All URLs and env defaults in this spec use this slug.

2. **Webhook payload verification.** ⏳ The payload structure in §2 is reconstructed from Klaviyo/ActionKit integration docs, the embed JS API contribution object, and ActBlue CSV field names. Fields marked `[VERIFY]` must be confirmed against ActBlue's authenticated webhook docs at `secure.actblue.com/docs/webhooks` before implementation. **This is bundled into the pre-Claude-Code checklist in §12.**

3. **Embed token.** ⏳ Tim needs to generate a `data-ab-token` from the ActBlue dashboard ("Generate embed" modal) for the `confluence` form. **Bundled into the pre-Claude-Code checklist in §12.**

4. **501(c)(4) compliance.** ✅ Confirmed: ActBlue entity is set to 501(c)(4). No FEC filing required; Ohio disclosure requirements under ORC §3517 may still apply.

5. **Refund/cancellation webhooks.** ✅ Deferred to Phase 2. Launch uses manual reconciliation via the ActBlue dashboard.

---

## 1. Integration Architecture

### 1.1 Integration Method: Hybrid Embed + Link

The donate page (`/donate`) uses ActBlue's **embeddable form** for an on-site experience, with a **direct link fallback** for progressive enhancement and use across email/social CTAs.

```
┌─────────────────────────────────────────────────────────────────┐
│                        /donate page                             │
│                                                                 │
│  ┌──────────────┐   ┌────────────────────────────────────────┐  │
│  │  Why Donate   │   │  ActBlue Embed (iframe)               │  │
│  │  Impact Grid  │   │  ┌──────────────────────────────────┐ │  │
│  │  Transparency │   │  │  Amount buttons: $5–$100+Other  │ │  │
│  │               │   │  │  Donor info fields               │ │  │
│  │               │   │  │  Payment (card / Express Lane)   │ │  │
│  │               │   │  │  Submit                          │ │  │
│  │               │   │  └──────────────────────────────────┘ │  │
│  └──────────────┘   └────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Fallback: "Prefer to donate on ActBlue directly?"          ││
│  │  → https://secure.actblue.com/donate/confluence?ref=... ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ onContribute callback              │ ActBlue processes payment
         ▼                                    ▼
  Client-side analytics event          ActBlue Webhook (POST)
  (PostHog: donate_initiated)          → /api/webhooks/actblue
                                              │
                                              ▼
                                       Insert → donations table
                                       Fire → donation/received (Inngest)
                                              │
                                              ▼
                                       Brevo: update donor attrs + thank-you email
```

**Why hybrid, not link-only:**

- Embedded forms keep donors on-site, reducing drop-off from the redirect. ActBlue's Express Lane (14M+ saved profiles) makes embedded donations 1-tap for returning donors.
- The embed provides client-side callbacks (`onContribute`, `onComplete`) that enable immediate thank-you UX and analytics without waiting for the webhook round-trip.
- Fallback link ensures the donation path works when JavaScript is disabled or the embed fails to load (progressive enhancement principle from Artifact 02).

**Why not link-only:**

Link-only is simpler but loses the on-site experience entirely. Every click to an external domain is a conversion leak. The embed is worth the implementation cost for a campaign where donation conversion directly funds petition collection.

### 1.2 ActBlue Form Configuration

Configure in the ActBlue dashboard:

| Setting | Value | Notes |
|---------|-------|-------|
| Form name/slug | `confluence` | URL: `secure.actblue.com/donate/confluence` |
| Entity type | 501(c)(4) | Not a candidate committee — different disclaimer rules |
| Suggested amounts | $5, $10, $25, $50, $100 | Match Artifact 04 copy; "Other" always available |
| Default amount | $25 | Middle of range; highest expected conversion × value |
| Recurring option | Donor's choice | Don't force recurring — let donors opt in |
| Express Lane | Enabled | 14M+ saved payment profiles = fewer fields for returning donors |
| Allowed embed URLs | `confluenceohio.org`, `www.confluenceohio.org`, `localhost:3000` | HTTPS required; add staging URL when available |
| Thank-you redirect | None | We handle post-donation UX via embed callbacks + webhook |
| Webhook | Enabled (see §2) | Contributions webhook to our endpoint |

### 1.3 Processing Fee

ActBlue charges a **3.95% processing fee** on all transactions, deducted before disbursement. This fee covers credit card processing — it is not an ActBlue platform fee. Donors see a checkbox option to cover the processing fee ("Add $X.XX to cover processing costs"), which ActBlue handles natively.

No action needed on our side for fee handling. The `amount_cents` in the webhook payload is the gross donation amount before fee deduction. ActBlue handles fee math and disbursement.

---

## 2. ActBlue Webhook Processing

### 2.1 Webhook Setup

**Dashboard configuration:**

1. Go to ActBlue Dashboard → Settings → Webhooks
2. Add webhook endpoint: `https://confluenceohio.org/api/webhooks/actblue`
3. Set authentication: HTTP Basic Auth with a strong random username/password
4. Enable webhook type: **Contributions** (default)
5. Optionally enable: **Refunds**, **Cancellations** (Phase 2)

**Authentication:** ActBlue uses HTTP Basic Authentication. The webhook request includes an `Authorization: Basic <base64(username:password)>` header. Our endpoint validates against `ACTBLUE_WEBHOOK_USERNAME` and `ACTBLUE_WEBHOOK_PASSWORD` environment variables.

### 2.2 Webhook Payload Schema

ActBlue sends a `POST` request with `Content-Type: application/json`. The payload structure below is reconstructed from ActBlue integration partner documentation and the embed contribution object. **Fields marked [VERIFY] must be confirmed against ActBlue's authenticated webhook docs before implementation.**

```typescript
// packages/core/donations/actblue-webhook.types.ts

/**
 * ActBlue webhook payload for contribution events.
 * 
 * IMPORTANT: Verify all [VERIFY] field names against ActBlue's official 
 * webhook documentation at secure.actblue.com/docs/webhooks before 
 * implementing the parser. Field names are reconstructed from integration 
 * partner docs and may differ slightly.
 */

export interface ActBlueContributor {
  firstname: string;           // [VERIFY] Donor first name
  lastname: string;            // [VERIFY] Donor last name
  email: string;               // Donor email address
  phone?: string;              // Donor phone (if provided)
  addr1?: string;              // Street address line 1
  addr2?: string;              // Street address line 2
  city?: string;               // City
  state?: string;              // State abbreviation
  zip?: string;                // ZIP code
  country?: string;            // Country code
  employerName?: string;       // [VERIFY] Employer name (FEC/compliance)
  occupation?: string;         // [VERIFY] Occupation (FEC/compliance)
  isEligibleForExpressLane: boolean; // [VERIFY] Express Lane user
}

export interface ActBlueLineItem {
  sequence: number;            // [VERIFY] Line item index
  entityId: number;            // [VERIFY] Recipient entity ID
  fecId?: string;              // [VERIFY] FEC committee ID (if applicable)
  committeeName: string;       // [VERIFY] Receiving committee/org name
  amount: string;              // [VERIFY] Dollar amount as string, e.g. "25.00"
  paidAt: string;              // [VERIFY] ISO 8601 timestamp
  recurringPeriod?: string;    // [VERIFY] "once" | "monthly" | "weekly"
  recurringDuration?: number;  // [VERIFY] Number of recurrences (0 = indefinite)
}

export interface ActBlueWebhookPayload {
  donor: ActBlueContributor;   // [VERIFY] Top-level key name
  orderNumber: string;         // [VERIFY] ActBlue order/receipt ID
  contribution: {              // [VERIFY] Top-level key name
    createdAt: string;         // [VERIFY] ISO 8601 timestamp
    refcode?: string;          // Refcode from URL parameter
    refcode2?: string;         // Secondary refcode
  };
  lineitems: ActBlueLineItem[]; // [VERIFY] Array of line items (usually 1 for single-entity forms)
}
```

### 2.3 Webhook Handler

```typescript
// apps/web/app/api/webhooks/actblue/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { inngest } from '@/inngest/client';
import { createServiceClient } from '@/lib/supabase/service';

// ─── Basic Auth Verification ────────────────────────────────────

function verifyBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) return false;

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [username, password] = decoded.split(':');

  return (
    username === process.env.ACTBLUE_WEBHOOK_USERNAME &&
    password === process.env.ACTBLUE_WEBHOOK_PASSWORD
  );
}

// ─── Zod Schema ─────────────────────────────────────────────────
// IMPORTANT: Update field names after verifying against ActBlue docs

const contributorSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  addr1: z.string().optional(),
  addr2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  employerName: z.string().optional(),
  occupation: z.string().optional(),
  isEligibleForExpressLane: z.boolean().default(false),
});

const lineItemSchema = z.object({
  sequence: z.number().optional(),
  entityId: z.number().optional(),
  fecId: z.string().optional(),
  committeeName: z.string().optional(),
  amount: z.string(), // "25.00" — ActBlue sends amounts as strings
  paidAt: z.string(),
  recurringPeriod: z.string().optional(),
  recurringDuration: z.number().optional(),
});

const webhookPayloadSchema = z.object({
  donor: contributorSchema,
  orderNumber: z.string(),
  contribution: z.object({
    createdAt: z.string(),
    refcode: z.string().optional(),
    refcode2: z.string().optional(),
  }),
  lineitems: z.array(lineItemSchema).min(1),
});

// ─── Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Verify Basic Auth
  if (!verifyBasicAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate payload
  let payload: z.infer<typeof webhookPayloadSchema>;
  try {
    const body = await request.json();
    payload = webhookPayloadSchema.parse(body);
  } catch (error) {
    console.error('[ActBlue Webhook] Invalid payload:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // 3. Idempotency check via payload hash
  const rawBody = JSON.stringify(payload);
  const payloadHash = createHash('sha256').update(rawBody).digest('hex');

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('donations')
    .select('id')
    .eq('actblue_order_id', payload.orderNumber)
    .maybeSingle();

  if (existing) {
    // Already processed — return 200 to prevent ActBlue retries
    return NextResponse.json({ status: 'already_processed' });
  }

  // 4. Extract donation data from first line item
  const lineItem = payload.lineitems[0];
  const amountCents = Math.round(parseFloat(lineItem.amount) * 100);
  const recurring = lineItem.recurringPeriod !== undefined
    && lineItem.recurringPeriod !== 'once';
  const donorName = `${payload.donor.firstname} ${payload.donor.lastname}`.trim();

  // 5. Insert into donations table
  const { error: insertError } = await supabase
    .from('donations')
    .insert({
      actblue_order_id: payload.orderNumber,
      donor_email: payload.donor.email,
      donor_name: donorName,
      amount_cents: amountCents,
      recurring,
      refcode: payload.contribution.refcode ?? null,
      refcode2: payload.contribution.refcode2 ?? null,
      express_lane: payload.donor.isEligibleForExpressLane,
      line_items: payload.lineitems,
      donated_at: lineItem.paidAt,
      webhook_payload_hash: payloadHash,
    });

  if (insertError) {
    console.error('[ActBlue Webhook] Insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to process donation' },
      { status: 500 }
    );
  }

  // 6. Fire Inngest event for downstream processing
  //    (thank-you email, Brevo donor attribute update — see Artifact 07 §2.10)
  await inngest.send({
    name: 'donation/received',
    data: {
      email: payload.donor.email,
      donorName,
      amountCents,
      recurring,
      refcode: payload.contribution.refcode,
      orderNumber: payload.orderNumber,
    },
  });

  return NextResponse.json({ status: 'ok' });
}
```

### 2.4 Idempotency Strategy

ActBlue may retry webhook deliveries on timeout or non-2xx responses. Our idempotency approach:

1. **Primary check:** `UNIQUE` constraint on `actblue_order_id` in the `donations` table (from Artifact 05). Duplicate inserts fail at the database level.
2. **Pre-insert check:** Query for existing `actblue_order_id` before attempting insert. This avoids triggering the `on_donation_insert` metrics update trigger on a failed duplicate insert.
3. **Payload hash:** Stored for audit/debugging. Not used for dedup (order ID is the canonical key).
4. **Return 200 for duplicates:** Prevents ActBlue from retrying already-processed donations.

### 2.5 Error Handling

| Scenario | Response | ActBlue behavior |
|----------|----------|------------------|
| Invalid Basic Auth | 401 | Retries (check logs — likely misconfigured credentials) |
| Malformed JSON / schema validation fails | 400 | Retries — investigate if persistent |
| Duplicate order ID | 200 `{status: "already_processed"}` | Stops retrying |
| Database insert failure | 500 | Retries — alert on repeated failures |
| Inngest send failure | Still returns 200 | Donation is recorded; email delivery retried via Inngest's own retry mechanism |
| Successful processing | 200 `{status: "ok"}` | No retry |

**Design decision:** The webhook handler returns 200 even if the Inngest event fails to send, because the donation record is already persisted. Inngest event delivery is retried independently. This prevents a transient Inngest outage from causing ActBlue to re-send (and potentially re-insert) donations.

---

## 3. Refcode Strategy

### 3.1 Refcode Taxonomy

Refcodes track donation attribution — where did the donor come from and which campaign prompted the donation?

| Parameter | Purpose | Naming convention | Examples |
|-----------|---------|-------------------|----------|
| `refcode` | Traffic source | `{location}_{context}` | `homepage_hero`, `petition_thankyou`, `email_welcome`, `email_day7_donate`, `social_facebook`, `social_twitter`, `blog_launch`, `volunteer_page` |
| `refcode2` | Campaign/experiment | `{campaign}_{variant}` | `launch_2026`, `milestone_10k`, `ab_test_urgency_a`, `ab_test_urgency_b`, `email_blast_apr26` |

**Refcode rules** (ActBlue constraint): Letters, numbers, and underscores only. No spaces or punctuation.

### 3.2 Refcode Application Points

Every link to ActBlue across the site and email includes both refcodes:

| Source | refcode | refcode2 | Implementation |
|--------|---------|----------|----------------|
| /donate page (embed) | `donate_page` | Current campaign | `data-ab-refcode` attribute or `actblue.configure()` |
| /donate page (fallback link) | `donate_page_fallback` | Current campaign | URL parameter |
| /sign/thank-you donate prompt | `petition_thankyou` | Current campaign | URL parameter on ActBlue link |
| Email: Signer Day 7 | `email_day7_donate` | Signer's referral code | Template variable in Brevo |
| Email: Volunteer Day 14 | `email_vol_day14` | — | Template variable |
| Email: Donation thank-you | — | — | N/A (already donated) |
| Mobile sticky bar | `mobile_sticky` | Current campaign | URL parameter |
| Blog post CTAs | `blog_{slug}` | Current campaign | Dynamic per-post |
| Social sharing | `social_{platform}` | Referrer's code | Pre-populated share URL |

### 3.3 Refcode Utility Function

```typescript
// packages/core/donations/refcode.ts

const ACTBLUE_FORM_URL = process.env.NEXT_PUBLIC_ACTBLUE_FORM_URL
  ?? 'https://secure.actblue.com/donate/confluence';

export interface ActBlueLinkOptions {
  refcode: string;
  refcode2?: string;
  amount?: number; // Pre-selected amount in dollars
  recurring?: boolean;
}

/**
 * Build an ActBlue donation URL with refcode tracking.
 * Used for fallback links, email CTAs, and social share URLs.
 */
export function buildActBlueUrl(options: ActBlueLinkOptions): string {
  const url = new URL(ACTBLUE_FORM_URL);
  url.searchParams.set('refcode', options.refcode);
  if (options.refcode2) {
    url.searchParams.set('refcode2', options.refcode2);
  }
  if (options.amount) {
    url.searchParams.set('amount', options.amount.toString());
  }
  if (options.recurring) {
    url.searchParams.set('recurring', 'true');
  }
  return url.toString();
}

/**
 * Validate a refcode string against ActBlue constraints.
 * Letters, numbers, and underscores only.
 */
export function isValidRefcode(refcode: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(refcode);
}
```

---

## 4. Donate Page Component

### 4.1 Page Structure

File: `apps/web/app/donate/page.tsx`

The page follows the layout specified in Artifact 02 §2.15 and uses the copy from Artifact 04 §11.

```
┌──────────────────────────────────────────────────────┐
│  Hero: "Fund the Future of Confluence"               │
│  Subhead: "Every dollar moves us closer..."          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │  Why Donate?     │  │  ActBlue Embed           │   │
│  │                  │  │  ┌────────────────────┐  │   │
│  │  Impact grid:    │  │  │ $5  $10  $25  $50  │  │   │
│  │  $5 = 25 flyers  │  │  │    $100   Other    │  │   │
│  │  $10 = 1 vol     │  │  │                    │  │   │
│  │  shift materials  │  │  │ [Donor fields]     │  │   │
│  │  $25 = 1 event   │  │  │ [Payment]          │  │   │
│  │  $50 = 1 wk dig  │  │  │ [Submit]           │  │   │
│  │  $100 = legal    │  │  └────────────────────┘  │   │
│  │                  │  │                          │   │
│  │  Make it monthly │  │  Fallback link ↓         │   │
│  └─────────────────┘  └──────────────────────────┘   │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Transparency section                                │
│  "We publish quarterly transparency reports..."      │
├──────────────────────────────────────────────────────┤
│  Petition CTA (for non-signers)                      │
│  "Haven't signed yet? Your signature is free."       │
└──────────────────────────────────────────────────────┘
```

### 4.2 ActBlue Embed Integration

```tsx
// apps/web/app/donate/components/ActBlueEmbed.tsx

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { trackEvent } from '@/lib/analytics';

interface ActBlueEmbedProps {
  refcode: string;
  refcode2?: string;
  amounts?: number[]; // in cents
  defaultAmount?: number; // in cents
}

declare global {
  interface Window {
    actblue?: {
      configure: (config: Record<string, unknown>) => void;
      addEventHandler: (event: string, callback: (data: unknown) => void) => void;
      remove: () => void;
    };
  }
}

export function ActBlueEmbed({
  refcode,
  refcode2,
  amounts = [500, 1000, 2500, 5000, 10000],
  defaultAmount = 2500,
}: ActBlueEmbedProps) {
  const embedRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  const handleContribute = useCallback((data: unknown) => {
    const contribution = data as {
      amount: number;
      email: string;
      order_number: string;
      recurring: boolean;
      refcode: string;
    };

    trackEvent('donate_completed', {
      amount_cents: contribution.amount,
      recurring: contribution.recurring,
      refcode: contribution.refcode,
      order_number: contribution.order_number,
      source: 'embed',
    });
  }, []);

  const handleComplete = useCallback(() => {
    trackEvent('donate_flow_complete', { source: 'embed' });
  }, []);

  const handleError = useCallback((error: unknown) => {
    trackEvent('donate_embed_error', { error: String(error) });
    console.error('[ActBlue Embed] Error:', error);
  }, []);

  useEffect(() => {
    // Load ActBlue script once
    if (!scriptLoaded.current) {
      const existingScript = document.querySelector(
        'script[src*="secure.actblue.com"]'
      );
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://secure.actblue.com/cf/assets/actblue.js';
        script.async = true;
        document.head.appendChild(script);
      }
      scriptLoaded.current = true;
    }

    // Configure when ActBlue JS is ready
    const configureEmbed = () => {
      if (window.actblue) {
        window.actblue.configure({
          amounts,
          amount: defaultAmount,
          refcodes: {
            refcode,
            ...(refcode2 ? { refcode2 } : {}),
          },
          onContribute: handleContribute,
          onComplete: handleComplete,
          onError: handleError,
        });
      }
    };

    // Poll for actblue global (script load is async)
    const interval = setInterval(() => {
      if (window.actblue) {
        configureEmbed();
        clearInterval(interval);
      }
    }, 100);

    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [refcode, refcode2, amounts, defaultAmount, handleContribute, handleComplete, handleError]);

  return (
    <div className="actblue-embed-wrapper">
      {/* ActBlue embed div — the actblue.js script renders the form here */}
      <div
        ref={embedRef}
        data-ab-form=""
        data-ab-token={process.env.NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN}
        data-ab-amounts={amounts.join(',')}
        data-ab-amount={defaultAmount.toString()}
        data-ab-other-amount="true"
        data-ab-height="auto"
        data-ab-refcode={refcode}
        data-ab-refcode2={refcode2}
        data-ab-preview={process.env.NODE_ENV === 'development' ? 'true' : undefined}
      />

      {/* Fallback for no-JS / embed failure */}
      <noscript>
        <a
          href={`${process.env.NEXT_PUBLIC_ACTBLUE_FORM_URL}?refcode=${refcode}${refcode2 ? `&refcode2=${refcode2}` : ''}`}
          className="actblue-fallback-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Donate via ActBlue →
        </a>
      </noscript>
    </div>
  );
}
```

### 4.3 Donate Page Server Component

```tsx
// apps/web/app/donate/page.tsx

import { Metadata } from 'next';
import { ActBlueEmbed } from './components/ActBlueEmbed';
import { buildActBlueUrl } from '@confluenceohio/core/donations/refcode';
import { PetitionCta } from '@/components/PetitionCta';

export const metadata: Metadata = {
  title: 'Donate — Confluence Ohio',
  description:
    'Fund the campaign to rename Columbus to Confluence, Ohio. Every dollar moves us closer to 22,000 signatures and a spot on the ballot.',
  openGraph: {
    title: 'Fund the Future of Confluence',
    description: 'Every dollar moves us closer to the ballot.',
    images: ['/og/donate.png'],
  },
};

const IMPACT_TIERS = [
  { amount: 5, label: 'Prints 25 petition flyers' },
  { amount: 10, label: 'Provides materials for one volunteer shift' },
  { amount: 25, label: 'Funds one community event' },
  { amount: 50, label: 'One week of targeted digital outreach' },
  { amount: 100, label: 'Covers legal filing costs for one month' },
] as const;

export default function DonatePage() {
  const fallbackUrl = buildActBlueUrl({
    refcode: 'donate_page_fallback',
  });

  return (
    <main>
      {/* ─── Hero ─── */}
      <section className="donate-hero" aria-labelledby="donate-heading">
        <h1 id="donate-heading">Fund the Future of Confluence</h1>
        <p className="donate-subhead">
          Every dollar moves us closer to 22,000 signatures and a spot on the ballot.
        </p>
      </section>

      {/* ─── Two-Column: Info + Embed ─── */}
      <section className="donate-content" aria-label="Donation information and form">
        <div className="donate-info">
          {/* Why Donate */}
          <h2>Why Donate?</h2>
          <p>
            Running a petition campaign takes resources: printing flyers, training
            volunteers, running digital outreach, hosting community events, covering
            legal costs, and keeping the lights on. Confluence Ohio is a 501(c)(4)
            civic organization funded entirely by individual donations. We do not
            take corporate money.
          </p>

          {/* Impact Grid */}
          <h2>How Your Money Is Used</h2>
          <div className="impact-grid" role="list">
            {IMPACT_TIERS.map(({ amount, label }) => (
              <div key={amount} className="impact-tier" role="listitem">
                <span className="impact-amount">${amount}</span>
                <span className="impact-label">{label}</span>
              </div>
            ))}
          </div>

          {/* Monthly pitch */}
          <div className="monthly-pitch">
            <h3>Make It Monthly</h3>
            <p>
              Sustaining donors keep the campaign running between big pushes.
              A $10/month commitment funds ongoing volunteer support and digital outreach.
            </p>
          </div>
        </div>

        {/* ActBlue Embed */}
        <div className="donate-form">
          <ActBlueEmbed refcode="donate_page" />

          {/* Fallback link */}
          <p className="donate-fallback">
            Prefer to donate on ActBlue directly?{' '}
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">
              Open donation form →
            </a>
          </p>
        </div>
      </section>

      {/* ─── Transparency ─── */}
      <section className="donate-transparency" aria-label="Financial transparency">
        <h2>Transparency</h2>
        <p>
          Confluence Ohio is a 501(c)(4) civic organization. We are committed to
          full transparency about how donations are used. Quarterly financial
          reports are published on our blog.
        </p>
      </section>

      {/* ─── Petition CTA (non-signers) ─── */}
      <PetitionCta
        variant="subtle"
        heading="Haven't signed yet?"
        body="Your signature is free — and it's the most important thing you can do."
      />
    </main>
  );
}
```

### 4.4 SEO and Open Graph

Per Artifact 02: The donate page is not heavily SEO-targeted (conversion comes via internal traffic, not search). Minimal meta:

| Tag | Value |
|-----|-------|
| `<title>` | `Donate — Confluence Ohio` |
| `meta description` | `Fund the campaign to rename Columbus to Confluence, Ohio. Every dollar moves us closer to 22,000 signatures and a spot on the ballot.` |
| `og:title` | `Fund the Future of Confluence` |
| `og:description` | `Every dollar moves us closer to the ballot.` |
| `og:image` | `/og/donate.png` — "Every Dollar Moves Us Closer to the Ballot" (per Artifact 02) |
| JSON-LD | None needed — donation pages don't benefit from structured data |

---

## 5. Donation Tracking Dashboard (Admin)

### 5.1 Admin Dashboard — Donations Tab

File: `apps/web/app/admin/donations/page.tsx`

The admin donation dashboard provides a read-only view of all donations received via ActBlue webhooks. It is accessible only to authenticated admin users (per Artifact 05 RLS: `admin_users` table).

### 5.2 Dashboard Layout

```
┌──────────────────────────────────────────────────────────┐
│  Donations                                    [Export CSV]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ Total      │  │ Donors     │  │ Average    │         │
│  │ $4,285.00  │  │ 127        │  │ $33.74     │         │
│  │ ↑ 12% 7d   │  │ ↑ 8% 7d   │  │ ↑ 3% 7d   │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ Recurring  │  │ Express    │  │ This Week  │         │
│  │ 23 donors  │  │ Lane 41%   │  │ $680.00    │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Refcode Performance                                     │
│  ┌─────────────────────┬────────┬──────────┬───────────┐ │
│  │ Refcode             │ Count  │ Total    │ Avg       │ │
│  ├─────────────────────┼────────┼──────────┼───────────┤ │
│  │ petition_thankyou   │ 42     │ $1,450   │ $34.52    │ │
│  │ email_day7_donate   │ 31     │ $980     │ $31.61    │ │
│  │ donate_page         │ 28     │ $1,120   │ $40.00    │ │
│  │ homepage_hero       │ 15     │ $425     │ $28.33    │ │
│  │ (no refcode)        │ 11     │ $310     │ $28.18    │ │
│  └─────────────────────┴────────┴──────────┴───────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Recent Donations                    [Filter] [Date Range]│
│  ┌────────────────────────────────────────────────────┐  │
│  │ Date       │ Donor        │ Amount │ Recurring │ Ref│  │
│  ├────────────┼──────────────┼────────┼───────────┼────┤  │
│  │ Apr 10     │ J. Smith     │ $50.00 │ Monthly   │ pt │  │
│  │ Apr 10     │ M. Johnson   │ $25.00 │ One-time  │ dp │  │
│  │ Apr 9      │ A. Williams  │ $10.00 │ One-time  │ e7 │  │
│  │ ...        │              │        │           │    │  │
│  └────────────┴──────────────┴────────┴───────────┴────┘  │
│                                      [← Prev] [Next →]   │
└──────────────────────────────────────────────────────────┘
```

### 5.3 Dashboard Queries

```typescript
// apps/web/app/admin/donations/queries.ts

import { createServiceClient } from '@/lib/supabase/service';

export interface DonationMetrics {
  totalCents: number;
  donorCount: number;
  averageCents: number;
  recurringCount: number;
  expressLaneCount: number;
  totalCount: number;
  periodTotalCents: number; // Current period (7d default)
  periodPriorCents: number; // Prior period for trend calculation
}

export async function getDonationMetrics(
  periodDays: number = 7
): Promise<DonationMetrics> {
  const supabase = createServiceClient();
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 86400000);
  const priorStart = new Date(periodStart.getTime() - periodDays * 86400000);

  // All-time metrics
  const { data: allTime } = await supabase
    .from('donations')
    .select('amount_cents, recurring, express_lane, donor_email');

  if (!allTime || allTime.length === 0) {
    return {
      totalCents: 0, donorCount: 0, averageCents: 0,
      recurringCount: 0, expressLaneCount: 0, totalCount: 0,
      periodTotalCents: 0, periodPriorCents: 0,
    };
  }

  const totalCents = allTime.reduce((sum, d) => sum + d.amount_cents, 0);
  const uniqueDonors = new Set(allTime.map((d) => d.donor_email)).size;
  const recurringCount = allTime.filter((d) => d.recurring).length;
  const expressLaneCount = allTime.filter((d) => d.express_lane).length;

  // Current period
  const { data: currentPeriod } = await supabase
    .from('donations')
    .select('amount_cents')
    .gte('donated_at', periodStart.toISOString());

  // Prior period (for trend)
  const { data: priorPeriod } = await supabase
    .from('donations')
    .select('amount_cents')
    .gte('donated_at', priorStart.toISOString())
    .lt('donated_at', periodStart.toISOString());

  return {
    totalCents,
    donorCount: uniqueDonors,
    averageCents: Math.round(totalCents / allTime.length),
    recurringCount,
    expressLaneCount,
    totalCount: allTime.length,
    periodTotalCents: currentPeriod?.reduce((s, d) => s + d.amount_cents, 0) ?? 0,
    periodPriorCents: priorPeriod?.reduce((s, d) => s + d.amount_cents, 0) ?? 0,
  };
}

export interface RefcodePerformance {
  refcode: string;
  count: number;
  totalCents: number;
  averageCents: number;
}

export async function getRefcodePerformance(): Promise<RefcodePerformance[]> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('donations')
    .select('refcode, amount_cents');

  if (!data) return [];

  const byRefcode = new Map<string, { count: number; total: number }>();

  for (const donation of data) {
    const key = donation.refcode ?? '(no refcode)';
    const existing = byRefcode.get(key) ?? { count: 0, total: 0 };
    byRefcode.set(key, {
      count: existing.count + 1,
      total: existing.total + donation.amount_cents,
    });
  }

  return Array.from(byRefcode.entries())
    .map(([refcode, { count, total }]) => ({
      refcode,
      count,
      totalCents: total,
      averageCents: Math.round(total / count),
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export interface DonationListItem {
  id: string;
  donorName: string | null;
  amountCents: number;
  recurring: boolean;
  refcode: string | null;
  donatedAt: string;
  expressLane: boolean;
}

export async function getDonationList(
  page: number = 1,
  pageSize: number = 25
): Promise<{ donations: DonationListItem[]; total: number }> {
  const supabase = createServiceClient();
  const from = (page - 1) * pageSize;

  const { data, count } = await supabase
    .from('donations')
    .select('id, donor_name, amount_cents, recurring, refcode, donated_at, express_lane', {
      count: 'exact',
    })
    .order('donated_at', { ascending: false })
    .range(from, from + pageSize - 1);

  return {
    donations: (data ?? []).map((d) => ({
      id: d.id,
      donorName: d.donor_name,
      amountCents: d.amount_cents,
      recurring: d.recurring,
      refcode: d.refcode,
      donatedAt: d.donated_at,
      expressLane: d.express_lane,
    })),
    total: count ?? 0,
  };
}
```

### 5.4 CSV Export

The admin dashboard includes a "Export CSV" button that downloads all donations as a CSV file for reconciliation with ActBlue's own reporting. This is a simple server action:

```typescript
// apps/web/app/admin/donations/actions.ts
'use server';

import { createServiceClient } from '@/lib/supabase/service';

export async function exportDonationsCsv(): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('donations')
    .select('*')
    .order('donated_at', { ascending: false });

  if (!data || data.length === 0) return '';

  const headers = [
    'Date', 'ActBlue Order ID', 'Donor Name', 'Donor Email',
    'Amount', 'Recurring', 'Refcode', 'Refcode2', 'Express Lane',
  ];

  const rows = data.map((d) => [
    new Date(d.donated_at).toISOString().split('T')[0],
    d.actblue_order_id,
    d.donor_name ?? '',
    d.donor_email ?? '',
    `$${(d.amount_cents / 100).toFixed(2)}`,
    d.recurring ? 'Yes' : 'No',
    d.refcode ?? '',
    d.refcode2 ?? '',
    d.express_lane ? 'Yes' : 'No',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
```

---

## 6. Analytics Events

### 6.1 Donation Funnel Events

These events integrate with the analytics system designed in Prompt 13 (forthcoming). For now, define the event shapes:

| Event | Trigger | Properties | Source |
|-------|---------|------------|--------|
| `donate_page_view` | Page load on /donate | `refcode`, `refcode2`, `source` (internal/external) | Server component |
| `donate_embed_loaded` | ActBlue embed `onLanded` callback | `embedId` | Client embed |
| `donate_initiated` | User interacts with embed | `amount_cents` (if available) | Client embed |
| `donate_completed` | ActBlue `onContribute` callback | `amount_cents`, `recurring`, `refcode`, `order_number`, `source: "embed"` | Client embed |
| `donate_flow_complete` | ActBlue `onComplete` callback (after upsells) | `source: "embed"` | Client embed |
| `donate_embed_error` | ActBlue `onError` callback | `error` | Client embed |
| `donate_fallback_click` | Click on "donate on ActBlue directly" link | `refcode`, `refcode2` | Client link handler |
| `donate_cta_click` | Click on any donate CTA across the site | `location` (e.g., "thank_you_page", "mobile_sticky") | Client link handler |
| `webhook_received` | ActBlue webhook processed | `amount_cents`, `recurring`, `refcode` | Webhook handler |

### 6.2 Donation Funnel Definition

```
donate_page_view → donate_embed_loaded → donate_initiated → donate_completed
                                                                    ↓
                                                          webhook_received
```

**Key metric:** `donate_page_view` → `donate_completed` conversion rate. Target: 5–10% for internal traffic (supporters who already signed the petition), 1–3% for cold traffic.

---

## 7. Environment Variables

Add these to the existing `.env.local` (supplementing Artifact 05 and 07 env vars):

```bash
# ─── ActBlue ─────────────────────────────────────────────
# Public: used in client-side embed
NEXT_PUBLIC_ACTBLUE_FORM_URL=https://secure.actblue.com/donate/confluence
NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN=                # Generate from ActBlue dashboard

# Secret: used in webhook handler (server-side only)
ACTBLUE_WEBHOOK_USERNAME=                       # Random string for Basic Auth
ACTBLUE_WEBHOOK_PASSWORD=                       # Random string for Basic Auth
```

---

## 8. Security Considerations

1. **Basic Auth credentials** are generated as random strings (minimum 32 characters) and stored only in environment variables. Never commit to version control.

2. **No PII logging.** The webhook handler logs errors but never logs donor email, name, or payment details. The `console.error` in the handler logs only the error object, not the payload.

3. **Idempotency** via unique constraint on `actblue_order_id` prevents duplicate donation records from webhook retries.

4. **RLS enforcement.** The `donations` table has admin-only read access per Artifact 05. No public-facing queries ever touch this table.

5. **Service client only.** The webhook handler uses `createServiceClient()` (service role key) to bypass RLS for the insert. This key is server-side only and never exposed to the client.

6. **Rate limiting.** The webhook endpoint should be excluded from general Turnstile protection (ActBlue can't solve CAPTCHAs), but should have basic rate limiting (e.g., 100 requests/minute) to prevent abuse. This is handled at the Vercel/Cloudflare layer.

7. **HTTPS only.** ActBlue embeds require HTTPS. The webhook endpoint must also be HTTPS (standard for Vercel deployments).

---

## 9. Testing Strategy

### 9.1 Webhook Handler Tests

```typescript
// apps/web/__tests__/api/webhooks/actblue.test.ts

describe('POST /api/webhooks/actblue', () => {
  // Auth tests
  it('rejects requests without auth header', async () => { /* 401 */ });
  it('rejects requests with invalid credentials', async () => { /* 401 */ });
  it('accepts requests with valid Basic Auth', async () => { /* 200 */ });

  // Payload validation
  it('rejects malformed JSON', async () => { /* 400 */ });
  it('rejects payload missing required fields', async () => { /* 400 */ });
  it('accepts valid payload and inserts donation', async () => { /* 200 */ });

  // Idempotency
  it('returns 200 for duplicate order IDs without re-inserting', async () => {
    // Send same payload twice → second returns {status: "already_processed"}
    // Verify donations table has only one row
  });

  // Data mapping
  it('correctly parses amount from string to cents', async () => {
    // "25.00" → 2500
  });
  it('correctly identifies recurring donations', async () => {
    // recurringPeriod: "monthly" → recurring: true
    // recurringPeriod: "once" → recurring: false
    // recurringPeriod: undefined → recurring: false
  });
  it('fires Inngest donation/received event with correct data', async () => {
    // Verify inngest.send() called with expected shape
  });

  // Edge cases
  it('handles missing refcode gracefully', async () => { /* null refcode */ });
  it('handles Express Lane donors correctly', async () => { /* express_lane: true */ });
  it('returns 200 even if Inngest send fails', async () => {
    // Mock Inngest to throw → still returns 200
    // Donation is still in database
  });
});
```

### 9.2 Embed Component Tests

```typescript
// apps/web/__tests__/donate/ActBlueEmbed.test.tsx

describe('ActBlueEmbed', () => {
  it('renders embed div with correct data attributes', () => {});
  it('loads ActBlue script tag once', () => {});
  it('renders noscript fallback link', () => {});
  it('sets preview mode in development', () => {});
  it('passes refcodes to embed configuration', () => {});
});
```

### 9.3 Integration Testing with ActBlue

ActBlue's embed provides a `data-ab-preview="true"` mode that disables actual payment processing. Development testing workflow:

1. Set `data-ab-preview="true"` (automatic when `NODE_ENV === 'development'`)
2. Embed form renders and accepts test input without charging
3. `onContribute` callback fires with simulated data
4. For webhook testing: send test POST requests to `/api/webhooks/actblue` with sample payloads matching the schema

---

## 10. Downstream Integration Summary

This artifact connects to other artifacts at these points:

| Artifact | Integration point | Direction |
|----------|-------------------|-----------|
| 02 (Architecture) | `/donate` page spec, post-signature donate prompt | Implements |
| 04 (Copy) | Donate page copy, impact tier amounts | Uses |
| 05 (Data Model) | `donations` table, `campaign_metrics` trigger | Writes to |
| 07 (Email) | `donation/received` Inngest event → donation-thank-you workflow | Fires event |
| 07 (Email) | Brevo DONOR attribute, BREVO_LIST_DONORS | Updated by Inngest workflow |
| 07 (Email) | Signer Day 7 email: donation eligibility check queries `donations` table | Read by |
| 11 (Social Sharing) | Refcode2 carries referrer code for donation attribution | Produces |
| 13 (Analytics) | Donation funnel events defined in §6 | Feeds into |
| 15 (Admin) | Donation dashboard queries and components | Provides |

---

## 11. Claude Code Handoff

### Handoff Prompt 1: ActBlue Webhook Handler

```
Create the ActBlue webhook handler for processing donation webhooks.

File: `apps/web/app/api/webhooks/actblue/route.ts`

Requirements:
- POST endpoint that receives ActBlue webhook callbacks
- Verify HTTP Basic Authentication via Authorization header
  (compare against ACTBLUE_WEBHOOK_USERNAME and ACTBLUE_WEBHOOK_PASSWORD
  environment variables)
- Parse JSON payload with Zod validation. Schema defined in
  `packages/core/donations/actblue-webhook.types.ts` — import the types
  from there. IMPORTANT: The exact field names in the ActBlue payload
  must be verified against ActBlue's official webhook docs at
  secure.actblue.com/docs/webhooks before finalizing the schema.
- Idempotency: check for existing actblue_order_id before insert.
  Return 200 with {status: "already_processed"} for duplicates.
- Parse amount from string ("25.00") to integer cents (2500).
- Determine recurring status from lineItem.recurringPeriod:
  "monthly"/"weekly" = true, "once"/undefined = false.
- Insert into donations table using Supabase service client.
- Fire Inngest event 'donation/received' with shape:
  { email, donorName, amountCents, recurring, refcode, orderNumber }
  This event triggers the donation-thank-you workflow from Artifact 07.
- Return 200 even if Inngest send fails (donation is already persisted).
- Return 401 for invalid auth, 400 for invalid payload, 500 for DB errors.
- Never log PII (donor email, name, payment details).
- No Turnstile/CAPTCHA on this endpoint (ActBlue sends webhooks).

Reference: Artifact 09 §2.3 for full implementation.
Reference: Artifact 05 §3.5 for donations table schema.
Reference: Artifact 07 §2.10 for the Inngest event shape.
```

### Handoff Prompt 2: ActBlue Webhook Types

```
Create the ActBlue webhook type definitions and Zod schemas.

File: `packages/core/donations/actblue-webhook.types.ts`

Requirements:
- TypeScript interfaces for ActBlueContributor, ActBlueLineItem,
  ActBlueWebhookPayload (see Artifact 09 §2.2 for full definitions).
- Matching Zod schemas for runtime validation.
- Export both types and schemas.

IMPORTANT: Field names are reconstructed from integration partner docs.
Add a JSDoc comment on every [VERIFY] field noting it must be confirmed
against ActBlue's authenticated webhook documentation. The actual field
names may use different casing (camelCase vs snake_case) or different
nesting than specified here.

Reference: Artifact 09 §2.2 for the complete type definitions.
```

### Handoff Prompt 3: Refcode Utility

```
Create the ActBlue refcode utility for building donation URLs.

File: `packages/core/donations/refcode.ts`

Requirements:
- buildActBlueUrl(options) function that constructs a full ActBlue URL
  with refcode, refcode2, optional amount, and optional recurring params.
  Base URL from NEXT_PUBLIC_ACTBLUE_FORM_URL env var, defaulting to
  https://secure.actblue.com/donate/confluence.
- isValidRefcode(refcode) validator: letters, numbers, underscores only
  (ActBlue constraint).
- Export both functions and the ActBlueLinkOptions interface.

Reference: Artifact 09 §3.3 for full implementation.
```

### Handoff Prompt 4: Donate Page Components

```
Create the donate page with embedded ActBlue form.

Files:
- `apps/web/app/donate/page.tsx` — Server component (page shell, metadata, copy)
- `apps/web/app/donate/components/ActBlueEmbed.tsx` — Client component (embed)

Requirements for page.tsx:
- Next.js metadata export with title, description, OG tags per Artifact 09 §4.4.
- Two-column layout: left = info (why donate, impact grid, monthly pitch),
  right = ActBlue embed + fallback link.
- Impact tiers from Artifact 04: $5=25 flyers, $10=1 vol shift, $25=1 event,
  $50=1 wk digital, $100=legal filing.
- Transparency section at bottom.
- PetitionCta component for non-signers (import from shared components).
- Use buildActBlueUrl() for the fallback link with refcode='donate_page_fallback'.

Requirements for ActBlueEmbed.tsx:
- 'use client' component.
- Renders a div with data-ab-form, data-ab-token (from env), data-ab-amounts,
  data-ab-amount, data-ab-other-amount="true", data-ab-height="auto",
  data-ab-refcode, data-ab-refcode2.
- Loads ActBlue script (https://secure.actblue.com/cf/assets/actblue.js) once.
- Configures actblue.configure() with amounts, refcodes, and event callbacks.
- Event callbacks: onContribute fires PostHog donate_completed event,
  onComplete fires donate_flow_complete, onError fires donate_embed_error.
- data-ab-preview="true" in development mode.
- <noscript> fallback with direct ActBlue link.
- Declare global Window.actblue type.

Reference: Artifact 09 §4.2–4.3 for full implementations.
Reference: Artifact 02 §2.15 for page layout spec.
Reference: Artifact 04 §11 for page copy.
```

### Handoff Prompt 5: Admin Donation Dashboard

```
Create the admin donation dashboard components and queries.

Files:
- `apps/web/app/admin/donations/page.tsx` — Dashboard page
- `apps/web/app/admin/donations/queries.ts` — Data queries
- `apps/web/app/admin/donations/actions.ts` — Server actions (CSV export)

Requirements for queries.ts:
- getDonationMetrics(periodDays=7): Returns totalCents, donorCount,
  averageCents, recurringCount, expressLaneCount, totalCount,
  periodTotalCents, periodPriorCents (for trend calculation).
- getRefcodePerformance(): Returns refcode breakdown sorted by totalCents desc.
  Group donations by refcode, aggregate count + total + average.
- getDonationList(page, pageSize=25): Paginated donation list ordered by
  donated_at desc. Returns { donations, total }.
- All queries use Supabase service client (admin access to donations table).

Requirements for actions.ts:
- exportDonationsCsv() server action: Returns CSV string of all donations
  with columns: Date, ActBlue Order ID, Donor Name, Donor Email, Amount,
  Recurring, Refcode, Refcode2, Express Lane.

Requirements for page.tsx:
- Summary metrics cards (total raised, donors, average, recurring, Express Lane %).
- Trend indicators comparing current period vs prior period.
- Refcode performance table.
- Paginated recent donations table.
- CSV export button.
- Require admin authentication (check admin_users table).

Reference: Artifact 09 §5 for full layout and query implementations.
Reference: Artifact 05 §7 for RLS policies (admin-only on donations).
```

### Handoff Prompt 6: Webhook Handler Tests

```
Create tests for the ActBlue webhook handler.

File: `apps/web/__tests__/api/webhooks/actblue.test.ts`

Requirements:
- Test Basic Auth: reject missing header (401), reject invalid creds (401),
  accept valid creds.
- Test payload validation: reject malformed JSON (400), reject missing
  required fields (400), accept valid payload (200).
- Test idempotency: duplicate actblue_order_id returns 200 with
  {status: "already_processed"}, no duplicate row in donations table.
- Test data mapping: "25.00" → 2500 cents, recurringPeriod "monthly" →
  recurring true, "once" → false, undefined → false.
- Test Inngest event: verify inngest.send() called with correct shape
  including email, donorName, amountCents, recurring, refcode, orderNumber.
- Test resilience: Inngest send failure → still returns 200, donation
  still persisted in database.
- Test edge cases: missing refcode → null, Express Lane flag mapping.
- Mock Supabase service client and Inngest client.
- Use sample webhook payloads that match the Zod schema.

Reference: Artifact 09 §9.1 for test case definitions.
Reference: Artifact 09 §2.2 for payload schema.
```

---

## 12. Pre-Claude-Code Checklist

Before starting Claude Code implementation of the donation integration, Tim needs to complete these manual steps. These are bundled here so nothing falls through the cracks.

### 12.1 ActBlue Dashboard Setup

- [ ] **Verify webhook payload field names.** Log in to `secure.actblue.com/docs/webhooks` and confirm the exact JSON field names match the types in §2.2. Update `packages/core/donations/actblue-webhook.types.ts` if any `[VERIFY]` fields use different names or casing. Key fields to check: top-level key names (`donor`, `contribution`, `lineitems`, `orderNumber`), contributor fields (`firstname`/`lastname` vs `first_name`/`last_name`), line item fields (`amount` format, `recurringPeriod`, `paidAt`).
- [ ] **Generate embed token.** In ActBlue Dashboard → your `confluence` form → "Generate embed" modal → copy the token → set as `NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN`.
- [ ] **Configure webhook endpoint.** ActBlue Dashboard → Settings → Webhooks → Add: URL = `https://confluenceohio.org/api/webhooks/actblue`, Auth = HTTP Basic with credentials matching your env vars.
- [ ] **Add allowed embed URLs.** In the form settings, add `confluenceohio.org`, `www.confluenceohio.org`, and your staging domain to the "Allowed URLs" field.
- [ ] **Verify 501(c)(4) entity type** is set correctly in ActBlue (confirmed — just double-check the dashboard shows it).

### 12.2 Environment Variables to Set

```bash
# ─── ActBlue (add to .env.local) ─────────────────────────
NEXT_PUBLIC_ACTBLUE_FORM_URL=https://secure.actblue.com/donate/confluence
NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN=          # From ActBlue "Generate embed" modal
ACTBLUE_WEBHOOK_USERNAME=                 # Generate: openssl rand -hex 32
ACTBLUE_WEBHOOK_PASSWORD=                 # Generate: openssl rand -hex 32
```

These join the existing env vars from Artifact 05 (Supabase), Artifact 06 (Smarty, Turnstile), and Artifact 07 (Brevo, Inngest). The full consolidated env var list lives across those artifacts.

### 12.3 Verification After First Deploy

- [ ] Send a test webhook POST to `/api/webhooks/actblue` with sample payload and Basic Auth credentials → expect 200
- [ ] Make a test donation on the embed with `data-ab-preview="true"` → verify `onContribute` callback fires
- [ ] Confirm donation appears in `donations` table after a real (non-preview) test donation
- [ ] Confirm Inngest `donation/received` event fires and donation-thank-you email sends

---

*Artifact 09 complete. This document specifies the full ActBlue donation integration for Confluence Ohio: hybrid embed + link strategy, webhook processing with Basic Auth and idempotency, refcode taxonomy and utility functions, donate page components, admin donation dashboard, analytics events, and security considerations. All 6 Claude Code handoff prompts are implementation-ready. The pre-Claude-Code checklist in §12 consolidates all manual steps Tim needs to complete before and after implementation.*
