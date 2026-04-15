# Confluence Ohio — Analytics and Conversion Tracking

**Artifact 13 · Prompt 13 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 06 (Petition Signing Flow), Artifact 09 (ActBlue Donation Integration), Artifact 11 (Social Sharing & Referral Tracking)

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **PostHog plan tier.** ✅ **Free tier for now.** 1M events/month covers launch traffic. Upgrade to usage-based when approaching 80% of the ceiling.

2. **Google Analytics 4.** ✅ **Include GA4 at launch.** Although Google Ad Grants is 501(c)(3)-only (not applicable to this 501(c)(4) entity), GA4 provides Google ecosystem value: audience building for paid Google Ads, Search Console integration, cross-platform attribution, and familiarity for anyone else reviewing campaign analytics. GA4 is consent-gated (see §2.7); PostHog continues to track in cookieless mode regardless of consent state.

3. **Session replay.** ✅ **Enabled at launch** with aggressive PII masking on all form fields. Invaluable for diagnosing petition form abandonment on `/sign`.

4. **Cookie consent banner.** ✅ **Include consent banner.** Required because GA4 uses cookies. The banner gates GA4 loading; PostHog operates in cookieless mode independently of consent.

---

## 1. Analytics Stack Architecture

### 1.1 Stack Overview

| Tool | Role | What It Tracks | Cost |
|------|------|----------------|------|
| **PostHog** | Primary analytics + experimentation | Custom events, funnels, A/B tests, session replays, feature flags | Free (1M events/mo) |
| **Vercel Analytics** | Web performance | Page views, Web Vitals (LCP, CLS, FID, INP, TTFB) | Free with Vercel Pro |
| **Vercel Speed Insights** | Core Web Vitals monitoring | Real-user performance data per route | Free with Vercel Pro |
| **Google Analytics 4** | Google ecosystem + paid Ads audiences | Page views, conversions, audiences for Google Ads, Search Console integration | Free |

**Why four tools instead of one:**

PostHog is the analytical brain — funnels, A/B testing, and event tracking all live here. Vercel Analytics and Speed Insights are zero-config performance monitors that integrate natively with the Vercel hosting layer and provide the Lighthouse-grade performance data required by our quality standards (Artifact 02). GA4 provides Google ecosystem integration: audience building for paid Google Ads campaigns, Search Console cross-referencing, and a familiar analytics interface for collaborators. GA4 is consent-gated and does not replace PostHog for any analytical function.

### 1.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  posthog-js   │  │ @vercel/     │  │ @vercel/     │              │
│  │  (events,     │  │ analytics    │  │ speed-       │              │
│  │   flags,      │  │ (pageviews)  │  │ insights     │              │
│  │   replays)    │  │              │  │ (vitals)     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         │  ┌──────────────────────────┐     │                       │
│         │  │  @next/third-parties     │     │                       │
│         │  │  GA4 (consent-gated)     │     │                       │
│         │  └────────────┬─────────────┘     │                       │
└─────────┼──────────────┼──────────────┼─────┼───────────────────────┘
          │              │              │     │
          ▼              ▼              ▼     ▼
   PostHog Cloud   Vercel Analytics   GA4   Vercel Speed Insights
          │
          │ (feature flags bootstrapped server-side)
          │
┌─────────┼───────────────────────────────────────────────────────────┐
│         │             Server (API Routes / RSC)                     │
│         │                                                           │
│  ┌──────┴───────┐                                                   │
│  │  posthog-node │  ← Server-side event capture                    │
│  │  (events,     │    (petition submit, webhook receipt,            │
│  │   flags eval) │     donation processed, etc.)                    │
│  └──────────────┘                                                   │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │  Inngest      │  ← Background event capture                     │
│  │  (async jobs) │    (email sent, referral converted,              │
│  └──────────────┘     voice moderated, etc.)                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Privacy Model: Cookieless by Default

PostHog supports a **cookieless mode** that uses session-scoped memory instead of persistent cookies. This means:

- No cookie consent banner required for PostHog tracking (GDPR-compliant without consent for analytics)
- Users are identified per-session only; cross-session identity requires explicit opt-in (e.g., after petition signing, we call `posthog.identify(email_hash)`)
- Session replay uses DOM masking to redact form field values by default

**GA4 requires cookies and consent.** The architecture uses a consent-first loading pattern: GA4 scripts load only after the user grants analytics consent via the cookie banner (§2.7). PostHog continues to work in cookieless mode regardless of consent state — this means we always have baseline analytics even if users decline cookies.

---

## 2. Provider Setup

### 2.1 Package Dependencies

```bash
# Core analytics
npm install posthog-js posthog-node

# Vercel (auto-installed in Vercel deployments, explicit for local dev)
npm install @vercel/analytics @vercel/speed-insights

# GA4 (consent-gated)
npm install @next/third-parties
```

### 2.2 Analytics Provider Component

```typescript
// apps/web/app/providers.tsx

'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      
      // Cookieless mode — no persistent cookies, session-scoped only
      persistence: 'memory',
      
      // Capture pageviews manually (we handle route changes ourselves)
      capture_pageview: false,
      
      // Session replay — enabled at launch for form abandonment diagnosis
      enable_recording_console_log: false,
      session_recording: {
        // Mask all text input values in recordings (PII protection)
        maskAllInputs: true,
        // Mask all text content tagged with data-ph-mask (conservative default)
        maskTextSelector: '[data-ph-mask]',
        // Block recording of sensitive elements entirely
        blockSelector: '[data-ph-block]',
      },
      
      // Respect Do Not Track browser setting
      respect_dnt: true,
      
      // Bootstrap feature flags from server for instant availability
      bootstrap: {
        featureFlags: typeof window !== 'undefined'
          ? (window as any).__PH_FLAGS__ ?? {}
          : {},
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

### 2.3 Root Layout Integration

```tsx
// apps/web/app/layout.tsx

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AnalyticsProvider } from './providers';
import { PostHogPageView } from '@/components/analytics/posthog-pageview';

import { GA4ConsentLoader } from '@/components/analytics/ga4-consent';
import { CookieBanner } from '@/components/analytics/cookie-banner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider>
          <PostHogPageView />
          {children}
        </AnalyticsProvider>
        
        {/* Vercel — zero config, auto-tracks pageviews + Web Vitals */}
        <Analytics />
        <SpeedInsights />
        
        {/* GA4 — consent-gated, loads only after user grants analytics consent */}
        <GA4ConsentLoader />
        <CookieBanner />
      </body>
    </html>
  );
}
```

### 2.4 Pageview Tracker (App Router)

Next.js App Router doesn't fire traditional page load events on client-side navigation. This component captures pageviews on every route change.

```typescript
// apps/web/components/analytics/posthog-pageview.tsx

'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import posthog from 'posthog-js';

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      // Construct URL with search params
      let url = window.origin + pathname;
      const search = searchParams?.toString();
      if (search) url += '?' + search;

      posthog.capture('$pageview', {
        $current_url: url,
        // Strip PII from referral params in the pageview
        ref_code: searchParams?.get('ref') ?? undefined,
        utm_source: searchParams?.get('utm_source') ?? undefined,
        utm_medium: searchParams?.get('utm_medium') ?? undefined,
        utm_campaign: searchParams?.get('utm_campaign') ?? undefined,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

// Wrap in Suspense because useSearchParams() can suspend
export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
```

### 2.5 Server-Side PostHog Client

```typescript
// packages/core/analytics/posthog-server.ts

import { PostHog } from 'posthog-node';

let posthogServer: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!posthogServer) {
    posthogServer = new PostHog(process.env.POSTHOG_API_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      // Flush events in batches for API route performance
      flushAt: 10,
      flushInterval: 5000,
    });
  }
  return posthogServer;
}

/**
 * Capture a server-side event.
 * Use for events that originate from API routes, webhooks, or Inngest functions.
 * 
 * @param distinctId - Hashed email or anonymous session ID
 * @param event - Event name (use the taxonomy from §3)
 * @param properties - Event properties
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const ph = getPostHogServer();
  ph.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      $lib: 'posthog-node',
      environment: process.env.NODE_ENV,
    },
  });
}
```

### 2.6 Unified Event Tracking Utility

The hexagonal architecture demands a single analytics port that all domain code calls, with adapters for each provider. This prevents analytics vendor lock-in.

```typescript
// packages/core/analytics/track-event.ts

import posthog from 'posthog-js';

/**
 * Track a client-side analytics event.
 * 
 * This is the single entry point for all client-side event tracking.
 * It dispatches to PostHog (primary) and optionally GA4 (if loaded).
 * 
 * Usage:
 *   trackEvent('petition_form_started', { source: 'homepage_cta' });
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  // PostHog — primary analytics
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.capture(eventName, properties);
  }

  // GA4 — optional, only if loaded and consent granted
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, {
      ...properties,
      send_to: process.env.NEXT_PUBLIC_GA4_ID,
    });
  }
}

/**
 * Identify a user after a meaningful action (petition signing, email subscribe).
 * Uses hashed email as the distinct ID — never raw PII.
 * 
 * @param emailHash - SHA-256 hash of lowercase email
 * @param traits - User properties to set
 */
export function identifyUser(
  emailHash: string,
  traits?: Record<string, unknown>
) {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.identify(emailHash, traits);
  }
}

/**
 * Reset identity (e.g., on session end or consent withdrawal).
 */
export function resetIdentity() {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.reset();
  }
}
```

### 2.7 GA4 Consent-Gated Loading (Optional)

If GA4 is included, it must respect cookie consent. This pattern defers GA4 loading until the user grants consent.

```typescript
// apps/web/components/analytics/ga4-consent.tsx

'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export function GA4ConsentLoader() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    // Check for existing consent in sessionStorage (not localStorage — 
    // session-scoped consent resets between sessions for extra privacy)
    const consent = sessionStorage.getItem('analytics_consent');
    if (consent === 'granted') {
      setConsentGranted(true);
    }

    // Listen for consent grant from cookie banner component
    const handler = (e: CustomEvent) => {
      if (e.detail?.analytics === true) {
        sessionStorage.setItem('analytics_consent', 'granted');
        setConsentGranted(true);
      }
    };
    window.addEventListener('analytics-consent' as any, handler);
    return () => window.removeEventListener('analytics-consent' as any, handler);
  }, []);

  if (!consentGranted || !GA4_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'update', {
            'analytics_storage': 'granted'
          });
          gtag('config', '${GA4_ID}', {
            send_page_view: true,
          });
        `}
      </Script>
    </>
  );
}
```

### 2.8 Environment Variables

```bash
# .env.local

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxx          # Project API key (safe for client)
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phx_xxxxxxxxxx                   # Personal API key (server-side only)

# Vercel Analytics — auto-configured in Vercel deployments
# No env vars needed

# GA4 (consent-gated — loads only after user accepts cookie banner)
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX

# PostHog proxy (optional — avoids ad blocker interference)
# See §2.9 for reverse proxy setup
```

### 2.9 PostHog Reverse Proxy (Ad Blocker Mitigation)

Ad blockers block requests to `us.i.posthog.com`. A reverse proxy through our own domain captures ~15–25% more events.

```typescript
// next.config.ts — PostHog reverse proxy via Next.js rewrites

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },
};

export default nextConfig;
```

When the proxy is active, update the PostHog init to use the proxy host:

```typescript
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: '/ingest',  // Proxy through our domain
  ui_host: 'https://us.i.posthog.com',  // Keep toolbar pointing to PostHog
  // ... rest of config
});
```

---

## 3. Event Taxonomy

### 3.1 Naming Conventions

All custom events follow a consistent `{domain}_{object}_{action}` pattern:

- **Domain:** The product area (`petition`, `donate`, `volunteer`, `voice`, `email`, `referral`, `share`)
- **Object:** The specific thing being acted on (`form`, `field`, `button`, `link`, `page`)
- **Action:** What happened (`viewed`, `started`, `completed`, `clicked`, `submitted`, `failed`)

Properties use `snake_case`. Boolean properties use `is_` prefix. Timestamps use `_at` suffix.

### 3.2 Full Event Inventory

#### 3.2.1 Pageview Events (Auto-Captured)

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `$pageview` | Every route navigation | `$current_url`, `ref_code`, `utm_source`, `utm_medium`, `utm_campaign` |

#### 3.2.2 Petition Events

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `petition_page_viewed` | `/sign` page loads | `has_ref_code: boolean`, `ref_code?: string`, `utm_source?: string` |
| `petition_form_started` | First interaction with any form field | `first_field: string` (which field was touched first) |
| `petition_field_completed` | User completes (blurs) a form field | `field_name: string`, `field_valid: boolean`, `time_to_complete_ms: number` |
| `petition_address_autocomplete_selected` | User selects a Smarty autocomplete suggestion | `suggestion_index: number` (1-5, which suggestion they picked) |
| `petition_address_manual_entry` | User types address without using autocomplete | — |
| `petition_form_submitted` | Form submit button clicked (client-side) | `has_ref_code: boolean`, `email_opt_in: boolean`, `turnstile_present: boolean` |
| `petition_verification_success` | Server confirms signature recorded | `verification_status: string`, `signature_number: number`, `is_referred: boolean` |
| `petition_verification_failed` | Server rejects submission | `failure_reason: string` (`invalid_address`, `non_ohio`, `duplicate_address`, `duplicate_email`, `rate_limited`, `turnstile_failed`) |
| `petition_thankyou_viewed` | Thank-you page loads | `signature_number: number`, `referral_code: string` |

#### 3.2.3 Donation Events

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `donate_page_viewed` | `/donate` page loads | `refcode?: string`, `utm_source?: string` |
| `donate_embed_loaded` | ActBlue embed iframe renders successfully | `load_time_ms: number` |
| `donate_embed_error` | ActBlue embed fails to load | `error: string` |
| `donate_initiated` | ActBlue `onContribute` callback fires | `amount_cents: number`, `recurring: boolean`, `refcode: string`, `source: 'embed'` |
| `donate_flow_complete` | ActBlue `onComplete` callback fires | `source: 'embed'` |
| `donate_fallback_clicked` | User clicks the "Donate on ActBlue directly" fallback link | `refcode: string` |
| `donate_webhook_received` | Server processes ActBlue webhook (server-side event) | `amount_cents: number`, `recurring: boolean`, `refcode: string`, `is_express_lane: boolean`, `order_number: string` |

#### 3.2.4 Volunteer Events

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `volunteer_page_viewed` | `/volunteer` page loads | `utm_source?: string` |
| `volunteer_form_started` | First field interaction | `first_field: string` |
| `volunteer_form_submitted` | Form submitted | `roles_selected: string[]`, `hours_per_week: string`, `has_experience: boolean` |
| `volunteer_confirmation_viewed` | Confirmation page shown | — |

#### 3.2.5 Community Voice Events

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `voice_page_viewed` | `/voices` listing page loads | — |
| `voice_story_viewed` | Individual `/voices/[slug]` page loads | `story_slug: string`, `position: string` |
| `voice_form_viewed` | `/voices/share` form page loads | — |
| `voice_form_started` | First field interaction | — |
| `voice_form_submitted` | Submission sent | `position: string` (`support`, `oppose`, `undecided`), `word_count: number` |
| `voice_moderation_complete` | AI or human moderation decision (server-side) | `decision: string`, `is_auto: boolean`, `moderation_time_ms: number` |

#### 3.2.6 Email Events

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `email_subscribed` | User subscribes via any form (not petition opt-in) | `source: string` (`footer`, `blog`, `standalone`) |
| `email_unsubscribed` | User clicks unsubscribe link | `source: string` |

Note: Email open/click tracking is handled by Brevo natively. These Brevo metrics are pulled into the admin dashboard via the Brevo reporting API (§6), not PostHog.

#### 3.2.7 Referral Events

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `referral_link_clicked` | Visitor arrives at `/sign?ref=XXXX` (server-side via middleware) | `ref_code: string`, `platform: string` |
| `referral_conversion` | A referred visitor completes petition signing (server-side) | `ref_code: string`, `referrer_signature_id: string` |

Note: These events are already tracked via the `referrals` table and Inngest functions (Artifact 11). PostHog capture is added for funnel analysis.

#### 3.2.8 Social Share Events

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `share_button_clicked` | User clicks any share button | `platform: string` (`facebook`, `twitter`, `whatsapp`, `email`, `copy`, `native`), `context: string` (`post_signature`, `petition_page`, `voice_story`), `page: string` |
| `share_native_completed` | Web Share API `navigator.share()` resolves successfully | `platform: 'native'`, `context: string` |
| `share_native_cancelled` | Web Share API rejected (user cancelled) | `context: string` |
| `share_link_copied` | Clipboard copy succeeds | `referral_code: string` |

#### 3.2.9 Navigation & Engagement Events

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `cta_clicked` | Any CTA button/link clicked site-wide | `cta_id: string`, `cta_text: string`, `page: string`, `destination: string` |
| `faq_expanded` | FAQ accordion item opened | `question_id: string`, `page: string` |
| `counter_milestone_viewed` | Signature counter crosses a milestone threshold while user is on page | `milestone: number`, `current_count: number` |
| `blog_post_viewed` | Blog post page loaded | `slug: string`, `category: string` |
| `blog_post_scrolled` | User scrolls past 50% of blog post | `slug: string`, `percent_scrolled: number` |

### 3.3 Event Properties — Global Context

Every event automatically includes these PostHog super properties (set once at session start):

```typescript
// Set once after PostHog init
posthog.register({
  app_version: process.env.NEXT_PUBLIC_APP_VERSION,
  environment: process.env.NODE_ENV,
  // Initial landing context — persists for the session
  initial_ref_code: new URLSearchParams(window.location.search).get('ref') ?? null,
  initial_utm_source: new URLSearchParams(window.location.search).get('utm_source') ?? null,
  initial_utm_medium: new URLSearchParams(window.location.search).get('utm_medium') ?? null,
  initial_utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') ?? null,
});
```

### 3.4 Identity Resolution

PostHog uses anonymous session IDs by default (cookieless mode). After a high-value action, we link the anonymous session to a pseudonymous identity:

```typescript
// Called after successful petition signing
import { identifyUser, trackEvent } from '@/packages/core/analytics/track-event';
import { sha256 } from '@/packages/core/crypto/hash';

async function onPetitionSignSuccess(email: string, signatureNumber: number) {
  const emailHash = await sha256(email.toLowerCase());
  
  // Link this anonymous session to the hashed email
  identifyUser(emailHash, {
    is_signer: true,
    signature_number: signatureNumber,
    signed_at: new Date().toISOString(),
  });
  
  trackEvent('petition_verification_success', {
    signature_number: signatureNumber,
    verification_status: 'verified',
  });
}
```

This allows PostHog to connect pre-signing behavior (page views, CTA clicks) with post-signing behavior (sharing, donating) for funnel analysis — without storing raw email addresses in PostHog.

---

## 4. Conversion Funnels

### 4.1 Primary Funnel: Visit → Sign → Share

The most important funnel. Every step is measured and optimizable.

```
Step 1: $pageview (any page)
  ↓ [How many visitors reach the petition page?]
Step 2: petition_page_viewed
  ↓ [How many start filling out the form?]
Step 3: petition_form_started
  ↓ [How many complete and submit?]
Step 4: petition_form_submitted
  ↓ [How many pass verification?]
Step 5: petition_verification_success
  ↓ [How many reach the thank-you page?]
Step 6: petition_thankyou_viewed
  ↓ [How many click a share button?]
Step 7: share_button_clicked (context = 'post_signature')
```

**Key conversion rates to monitor:**

| Transition | Benchmark Target | Action if Below |
|-----------|-----------------|-----------------|
| Any page → Petition page | 30–40% | Improve CTA visibility, test CTA copy |
| Petition page → Form start | 40–50% | Test above-fold layout, counter prominence |
| Form start → Submit | 60–70% | Reduce form friction, check autocomplete UX |
| Submit → Verified | 90–95% | Check Smarty config, review rejection reasons |
| Verified → Share | 20–30% | Test thank-you page copy, share button placement |

### 4.2 Donation Funnel

```
Step 1: $pageview (any page)
  ↓
Step 2: donate_page_viewed
  ↓
Step 3: donate_embed_loaded
  ↓
Step 4: donate_initiated
  ↓
Step 5: donate_webhook_received  (server-side confirmation)
```

**Parallel path:** For donations that come from the thank-you page after signing:

```
petition_verification_success → petition_thankyou_viewed → donate_fallback_clicked → donate_webhook_received
```

### 4.3 Volunteer Funnel

```
Step 1: $pageview (any page)
  ↓
Step 2: volunteer_page_viewed
  ↓
Step 3: volunteer_form_started
  ↓
Step 4: volunteer_form_submitted
```

### 4.4 Referral Funnel

```
Step 1: share_button_clicked (post-signature context)
  ↓
Step 2: referral_link_clicked
  ↓
Step 3: petition_page_viewed (with ref_code)
  ↓
Step 4: petition_form_started
  ↓
Step 5: referral_conversion
```

**Referral viral coefficient (k-factor):**

```
k = (avg shares per signer) × (avg conversion rate per share click)
```

Target k > 0.3 at launch (each signer generates 0.3 new signers). k > 1.0 = viral growth.

### 4.5 Voice Submission Funnel

```
Step 1: voice_page_viewed
  ↓
Step 2: voice_form_viewed
  ↓
Step 3: voice_form_started
  ↓
Step 4: voice_form_submitted
  ↓
Step 5: voice_moderation_complete (decision = 'approved' or 'auto_approved')
```

### 4.6 PostHog Funnel Configuration

Funnels are created in PostHog's dashboard UI. The Claude Code handoff includes a setup script that uses PostHog's API to programmatically create these funnel definitions:

```typescript
// scripts/setup-posthog-funnels.ts
// Run once during project setup to create funnel definitions in PostHog

import { PostHog } from 'posthog-node';

const FUNNELS = [
  {
    name: 'Primary: Visit → Sign → Share',
    steps: [
      { event: '$pageview' },
      { event: 'petition_page_viewed' },
      { event: 'petition_form_started' },
      { event: 'petition_form_submitted' },
      { event: 'petition_verification_success' },
      { event: 'petition_thankyou_viewed' },
      { event: 'share_button_clicked', properties: { context: 'post_signature' } },
    ],
  },
  {
    name: 'Donation: Visit → Donate',
    steps: [
      { event: '$pageview' },
      { event: 'donate_page_viewed' },
      { event: 'donate_embed_loaded' },
      { event: 'donate_initiated' },
      { event: 'donate_webhook_received' },
    ],
  },
  {
    name: 'Volunteer: Visit → Sign Up',
    steps: [
      { event: '$pageview' },
      { event: 'volunteer_page_viewed' },
      { event: 'volunteer_form_started' },
      { event: 'volunteer_form_submitted' },
    ],
  },
  {
    name: 'Referral: Share → Conversion',
    steps: [
      { event: 'share_button_clicked' },
      { event: 'referral_link_clicked' },
      { event: 'petition_page_viewed' },
      { event: 'petition_form_started' },
      { event: 'referral_conversion' },
    ],
  },
  {
    name: 'Voice: View → Submit → Approve',
    steps: [
      { event: 'voice_page_viewed' },
      { event: 'voice_form_viewed' },
      { event: 'voice_form_started' },
      { event: 'voice_form_submitted' },
    ],
  },
];
```

Note: PostHog's Insight API allows programmatic funnel creation, but the dashboard UI is the recommended approach for initial setup. This script serves as documentation of the exact funnel definitions.

---

## 5. A/B Testing Framework

### 5.1 PostHog Feature Flags for Experimentation

PostHog feature flags serve double duty: feature gating (ship behind a flag) and A/B testing (randomly assign variants). All experiments use PostHog's built-in experimentation framework, which handles random assignment, statistical significance calculation, and goal metric tracking.

### 5.2 Server-Side Flag Bootstrapping

Feature flags must be available instantly on page load — no flickering between variants. We bootstrap flags server-side and pass them to the client.

```typescript
// apps/web/app/layout.tsx — server-side flag bootstrapping

import { cookies } from 'next/headers';
import { getPostHogServer } from '@/packages/core/analytics/posthog-server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const phCookie = cookieStore.get('ph_distinct_id');
  const distinctId = phCookie?.value ?? crypto.randomUUID();

  // Evaluate all feature flags server-side
  const posthog = getPostHogServer();
  const flags = await posthog.getAllFlags(distinctId);

  return (
    <html lang="en">
      <head>
        {/* Bootstrap flags into the page for instant client-side availability */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PH_FLAGS__ = ${JSON.stringify(flags)};
                     window.__PH_DISTINCT_ID__ = "${distinctId}";`,
          }}
        />
      </head>
      <body>
        {/* ... providers and content ... */}
      </body>
    </html>
  );
}
```

### 5.3 Client-Side Flag Usage

```typescript
// packages/ui/hooks/use-feature-flag.ts

import { useFeatureFlagVariantKey, useFeatureFlagPayload } from 'posthog-js/react';

/**
 * Hook for A/B test variant assignment.
 * Returns the variant key ('control', 'variant_a', 'variant_b', etc.)
 * and the optional JSON payload attached to the variant.
 */
export function useExperiment(flagKey: string) {
  const variant = useFeatureFlagVariantKey(flagKey);
  const payload = useFeatureFlagPayload(flagKey);

  return {
    variant: variant ?? 'control',
    payload: payload as Record<string, unknown> | undefined,
    isControl: variant === 'control' || variant === undefined,
    isLoading: variant === undefined,
  };
}
```

### 5.4 Planned Experiments

These experiments are defined as feature flags in PostHog and activated when there's enough traffic for statistical significance (~500 visitors per variant per week minimum).

| Flag Key | What It Tests | Variants | Primary Goal Metric |
|----------|--------------|----------|---------------------|
| `exp_petition_headline` | Headline copy on `/sign` | `control`: "Add Your Name to the Confluence Ohio Petition" / `variant_a`: "22,000 Signatures Can Change Our City's Name" / `variant_b`: "Where Two Rivers Meet, a New Name Begins" | `petition_form_started` |
| `exp_petition_cta_text` | Submit button label | `control`: "Add My Name →" / `variant_a`: "Sign the Petition →" / `variant_b`: "I Support This →" | `petition_form_submitted` |
| `exp_petition_layout` | Form layout on desktop | `control`: Two-column (form left, counter right) / `variant_a`: Single-column (counter above, form below) | `petition_verification_success` |
| `exp_thankyou_share_prompt` | Share CTA on thank-you page | `control`: "Spread the word" / `variant_a`: "Every share = more signatures" / `variant_b`: Social proof ("87% of signers share") | `share_button_clicked` |
| `exp_donate_default_amount` | Default donation amount | `control`: $25 / `variant_a`: $10 / `variant_b`: $50 | `donate_webhook_received` |
| `exp_homepage_hero` | Homepage hero section | `control`: River imagery + manifesto excerpt / `variant_a`: Video background + counter / `variant_b`: Map visualization | `petition_page_viewed` (from homepage) |

### 5.5 Experiment Component Pattern

```tsx
// Example: A/B testing the petition headline

'use client';

import { useExperiment } from '@/packages/ui/hooks/use-feature-flag';

const HEADLINES: Record<string, { title: string; subtitle: string }> = {
  control: {
    title: 'Add Your Name to the Confluence Ohio Petition',
    subtitle: 'Help put the question on the ballot.',
  },
  variant_a: {
    title: '22,000 Signatures Can Change Our City\'s Name',
    subtitle: 'We\'re already on our way. Add yours.',
  },
  variant_b: {
    title: 'Where Two Rivers Meet, a New Name Begins',
    subtitle: 'Sign the petition for Confluence, Ohio.',
  },
};

export function PetitionHeadline() {
  const { variant } = useExperiment('exp_petition_headline');
  const content = HEADLINES[variant] ?? HEADLINES.control;

  return (
    <div>
      <h1>{content.title}</h1>
      <p>{content.subtitle}</p>
    </div>
  );
}
```

### 5.6 Statistical Significance Requirements

PostHog calculates Bayesian significance by default. Experiments should not be called until:

- **Minimum sample size:** 500 unique visitors per variant
- **Minimum runtime:** 7 days (to account for day-of-week variation)
- **Significance threshold:** 95% probability of the winner outperforming control (PostHog's default Bayesian threshold)
- **Minimum detectable effect:** 5% relative improvement (don't ship changes for <5% lifts — the implementation cost isn't worth it)

---

## 6. Admin Dashboard Metrics

### 6.1 Dashboard Home — Key Metrics

The admin dashboard home page (`/admin` or `apps/admin/`) displays real-time campaign health at a glance. Data comes from two sources: the `campaign_metrics` table (real-time counters) and PostHog's API (funnel/behavioral data).

```
┌─────────────────────────────────────────────────────────────────────┐
│  Confluence Ohio — Campaign Dashboard                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  SIGNATURES   │  │  TODAY       │  │  CONVERSION  │              │
│  │  4,217        │  │  +127        │  │  8.4%        │              │
│  │  of 22,000    │  │  ↑ 23% vs    │  │  visitors →  │              │
│  │  [████░░░░░]  │  │  yesterday   │  │  signers     │              │
│  │  19.2%        │  │              │  │  ↑ 1.2pp     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  DONATIONS    │  │  VOLUNTEERS  │  │  VOICES      │              │
│  │  $12,450      │  │  89 active   │  │  34 approved │              │
│  │  avg $31.20   │  │  +7 this wk  │  │  12 pending  │              │
│  │  42% recurr.  │  │              │  │  review ⚠    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  EMAIL LIST   │  │  REFERRALS   │  │  TOP SOURCE  │              │
│  │  5,890 subs   │  │  k = 0.34    │  │  Twitter     │              │
│  │  72% from     │  │  1,240 via   │  │  38% of      │              │
│  │  petition     │  │  referral    │  │  referral     │              │
│  └──────────────┘  └──────────────┘  │  traffic      │              │
│                                      └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Metric Definitions and Data Sources

| Metric | Source | Query |
|--------|--------|-------|
| Total signatures | `campaign_metrics` where `metric = 'signature_count'` | Real-time via Supabase Realtime |
| Verified signatures | `campaign_metrics` where `metric = 'verified_signature_count'` | Real-time |
| Signatures today | `signatures` table, `COUNT(*) WHERE signed_at >= today_start` | Polled every 60s |
| Signatures this week | `signatures` table, `COUNT(*) WHERE signed_at >= week_start` | Polled every 60s |
| Visitor → signer conversion rate | PostHog API: `petition_verification_success` / unique `$pageview` visitors | PostHog Trends API, updated hourly |
| Total donations ($) | `campaign_metrics` where `metric = 'donation_total_cents'` / 100 | Real-time |
| Average donation | `SELECT AVG(amount_cents) FROM donations` | Polled every 5 min |
| Recurring donation % | `SELECT COUNT(*) FILTER (WHERE recurring) * 100.0 / COUNT(*) FROM donations` | Polled every 5 min |
| Active volunteers | `SELECT COUNT(*) FROM volunteers WHERE status = 'active'` | Polled every 5 min |
| Email subscribers | `campaign_metrics` where `metric = 'email_subscriber_count'` | Real-time |
| Pending voice reviews | `SELECT COUNT(*) FROM voices WHERE moderation_status IN ('pending', 'needs_review')` | Polled every 60s |
| Referral k-factor | Computed: (total shares / total signers) × (referral conversions / referral clicks) | Computed from `referrals` table, hourly |
| Top referral source | `SELECT platform, SUM(conversions) FROM referrals GROUP BY platform ORDER BY 2 DESC LIMIT 1` | Polled every 5 min |
| Top individual referrers | `SELECT s.first_name, s.last_name, COUNT(r.id) FROM signatures s JOIN signatures r ON r.referred_by_id = s.id GROUP BY s.id ORDER BY 3 DESC LIMIT 10` | Polled every 5 min |

### 6.3 Admin API Routes

```typescript
// apps/web/app/api/admin/metrics/route.ts

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/admin';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();

  // Parallel queries for dashboard metrics
  const [
    metricsResult,
    todaySignaturesResult,
    weekSignaturesResult,
    avgDonationResult,
    recurringDonationResult,
    activeVolunteersResult,
    pendingVoicesResult,
    topReferrerResult,
    topReferralPlatformResult,
  ] = await Promise.all([
    // Campaign metrics (real-time counters)
    supabase.from('campaign_metrics').select('metric, value'),

    // Signatures today
    supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .gte('signed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .is('deleted_at', null),

    // Signatures this week (Monday start)
    supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .gte('signed_at', getWeekStart().toISOString())
      .is('deleted_at', null),

    // Average donation
    supabase.rpc('get_average_donation'),

    // Recurring donation percentage
    supabase.rpc('get_recurring_donation_pct'),

    // Active volunteers
    supabase
      .from('volunteers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Pending voice reviews
    supabase
      .from('voices')
      .select('id', { count: 'exact', head: true })
      .in('moderation_status', ['pending', 'needs_review']),

    // Top 10 referrers
    supabase.rpc('get_top_referrers', { p_limit: 10 }),

    // Top referral platform
    supabase.rpc('get_top_referral_platform'),
  ]);

  // Assemble metrics map
  const metrics: Record<string, number> = {};
  metricsResult.data?.forEach((row) => {
    metrics[row.metric] = row.value;
  });

  return NextResponse.json({
    signatures: {
      total: metrics.signature_count ?? 0,
      verified: metrics.verified_signature_count ?? 0,
      today: todaySignaturesResult.count ?? 0,
      thisWeek: weekSignaturesResult.count ?? 0,
      goal: 22000,
    },
    donations: {
      totalCents: metrics.donation_total_cents ?? 0,
      averageCents: avgDonationResult.data ?? 0,
      recurringPct: recurringDonationResult.data ?? 0,
    },
    volunteers: {
      active: activeVolunteersResult.count ?? 0,
    },
    email: {
      subscribers: metrics.email_subscriber_count ?? 0,
    },
    voices: {
      pendingReview: pendingVoicesResult.count ?? 0,
    },
    referrals: {
      totalClicks: metrics.referral_click_count ?? 0,
      totalConversions: metrics.referral_conversion_count ?? 0,
      topReferrers: topReferrerResult.data ?? [],
      topPlatform: topReferralPlatformResult.data ?? null,
    },
  });
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(now.setDate(diff));
}
```

### 6.4 Supporting RPC Functions

```sql
-- Average donation amount in cents
CREATE OR REPLACE FUNCTION get_average_donation()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(AVG(amount_cents)::integer, 0)
  FROM donations;
$$;

-- Recurring donation percentage
CREATE OR REPLACE FUNCTION get_recurring_donation_pct()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    COUNT(*) FILTER (WHERE recurring) * 100.0 / NULLIF(COUNT(*), 0),
    0
  )
  FROM donations;
$$;

-- Top N referrers by conversion count
CREATE OR REPLACE FUNCTION get_top_referrers(p_limit integer DEFAULT 10)
RETURNS TABLE (
  first_name text,
  last_initial text,
  referral_code text,
  conversion_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.first_name,
    LEFT(s.last_name, 1) AS last_initial,
    s.referral_code,
    COUNT(r.id) AS conversion_count
  FROM signatures s
  JOIN signatures r ON r.referred_by_id = s.id AND r.deleted_at IS NULL
  WHERE s.deleted_at IS NULL
    AND s.referral_code IS NOT NULL
  GROUP BY s.id, s.first_name, s.last_name, s.referral_code
  ORDER BY conversion_count DESC
  LIMIT p_limit;
$$;

-- Top referral platform by conversions
CREATE OR REPLACE FUNCTION get_top_referral_platform()
RETURNS TABLE (
  platform referral_platform,
  total_conversions bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT platform, SUM(conversions) AS total_conversions
  FROM referrals
  GROUP BY platform
  ORDER BY total_conversions DESC
  LIMIT 1;
$$;
```

### 6.5 Trend Indicators

Dashboard cards show directional trends (↑ / ↓ / →) by comparing the current period to the prior period:

```typescript
// packages/core/analytics/compute-trend.ts

export interface TrendData {
  current: number;
  previous: number;
  direction: 'up' | 'down' | 'flat';
  percentChange: number;
}

export function computeTrend(current: number, previous: number): TrendData {
  if (previous === 0) {
    return {
      current,
      previous,
      direction: current > 0 ? 'up' : 'flat',
      percentChange: current > 0 ? 100 : 0,
    };
  }

  const percentChange = ((current - previous) / previous) * 100;

  return {
    current,
    previous,
    direction: percentChange > 1 ? 'up' : percentChange < -1 ? 'down' : 'flat',
    percentChange: Math.round(percentChange * 10) / 10,
  };
}
```

### 6.6 Real-Time Signature Feed (WebSocket)

The admin dashboard subscribes to Supabase Realtime for a live feed of incoming signatures:

```typescript
// apps/admin/hooks/use-live-signatures.ts (or apps/web/app/admin/hooks/)

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

interface LiveSignature {
  id: string;
  first_name: string;
  city: string;
  verification_status: string;
  signature_number: number;
  signed_at: string;
}

export function useLiveSignatures(limit = 20) {
  const [signatures, setSignatures] = useState<LiveSignature[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Initial fetch
    supabase
      .from('signatures')
      .select('id, first_name, city, verification_status, signature_number, signed_at')
      .is('deleted_at', null)
      .order('signed_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (data) setSignatures(data);
      });

    // Subscribe to new inserts
    const channel = supabase
      .channel('admin-signatures')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signatures',
        },
        (payload) => {
          const newSig = payload.new as LiveSignature;
          setSignatures((prev) => [newSig, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return signatures;
}
```

---

## 7. PostHog Dashboard Configuration

### 7.1 Recommended Dashboards

Create these dashboards in PostHog's UI during initial setup:

**Dashboard 1: Campaign Overview**
- Signature funnel (7 steps from §4.1) — conversion over time
- Daily unique visitors (trend)
- Daily signatures (trend)
- Top traffic sources (breakdown by `utm_source`)
- Referral k-factor (computed insight)

**Dashboard 2: Petition Deep Dive**
- Form field completion rates (each field as a bar)
- Time-to-complete per field (average)
- Autocomplete usage rate (autocomplete selected vs. manual entry)
- Verification failure reasons (pie chart of `failure_reason` property)
- Form abandonment point (where users drop off in the form)

**Dashboard 3: Sharing & Virality**
- Share button clicks by platform (stacked area chart)
- Referral click → conversion rate by platform
- Top 10 referrers (table)
- Viral coefficient trend (line chart)

**Dashboard 4: Donations**
- Donation funnel
- Average donation over time
- Recurring vs. one-time split
- Refcode performance (which source drives the most donation revenue)
- Donation by time of day / day of week

**Dashboard 5: Active Experiments**
- One section per active experiment showing variant performance against the goal metric
- Statistical significance indicator
- Cumulative conversion by variant (line chart)

### 7.2 Alerts

Configure PostHog alerts for anomaly detection:

| Alert | Condition | Notification |
|-------|-----------|-------------|
| Signature surge | >200 signatures in 1 hour (>3x normal) | Email Tim |
| Signature drought | <5 signatures in 4 hours (during active hours 8am–10pm ET) | Email Tim |
| Verification failure spike | Verification failure rate >20% in 1 hour | Email Tim |
| High form abandonment | Form start → submit rate drops below 40% | Email Tim |
| Donation spike | >$500 in donations in 1 hour | Email Tim |
| Bot activity | >50 rate-limited requests in 1 hour | Email Tim |

---

## 8. Implementation Notes

### 8.1 Event Tracking Hook for Forms

A reusable hook that automatically tracks form interaction events:

```typescript
// packages/ui/hooks/use-form-analytics.ts

import { useCallback, useRef } from 'react';
import { trackEvent } from '@/packages/core/analytics/track-event';

interface FormAnalyticsOptions {
  formName: string; // e.g., 'petition', 'volunteer', 'voice'
}

export function useFormAnalytics({ formName }: FormAnalyticsOptions) {
  const hasStarted = useRef(false);
  const fieldTimers = useRef<Record<string, number>>({});

  const trackFormStart = useCallback(
    (firstField: string) => {
      if (!hasStarted.current) {
        hasStarted.current = true;
        trackEvent(`${formName}_form_started`, { first_field: firstField });
      }
    },
    [formName]
  );

  const trackFieldFocus = useCallback((fieldName: string) => {
    fieldTimers.current[fieldName] = Date.now();
  }, []);

  const trackFieldComplete = useCallback(
    (fieldName: string, isValid: boolean) => {
      const startTime = fieldTimers.current[fieldName];
      const timeToComplete = startTime ? Date.now() - startTime : undefined;

      trackEvent(`${formName}_field_completed`, {
        field_name: fieldName,
        field_valid: isValid,
        ...(timeToComplete !== undefined && { time_to_complete_ms: timeToComplete }),
      });
    },
    [formName]
  );

  const trackFormSubmit = useCallback(
    (properties?: Record<string, unknown>) => {
      trackEvent(`${formName}_form_submitted`, properties);
    },
    [formName]
  );

  return {
    trackFormStart,
    trackFieldFocus,
    trackFieldComplete,
    trackFormSubmit,
  };
}
```

### 8.2 CTA Click Tracking Component

```tsx
// packages/ui/components/tracked-cta.tsx

'use client';

import { trackEvent } from '@/packages/core/analytics/track-event';
import { usePathname } from 'next/navigation';

interface TrackedCTAProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  ctaId: string;
  children: React.ReactNode;
}

export function TrackedCTA({ ctaId, children, href, onClick, ...props }: TrackedCTAProps) {
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackEvent('cta_clicked', {
      cta_id: ctaId,
      cta_text: typeof children === 'string' ? children : ctaId,
      page: pathname,
      destination: href,
    });
    onClick?.(e);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
```

### 8.3 Scroll Depth Tracking for Blog Posts

```typescript
// packages/ui/hooks/use-scroll-tracking.ts

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/packages/core/analytics/track-event';

export function useScrollTracking(contentRef: React.RefObject<HTMLElement>, slug: string) {
  const milestones = useRef(new Set<number>());

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Not used — we use scroll listener instead
      },
      { threshold: [0.25, 0.5, 0.75, 1.0] }
    );

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const elementHeight = element.scrollHeight;
      const scrolledPast = window.scrollY + window.innerHeight - element.offsetTop;
      const percent = Math.min(Math.round((scrolledPast / elementHeight) * 100), 100);

      for (const milestone of [25, 50, 75, 100]) {
        if (percent >= milestone && !milestones.current.has(milestone)) {
          milestones.current.add(milestone);
          trackEvent('blog_post_scrolled', {
            slug,
            percent_scrolled: milestone,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [contentRef, slug]);
}
```

---

## 9. Claude Code Handoff

### Handoff Prompt 1: Analytics Provider Setup

```
You are implementing analytics for the Confluence Ohio campaign website. 
Read artifact 13 (13-analytics-conversion-tracking.md) sections 1 and 2.

Create the following files:

1. `apps/web/app/providers.tsx` — AnalyticsProvider component wrapping PostHog 
   in cookieless mode (persistence: 'memory', capture_pageview: false, 
   respect_dnt: true, session recording with maskAllInputs: true)

2. `apps/web/components/analytics/posthog-pageview.tsx` — PostHogPageView 
   component that captures $pageview on every App Router route change, wrapped 
   in Suspense. Include UTM and ref_code extraction from search params.

3. `packages/core/analytics/posthog-server.ts` — Server-side PostHog client 
   singleton using posthog-node. Include captureServerEvent() helper.

4. `packages/core/analytics/track-event.ts` — Unified client-side trackEvent() 
   function that dispatches to PostHog and optionally GA4. Include identifyUser() 
   and resetIdentity() functions. identifyUser takes an email hash, never raw email.

5. Update `apps/web/app/layout.tsx` to include AnalyticsProvider, PostHogPageView, 
   Vercel Analytics (<Analytics />), Vercel Speed Insights (<SpeedInsights />),
   GA4ConsentLoader, and CookieBanner. GA4 loads only after consent — see 
   Handoff Prompt 6 for the consent components.

6. `next.config.ts` — Add PostHog reverse proxy rewrites (/ingest/* → us.i.posthog.com).

7. Add to `.env.local.example`:
   NEXT_PUBLIC_POSTHOG_KEY=
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   POSTHOG_API_KEY=
   NEXT_PUBLIC_GA4_ID=

Install packages: posthog-js, posthog-node, @vercel/analytics, @vercel/speed-insights

All code must be TypeScript. Follow the hexagonal architecture — analytics is an 
infrastructure adapter, not domain logic.
```

### Handoff Prompt 2: Event Tracking Implementation

```
You are implementing event tracking for the Confluence Ohio campaign website. 
Read artifact 13 (13-analytics-conversion-tracking.md) section 3 for the full 
event taxonomy and section 8 for implementation patterns.

Create the following files:

1. `packages/ui/hooks/use-form-analytics.ts` — Reusable hook for tracking form 
   interactions (form_started, field_completed, form_submitted) with automatic 
   field timing. Accepts formName parameter for event namespacing.

2. `packages/ui/components/tracked-cta.tsx` — TrackedCTA component that wraps 
   anchor tags and fires cta_clicked events with cta_id, cta_text, page, and 
   destination properties.

3. `packages/ui/hooks/use-scroll-tracking.ts` — Hook for tracking scroll depth 
   on blog posts at 25/50/75/100% milestones.

4. Integrate form analytics into the petition form (apps/web/app/sign/):
   - petition_page_viewed on mount
   - petition_form_started on first field interaction
   - petition_field_completed on each field blur
   - petition_address_autocomplete_selected when Smarty suggestion chosen
   - petition_form_submitted on submit

5. Integrate donation analytics into the ActBlue embed (apps/web/app/donate/):
   - donate_page_viewed on mount
   - donate_embed_loaded when iframe renders
   - donate_initiated on onContribute callback
   - donate_flow_complete on onComplete callback

6. Integrate share button analytics (packages/ui/components/share-buttons.tsx):
   - share_button_clicked with platform, context, and page properties
   - share_link_copied on clipboard copy
   - share_native_completed / share_native_cancelled for Web Share API

7. Add server-side event capture to:
   - POST /api/petition/sign: petition_verification_success or petition_verification_failed
   - POST /api/webhooks/actblue: donate_webhook_received
   - Inngest track-referral-conversion: referral_conversion

Use the posthog.register() super properties pattern for session-level context 
(app_version, initial UTM params, initial ref_code).
```

### Handoff Prompt 3: A/B Testing Framework

```
You are implementing the A/B testing framework for the Confluence Ohio campaign. 
Read artifact 13 (13-analytics-conversion-tracking.md) sections 5 for the full spec.

Create the following:

1. Server-side flag bootstrapping in `apps/web/app/layout.tsx`:
   - Read PostHog distinct_id from cookies (or generate new UUID)
   - Call posthog.getAllFlags(distinctId) server-side
   - Inject flags into window.__PH_FLAGS__ via script tag
   - Pass distinct_id to client for PostHog init bootstrap

2. `packages/ui/hooks/use-feature-flag.ts` — useExperiment() hook that wraps 
   PostHog's useFeatureFlagVariantKey and useFeatureFlagPayload. Returns 
   { variant, payload, isControl, isLoading }.

3. Create experiment components for the first three planned experiments:
   - `apps/web/app/sign/components/petition-headline.tsx` (exp_petition_headline)
   - `apps/web/app/sign/components/petition-cta-button.tsx` (exp_petition_cta_text)
   - `apps/web/app/sign/thank-you/components/share-prompt.tsx` (exp_thankyou_share_prompt)
   
   Each component should render the control variant by default and use useExperiment() 
   to select the active variant.

4. `scripts/setup-posthog-experiments.ts` — Script that uses PostHog's API to 
   create the 6 planned experiments defined in §5.4 with proper variant definitions 
   and goal metrics. Include instructions for running it once during project setup.

Feature flags must be evaluated server-side first (no variant flickering). 
Client-side hooks consume the bootstrapped values.
```

### Handoff Prompt 4: Admin Dashboard Metrics

```
You are implementing the admin dashboard metrics for the Confluence Ohio campaign. 
Read artifact 13 (13-analytics-conversion-tracking.md) section 6.

Create the following:

1. `apps/web/app/api/admin/metrics/route.ts` — Admin-protected API route that 
   returns all dashboard metrics in a single response. Uses Promise.all for parallel 
   Supabase queries. Requires admin auth (use requireAdmin middleware from artifact 15).

2. SQL migration for new RPC functions:
   - get_average_donation() → integer (cents)
   - get_recurring_donation_pct() → numeric
   - get_top_referrers(p_limit integer) → table(first_name, last_initial, referral_code, conversion_count)
   - get_top_referral_platform() → table(platform, total_conversions)
   All functions are SECURITY DEFINER and STABLE.

3. `packages/core/analytics/compute-trend.ts` — computeTrend() utility for 
   calculating directional trends (up/down/flat) and percent change.

4. `apps/web/app/admin/hooks/use-live-signatures.ts` — Hook using Supabase 
   Realtime to subscribe to new signature inserts for a live feed.

5. Dashboard metric card components:
   - `apps/web/app/admin/components/metric-card.tsx` — displays value, label, 
     trend indicator, and optional progress bar
   - `apps/web/app/admin/components/dashboard-grid.tsx` — 3×3 grid layout 
     matching the wireframe in §6.1

All admin routes require authentication. All queries use the service_role client.
```

### Handoff Prompt 5: PostHog Alerts and Dashboard Setup Script

```
You are setting up PostHog dashboards and alerts for the Confluence Ohio campaign. 
Read artifact 13 (13-analytics-conversion-tracking.md) sections 7.

Create the following:

1. `scripts/setup-posthog-dashboards.ts` — Script using PostHog's API to create 
   the 5 recommended dashboards:
   - Campaign Overview (funnel + trends)
   - Petition Deep Dive (field completion, abandonment)
   - Sharing & Virality (platform breakdown, k-factor)
   - Donations (funnel, refcode performance)
   - Active Experiments (variant performance)
   
   Include insight definitions for each dashboard panel.

2. `scripts/setup-posthog-alerts.ts` — Script to create the 6 monitoring alerts:
   - Signature surge (>200/hour)
   - Signature drought (<5 in 4 hours, 8am-10pm ET)
   - Verification failure spike (>20%/hour)
   - High form abandonment (start→submit <40%)
   - Donation spike (>$500/hour)
   - Bot activity (>50 rate-limited/hour)
   
   Alerts send email to Tim.

3. `docs/analytics-runbook.md` — Operational guide explaining:
   - What each alert means and first-response actions
   - How to read the dashboards
   - How to create and evaluate A/B tests
   - How to add new tracked events
   - PostHog data retention and privacy settings

Both scripts should be runnable via `npx tsx scripts/setup-posthog-dashboards.ts` 
with POSTHOG_API_KEY in environment.
```

### Handoff Prompt 6: GA4 Integration and Cookie Consent Banner

```
You are adding Google Analytics 4 and a cookie consent banner to the Confluence 
Ohio campaign website. GA4 is included for Google ecosystem integration (audience 
building for paid Google Ads, Search Console, cross-platform attribution). 
Note: Ad Grants requires 501(c)(3) and is not applicable to this 501(c)(4) entity.
Read artifact 13 (13-analytics-conversion-tracking.md) section 2.7.

Create the following:

1. `apps/web/components/analytics/ga4-consent.tsx` — GA4ConsentLoader component 
   that only loads GA4 scripts after the user grants analytics consent. Uses 
   sessionStorage for consent state. Listens for 'analytics-consent' custom event.

2. `apps/web/components/analytics/cookie-banner.tsx` — Minimal cookie consent 
   banner. Two buttons: "Accept Analytics" and "Continue without tracking". 
   Dispatches 'analytics-consent' custom event on acceptance. Shows only when 
   GA4 is configured (NEXT_PUBLIC_GA4_ID is set).

3. Update `packages/core/analytics/track-event.ts` to dispatch events to GA4 
   via window.gtag() when available.

4. Update `apps/web/app/layout.tsx` to include GA4ConsentLoader and CookieBanner.

5. Set up GA4 key events (conversions) for:
   - petition_verification_success
   - donate_webhook_received
   - volunteer_form_submitted
   
   Document the GA4 dashboard setup for Google Ad Grants reporting.

GA4 must be consent-gated. PostHog continues to work in cookieless mode regardless 
of consent state. The cookie banner must meet GDPR requirements (no pre-checked boxes, 
clear opt-out, no tracking before consent).
```
