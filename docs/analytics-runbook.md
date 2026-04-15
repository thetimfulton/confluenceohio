# Analytics Runbook — Confluence Ohio

Operational guide for PostHog dashboards, alerts, A/B testing, and event tracking.

**Reference:** Artifact 13 (13-analytics-conversion-tracking.md) contains the full specification. This runbook is the quick-reference for day-to-day operations.

---

## 1. Alert Response Guide

All alerts send email to the configured alert address. When an alert fires, follow the response steps below.

### 1.1 Signature Surge (>200 signatures/hour)

**What it means:** Signature rate spiked to ~3x normal. Could be organic (media coverage, viral tweet) or malicious (bot attack).

**First response:**
1. Open the **Campaign Overview** dashboard. Check if traffic sources show a single referrer dominating.
2. Check the **Bot Activity** alert — if it also fired, likely a bot attack.
3. Open Cloudflare dashboard → Security → Events. Look for unusual IP patterns or countries.
4. Check Turnstile challenge pass rates. A sudden drop in challenge-pass rate suggests bots.
5. If organic: celebrate, monitor server load. If bot: enable Cloudflare "Under Attack" mode for `/api/petition/sign` and check rate limiter logs.

### 1.2 Signature Drought (<5 in 4 hours, 8am-10pm ET)

**What it means:** Almost no signatures during hours when traffic is expected. Something is probably broken.

**First response:**
1. Visit the live site at https://confluenceohio.org/sign — does the form load?
2. Check Vercel deployment status. Was there a recent deploy that might have broken the form?
3. Check the **Petition Deep Dive** dashboard — are form starts happening but submits are zero? (broken submit handler)
4. Check Supabase dashboard — is the database reachable? Are there connection errors?
5. Check Smarty status page (status.smarty.com) — is address verification down?
6. Check PostHog itself — are events still being received? (Could be an analytics outage, not a site outage.)

### 1.3 Verification Failure Spike (>20% failure rate/hour)

**What it means:** More than 1 in 5 form submissions are failing verification. Normal is <5%.

**First response:**
1. Open **Petition Deep Dive** → Verification Failure Reasons chart. Which reason dominates?
   - `invalid_address` — Smarty might be down or misconfigured. Check Smarty dashboard.
   - `non_ohio` — Possible out-of-state media coverage driving non-Ohio signups. Not a bug — consider adding clearer "Ohio residents only" messaging.
   - `duplicate_address` — Repeat visitors or coordinated attempt. Check for patterns.
   - `duplicate_email` — Same as above.
   - `rate_limited` — Rate limiter is firing. Check Bot Activity alert.
   - `turnstile_failed` — Cloudflare Turnstile issues. Check Turnstile dashboard.
2. If `invalid_address` is dominant and Smarty is healthy, check the most recent deploy for changes to the address normalization code.

### 1.4 High Form Abandonment (start-to-submit <40%)

**What it means:** People are starting the petition form but not finishing. Normal is 60-70%.

**First response:**
1. Open PostHog Session Replays. Filter to sessions that include `petition_form_started` but NOT `petition_form_submitted` in the last hour.
2. Watch 3-5 replays to identify the pattern. Common causes:
   - Autocomplete not loading (Smarty key issue or embed key rate limit)
   - Confusing error messages on address field
   - Mobile layout issue making submit button unreachable
   - Slow response from verification making users think the form is broken
3. Check **Petition Deep Dive** → Average Time-to-Complete per Field. If one field shows a spike, that's likely the problem field.

### 1.5 Donation Spike (>$500/hour)

**What it means:** Donations spiked significantly. Usually good news.

**First response:**
1. Check the **Donations** dashboard → Refcode Performance. Is this driven by a specific source?
2. Check ActBlue dashboard for any flagged transactions (card testing attacks use many small donations).
3. If organic: note the source for future campaign strategy. If suspicious: ActBlue handles fraud detection, but monitor for chargebacks.

### 1.6 Bot Activity (>50 rate-limited/hour)

**What it means:** The rate limiter is blocking an unusual number of requests. Likely automated.

**First response:**
1. Check Cloudflare dashboard → Security → Events. Look for:
   - Single IP or small IP range generating most requests
   - Unusual country distribution
   - User-agent patterns (empty, curl, headless Chrome)
2. If concentrated from a few IPs: add a Cloudflare WAF rule to block them.
3. If distributed: increase Turnstile difficulty from "Managed" to "Interactive" temporarily.
4. Check that rate-limited requests are NOT consuming Smarty API credits (they shouldn't — rate limiting happens before verification).

---

## 2. Dashboard Guide

### 2.1 Campaign Overview

The primary health dashboard. Check this daily.

| Panel | What to look for |
|-------|-----------------|
| Signature Funnel | Step-over-step conversion. Any step below its benchmark (see §4.1 of Artifact 13) needs investigation. |
| Daily Unique Visitors | Overall traffic trend. Correlate spikes with press/social activity. |
| Daily Signatures | Absolute signature count. Compare to the campaign's weekly targets. |
| Top Traffic Sources | Where traffic comes from. Tells you which channels to invest in. |
| Referral K-Factor | Viral coefficient components. K > 0.3 is healthy; K > 1.0 is viral. |

### 2.2 Petition Deep Dive

Use when you need to diagnose form issues or optimize conversion.

| Panel | What to look for |
|-------|-----------------|
| Field Completion Rates | Which fields people complete. A field with low completion relative to the one before it is a friction point. |
| Time-to-Complete per Field | A sudden increase in time for a field suggests confusion or a UX issue. |
| Autocomplete Usage Rate | Target >70% autocomplete usage. If manual entry is high, check that the Smarty autocomplete is loading. |
| Verification Failure Reasons | Distribution of failure types. Should be dominated by `non_ohio` (expected), not `invalid_address` (bug). |
| Form Abandonment Point | The funnel view shows exactly where users drop off in the form flow. |

### 2.3 Sharing & Virality

Use to understand which social platforms drive referrals and which referrers are most effective.

| Panel | What to look for |
|-------|-----------------|
| Share Clicks by Platform | Which platforms people use to share. Invest design effort in the top 2-3. |
| Referral Conversion by Platform | Not all share platforms convert equally. A platform with high shares but low conversions may need better landing page handling. |
| Top 10 Referrers | Your most valuable advocates. Consider reaching out to thank them or ask them to volunteer. |
| Viral Coefficient Trend | Watch for K-factor trending up (campaign is growing virally) or down (sharing fatigue). |

### 2.4 Donations

Use to understand donation patterns and optimize the donation flow.

| Panel | What to look for |
|-------|-----------------|
| Donation Funnel | Drop-off between embed loaded and donation initiated is the key optimization point. |
| Average Donation | Trending up is good. A sudden drop might mean the default amount experiment needs adjustment. |
| Recurring vs. One-Time | Recurring donors are far more valuable. If recurring is <10%, consider emphasizing it more. |
| Refcode Performance | Shows which traffic sources and campaigns drive the most donation revenue. |
| Donations by Day of Week | Helps time donation asks (email campaigns, social pushes). |

### 2.5 Active Experiments

Use to monitor running A/B tests.

Each experiment panel shows cumulative goal metric performance per variant. Look for:

- **Divergence:** When variant lines clearly separate, there's a real difference.
- **Convergence after divergence:** Early differences that fade are likely noise. Wait for statistical significance.
- **Sample size:** Each variant needs ~500 visitors before results are meaningful (PostHog shows significance indicators).

Do NOT end an experiment early because one variant "looks better" in the first few days unless it's causing harm. See the A/B testing section below.

---

## 3. A/B Testing Guide

### 3.1 Creating a New Experiment

1. **Define the hypothesis.** What are you testing, and what metric should improve?
2. **Create the feature flag** in PostHog (Experiments → New Experiment), or run `scripts/setup-posthog-experiments.ts` if the experiment is one of the 6 planned ones.
3. **Implement the variant** in code using the `useExperiment()` hook:
   ```tsx
   const { variant, isControl } = useExperiment('exp_my_test');
   ```
4. **Set the goal metric** in PostHog's experiment settings.
5. **Launch** when you have sufficient traffic (~500 visitors/variant/week).

### 3.2 Evaluating Experiment Results

1. Wait for PostHog to show **statistical significance** (p < 0.05). This typically takes 2-4 weeks depending on traffic.
2. Check the **Active Experiments** dashboard for the cumulative conversion chart.
3. Look for:
   - **Clear winner:** One variant is significantly better and consistent over time. Ship it.
   - **No difference:** Variants perform within noise of each other. Either pick the simpler implementation or end the test and try a bigger change.
   - **Mixed signals:** Variant is better on the primary metric but worse on a secondary metric. Discuss before shipping.
4. **End the experiment** by setting the feature flag to 100% for the winning variant, then remove the feature flag code in a follow-up PR.

### 3.3 Experiment Hygiene

- Run only **one experiment per page** at a time to avoid interaction effects.
- Don't change the page while an experiment is running (it invalidates results).
- If you must stop an experiment early (e.g., a variant is clearly broken), stop it — but do not declare a winner from incomplete data.
- Document the result (winner, magnitude of improvement, sample size) in a comment on the PostHog experiment.

---

## 4. Adding New Tracked Events

### 4.1 Client-Side Events

Use the `trackEvent()` function from `packages/core/analytics/track-event.ts`:

```typescript
import { trackEvent } from '@/packages/core/analytics/track-event';

trackEvent('my_new_event', {
  property_key: 'value',
  numeric_property: 42,
});
```

### 4.2 Server-Side Events

Use the server-side PostHog client from `packages/core/analytics/posthog-server.ts`:

```typescript
import { captureServerEvent } from '@/packages/core/analytics/posthog-server';

captureServerEvent({
  distinctId: userIdentifier, // Use hashed email, never raw PII
  event: 'my_server_event',
  properties: {
    property_key: 'value',
  },
});
```

### 4.3 Event Naming Conventions

Follow these rules for consistency with the existing event taxonomy (Artifact 13 §3):

- Use **snake_case** for event names and property keys.
- Prefix with the feature area: `petition_`, `donate_`, `volunteer_`, `voice_`, `share_`, `blog_`.
- Use `_viewed` for page/section views, `_started` for first interaction, `_submitted` for form submits, `_completed` for successful server-side processing.
- Include relevant context as properties, not in the event name. E.g., `share_button_clicked` with `{ platform: 'twitter' }`, not `share_twitter_clicked`.

### 4.4 After Adding an Event

1. Test locally by checking the PostHog debug console (enable with `posthog.debug()`).
2. Add the event to the event taxonomy table in `docs/13-analytics-conversion-tracking.md` §3.
3. If the event should appear on a dashboard, add an insight definition to the relevant dashboard in `scripts/setup-posthog-dashboards.ts` and re-run the script.
4. If the event needs an alert, add it to `scripts/setup-posthog-alerts.ts` and re-run.

---

## 5. PostHog Data Retention and Privacy

### 5.1 Privacy Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Persistence mode | `memory` (cookieless) | No persistent cookies. GDPR-compliant without consent for PostHog. |
| Session replay PII masking | `maskAllInputs: true` | All form field values are masked in recordings. |
| Sensitive element blocking | `[data-ph-block]` selector | Elements tagged with `data-ph-block` are completely hidden from recordings. |
| Do Not Track | `respect_dnt: true` | Honors browser DNT setting. |
| User identification | Hashed email only | `posthog.identify()` is called with a SHA-256 hash of the email, never the raw address. |

### 5.2 Data Retention

PostHog Free tier retention defaults:

| Data type | Retention |
|-----------|-----------|
| Events | 1 year |
| Session recordings | 1 month |
| Feature flag decisions | 1 year |

When approaching the 1M events/month free tier limit:
1. Check current usage at PostHog → Settings → Billing.
2. If consistently above 80%, consider:
   - Reducing session replay sample rate (currently 100%)
   - Excluding high-volume low-value events (e.g., `$pageleave`)
   - Upgrading to usage-based pricing

### 5.3 Data Subject Requests (GDPR/CCPA)

If a user requests deletion of their data:

1. **PostHog:** Use the PostHog UI → Persons → search by the hashed email identifier → Delete person. This removes all events and properties for that person.
2. **Supabase:** Follow the signature deletion process in the petition flow (Artifact 06).
3. **GA4:** GA4 does not support individual user deletion in standard mode. Since GA4 data is anonymized and consent-gated, this is typically acceptable. For specific requests, use the GA4 User Deletion API.

### 5.4 What We Never Track

- Raw email addresses (always hashed before sending to PostHog)
- Physical addresses (never sent to analytics)
- IP addresses in PostHog (cookieless mode anonymizes by default)
- Form field values in session replays (masked)
- Voter registration data, party affiliation, or demographics (we don't collect these at all)

---

## 6. Script Reference

### Setup Scripts

All scripts require these environment variables:

```bash
export POSTHOG_API_KEY=phx_...          # Personal API key (not project key)
export POSTHOG_PROJECT_ID=12345         # Numeric project ID
export POSTHOG_HOST=https://us.i.posthog.com  # Optional, defaults shown
export ALERT_EMAIL=tim@confluenceohio.org      # For alerts script only
```

| Script | Purpose | Command |
|--------|---------|---------|
| `setup-posthog-dashboards.ts` | Create 5 monitoring dashboards with insight panels | `npx tsx scripts/setup-posthog-dashboards.ts` |
| `setup-posthog-alerts.ts` | Create 6 anomaly detection alerts | `npx tsx scripts/setup-posthog-alerts.ts` |
| `setup-posthog-experiments.ts` | Create 6 planned A/B test experiments | `npx tsx scripts/setup-posthog-experiments.ts` |

All scripts are **idempotent** — they check for existing resources by name and skip duplicates. Safe to re-run.

### Post-Setup Manual Steps

After running the scripts, complete these steps in the PostHog UI:

1. **Signature Drought alert:** Configure to only fire during 8am-10pm ET (PostHog UI → Insight → Alert settings → Schedule).
2. **Threshold alerts:** If your PostHog version doesn't support the alerts API, the script creates email subscriptions instead. Convert these to threshold-based alerts in the UI.
3. **Active Experiments dashboard:** Pin to the PostHog sidebar for quick access during experiment runs.
4. **Session replay:** Verify that form field masking is working by watching a test recording on `/sign`.

---

## 7. GA4 Key Events (Conversions) Setup

GA4 is consent-gated and loads only after users accept the cookie banner. It serves as a supplement to PostHog for Google ecosystem integration (Search Console, audience building for paid Google Ads, cross-platform attribution).

**Note:** Google Ad Grants is unavailable to 501(c)(4) organizations. GA4 is included for paid Google Ads audience building and Search Console integration, not for Ad Grants.

### 7.1 Configure Key Events in GA4

After GA4 starts receiving data, configure these three key events (formerly "conversions") in the GA4 dashboard:

1. **Go to:** GA4 Admin → Data display → Events
2. **Mark as key events** (toggle the star icon):

| Event Name | Source | What It Measures |
|---|---|---|
| `petition_verification_success` | Client-side (PetitionForm) + server-side (API route) | Completed petition signature with verified Ohio address |
| `donate_webhook_received` | Server-side only (ActBlue webhook) | Confirmed donation processed via ActBlue |
| `volunteer_form_submitted` | Client-side (volunteer form) | Completed volunteer signup |

**Important:** `donate_webhook_received` fires server-side via PostHog. GA4 only receives it if the donor's browser had GA4 loaded (consent granted) and the client-side `trackEvent` call fires. For accurate donation tracking, rely on PostHog (server-side) as the source of truth. GA4 donation data will undercount.

### 7.2 GA4 Audiences for Google Ads

Create these audiences in GA4 for paid Google Ads targeting:

1. **Petition Signers** — Users who triggered `petition_verification_success`. Use for lookalike audiences.
2. **Engaged Visitors** — Users with 2+ sessions or 3+ page views. Use for remarketing.
3. **Volunteer Prospects** — Users who viewed `/volunteer` but did not trigger `volunteer_form_submitted`. Use for retargeting.

**Path:** GA4 Admin → Data display → Audiences → New audience → Create custom audience.

### 7.3 Search Console Integration

1. **GA4 Admin → Product links → Search Console links → Link**
2. Select the verified `confluenceohio.org` property.
3. This enables Search Console data (queries, impressions, clicks) to appear in GA4 reports under Acquisition → Search Console.

### 7.4 Verifying the Cookie Consent Flow

Test the end-to-end consent flow:

1. Open the site in an incognito window.
2. Verify the cookie banner appears at the bottom of the page.
3. Open DevTools → Application → Session Storage. Confirm no `analytics_consent` key exists.
4. Click "Continue without tracking". Confirm:
   - Banner disappears
   - `analytics_consent` is set to `denied` in sessionStorage
   - No `gtag` requests in the Network tab
5. Open a new incognito window. This time click "Accept Analytics". Confirm:
   - Banner disappears
   - `analytics_consent` is set to `granted` in sessionStorage
   - `gtag/js` script loads in the Network tab
   - GA4 pageview fires (filter Network for `google-analytics.com`)
6. Refresh the page. Confirm the banner does not reappear (consent remembered for the session).
7. Close and reopen the browser. Confirm the banner reappears (sessionStorage cleared).
