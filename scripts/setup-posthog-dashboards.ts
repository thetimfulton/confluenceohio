#!/usr/bin/env npx tsx
/**
 * PostHog Dashboard Setup Script (Artifact 13 §7.1)
 *
 * Creates the 5 recommended dashboards with insight panels in PostHog using
 * the HTTP API. Run once during project setup, or to bootstrap dashboards in
 * a new environment.
 *
 * Usage:
 *   POSTHOG_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 npx tsx scripts/setup-posthog-dashboards.ts
 *
 * Required environment variables:
 *   POSTHOG_API_KEY      — A PostHog *personal API key* (not a project API key).
 *                          Create at: https://us.posthog.com/settings/user-api-keys
 *   POSTHOG_PROJECT_ID   — Numeric project ID from PostHog project settings.
 *   POSTHOG_HOST         — PostHog instance URL (default: https://us.i.posthog.com)
 *
 * The script is idempotent: it checks for existing dashboards by name
 * and skips any that already exist.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POSTHOG_HOST = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com';
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;

if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
  console.error(
    'Missing required environment variables:\n' +
      '  POSTHOG_API_KEY      — Personal API key from PostHog settings\n' +
      '  POSTHOG_PROJECT_ID   — Numeric project ID from PostHog project settings\n\n' +
      'Usage:\n' +
      '  POSTHOG_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 npx tsx scripts/setup-posthog-dashboards.ts',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** PostHog insight filter types (subset needed for our dashboards). */
interface InsightFilter {
  insight: 'TRENDS' | 'FUNNELS' | 'RETENTION' | 'PATHS' | 'LIFECYCLE';
  events?: Array<{
    id: string;
    name?: string;
    type?: string;
    order?: number;
    properties?: Array<{
      key: string;
      value: string | string[];
      operator?: string;
      type?: string;
    }>;
    math?: string;
    math_property?: string;
  }>;
  actions?: Array<{
    id: number;
    name?: string;
    type?: string;
    order?: number;
    math?: string;
  }>;
  display?: string;
  date_from?: string;
  interval?: string;
  breakdown?: string;
  breakdown_type?: string;
  properties?: Array<{
    key: string;
    value: string | string[];
    operator?: string;
    type?: string;
  }>;
  formula?: string;
  funnel_viz_type?: string;
  funnel_order_type?: string;
}

interface InsightDefinition {
  name: string;
  description?: string;
  filters: InsightFilter;
}

interface DashboardDefinition {
  name: string;
  description: string;
  insights: InsightDefinition[];
}

// ---------------------------------------------------------------------------
// Dashboard definitions (§7.1)
// ---------------------------------------------------------------------------

const DASHBOARDS: DashboardDefinition[] = [
  // -------------------------------------------------------------------------
  // Dashboard 1: Campaign Overview
  // -------------------------------------------------------------------------
  {
    name: 'Confluence Ohio — Campaign Overview',
    description:
      'High-level campaign health: signature funnel, traffic trends, top sources, and referral performance.',
    insights: [
      {
        name: 'Signature Funnel (Visit → Sign → Share)',
        description: 'Primary 7-step conversion funnel from §4.1',
        filters: {
          insight: 'FUNNELS',
          events: [
            { id: '$pageview', name: 'Pageview', type: 'events', order: 0 },
            { id: 'petition_page_viewed', name: 'Petition page viewed', type: 'events', order: 1 },
            { id: 'petition_form_started', name: 'Form started', type: 'events', order: 2 },
            { id: 'petition_form_submitted', name: 'Form submitted', type: 'events', order: 3 },
            {
              id: 'petition_verification_success',
              name: 'Verification success',
              type: 'events',
              order: 4,
            },
            {
              id: 'petition_thankyou_viewed',
              name: 'Thank-you viewed',
              type: 'events',
              order: 5,
            },
            {
              id: 'share_button_clicked',
              name: 'Share clicked (post-signature)',
              type: 'events',
              order: 6,
              properties: [
                { key: 'context', value: 'post_signature', operator: 'exact', type: 'event' },
              ],
            },
          ],
          date_from: '-30d',
          funnel_viz_type: 'steps',
          funnel_order_type: 'ordered',
        },
      },
      {
        name: 'Daily Unique Visitors',
        description: 'Unique visitors per day (trend)',
        filters: {
          insight: 'TRENDS',
          events: [
            { id: '$pageview', name: 'Pageview', type: 'events', order: 0, math: 'dau' },
          ],
          date_from: '-30d',
          interval: 'day',
          display: 'ActionsLineGraph',
        },
      },
      {
        name: 'Daily Signatures',
        description: 'New verified signatures per day',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'petition_verification_success',
              name: 'Signatures',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          display: 'ActionsLineGraph',
        },
      },
      {
        name: 'Top Traffic Sources',
        description: 'Visitors broken down by utm_source',
        filters: {
          insight: 'TRENDS',
          events: [
            { id: '$pageview', name: 'Pageview', type: 'events', order: 0, math: 'dau' },
          ],
          date_from: '-30d',
          interval: 'week',
          breakdown: '$utm_source',
          breakdown_type: 'event',
          display: 'ActionsBarValue',
        },
      },
      {
        name: 'Referral K-Factor (Shares per Signer × Conversion Rate)',
        description:
          'Computed viral coefficient: (share_button_clicked / petition_verification_success) × (referral_conversion / share_button_clicked)',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'share_button_clicked',
              name: 'Shares',
              type: 'events',
              order: 0,
              math: 'total',
            },
            {
              id: 'petition_verification_success',
              name: 'Signatures',
              type: 'events',
              order: 1,
              math: 'total',
            },
            {
              id: 'referral_conversion',
              name: 'Referral conversions',
              type: 'events',
              order: 2,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'week',
          // k = (A / B) × (C / A) = C / B. Display all three for manual calculation.
          display: 'ActionsLineGraph',
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Dashboard 2: Petition Deep Dive
  // -------------------------------------------------------------------------
  {
    name: 'Confluence Ohio — Petition Deep Dive',
    description:
      'Detailed petition form analytics: field completion rates, timing, autocomplete usage, verification failures, and abandonment.',
    insights: [
      {
        name: 'Form Field Completion Rates',
        description: 'Count of petition_field_completed events broken down by field_name',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'petition_field_completed',
              name: 'Field completed',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: 'field_name',
          breakdown_type: 'event',
          display: 'ActionsBarValue',
        },
      },
      {
        name: 'Average Time-to-Complete per Field',
        description: 'Average time_to_complete_ms for each form field',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'petition_field_completed',
              name: 'Avg time per field',
              type: 'events',
              order: 0,
              math: 'avg',
              math_property: 'time_to_complete_ms',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: 'field_name',
          breakdown_type: 'event',
          display: 'ActionsBarValue',
        },
      },
      {
        name: 'Autocomplete Usage Rate',
        description: 'Autocomplete selected vs. manual entry for address field',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'petition_address_autocomplete_selected',
              name: 'Autocomplete used',
              type: 'events',
              order: 0,
              math: 'total',
            },
            {
              id: 'petition_address_manual_entry',
              name: 'Manual entry',
              type: 'events',
              order: 1,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'week',
          display: 'ActionsBarValue',
        },
      },
      {
        name: 'Verification Failure Reasons',
        description: 'Breakdown of petition_verification_failed by failure_reason',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'petition_verification_failed',
              name: 'Verification failed',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: 'failure_reason',
          breakdown_type: 'event',
          display: 'ActionsPie',
        },
      },
      {
        name: 'Form Abandonment Point',
        description: 'Funnel showing where users drop off in the petition form',
        filters: {
          insight: 'FUNNELS',
          events: [
            {
              id: 'petition_page_viewed',
              name: 'Page viewed',
              type: 'events',
              order: 0,
            },
            {
              id: 'petition_form_started',
              name: 'Form started',
              type: 'events',
              order: 1,
            },
            {
              id: 'petition_form_submitted',
              name: 'Form submitted',
              type: 'events',
              order: 2,
            },
            {
              id: 'petition_verification_success',
              name: 'Verification success',
              type: 'events',
              order: 3,
            },
          ],
          date_from: '-30d',
          funnel_viz_type: 'steps',
          funnel_order_type: 'ordered',
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Dashboard 3: Sharing & Virality
  // -------------------------------------------------------------------------
  {
    name: 'Confluence Ohio — Sharing & Virality',
    description:
      'Social sharing metrics: platform breakdown, referral conversions, top referrers, and viral coefficient.',
    insights: [
      {
        name: 'Share Button Clicks by Platform',
        description: 'Stacked area chart of share_button_clicked by platform property',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'share_button_clicked',
              name: 'Share clicks',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: 'platform',
          breakdown_type: 'event',
          display: 'ActionsAreaGraph',
        },
      },
      {
        name: 'Referral Click → Conversion Rate by Platform',
        description: 'Funnel from share click to referral conversion, broken down by platform',
        filters: {
          insight: 'FUNNELS',
          events: [
            {
              id: 'share_button_clicked',
              name: 'Share clicked',
              type: 'events',
              order: 0,
            },
            {
              id: 'referral_link_clicked',
              name: 'Referral link clicked',
              type: 'events',
              order: 1,
            },
            {
              id: 'referral_conversion',
              name: 'Referral converted',
              type: 'events',
              order: 2,
            },
          ],
          date_from: '-30d',
          funnel_viz_type: 'steps',
          funnel_order_type: 'ordered',
          breakdown: 'platform',
          breakdown_type: 'event',
        },
      },
      {
        name: 'Top 10 Referrers',
        description: 'Users who generated the most referral conversions',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'referral_conversion',
              name: 'Referral conversions',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: 'referrer_code',
          breakdown_type: 'event',
          display: 'ActionsTable',
        },
      },
      {
        name: 'Viral Coefficient Trend',
        description:
          'K-factor components over time: shares per signer and conversion rate per share',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'share_button_clicked',
              name: 'Shares',
              type: 'events',
              order: 0,
              math: 'total',
              properties: [
                { key: 'context', value: 'post_signature', operator: 'exact', type: 'event' },
              ],
            },
            {
              id: 'referral_conversion',
              name: 'Referral conversions',
              type: 'events',
              order: 1,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'week',
          display: 'ActionsLineGraph',
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Dashboard 4: Donations
  // -------------------------------------------------------------------------
  {
    name: 'Confluence Ohio — Donations',
    description:
      'Donation analytics: funnel, average donation over time, recurring vs. one-time split, refcode performance, and time-of-day/day-of-week patterns.',
    insights: [
      {
        name: 'Donation Funnel',
        description: 'Full donation funnel from page view to webhook confirmation',
        filters: {
          insight: 'FUNNELS',
          events: [
            { id: '$pageview', name: 'Pageview', type: 'events', order: 0 },
            { id: 'donate_page_viewed', name: 'Donate page viewed', type: 'events', order: 1 },
            { id: 'donate_embed_loaded', name: 'Embed loaded', type: 'events', order: 2 },
            { id: 'donate_initiated', name: 'Donation initiated', type: 'events', order: 3 },
            {
              id: 'donate_webhook_received',
              name: 'Donation confirmed',
              type: 'events',
              order: 4,
            },
          ],
          date_from: '-30d',
          funnel_viz_type: 'steps',
          funnel_order_type: 'ordered',
        },
      },
      {
        name: 'Average Donation Over Time',
        description: 'Average amount_cents from donate_webhook_received, divided by 100',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'donate_webhook_received',
              name: 'Avg donation ($)',
              type: 'events',
              order: 0,
              math: 'avg',
              math_property: 'amount_cents',
            },
          ],
          date_from: '-30d',
          interval: 'week',
          display: 'ActionsLineGraph',
        },
      },
      {
        name: 'Recurring vs. One-Time Donations',
        description: 'Donation count broken down by recurring property',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'donate_webhook_received',
              name: 'Donations',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'week',
          breakdown: 'recurring',
          breakdown_type: 'event',
          display: 'ActionsBarValue',
        },
      },
      {
        name: 'Refcode Performance (Donation Revenue by Source)',
        description: 'Sum of amount_cents broken down by refcode',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'donate_webhook_received',
              name: 'Revenue by refcode',
              type: 'events',
              order: 0,
              math: 'sum',
              math_property: 'amount_cents',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: 'refcode',
          breakdown_type: 'event',
          display: 'ActionsTable',
        },
      },
      {
        name: 'Donations by Day of Week',
        description: 'Donation count by day of week pattern',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'donate_webhook_received',
              name: 'Donations',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-90d',
          interval: 'day',
          display: 'ActionsBarValue',
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Dashboard 5: Active Experiments
  // -------------------------------------------------------------------------
  {
    name: 'Confluence Ohio — Active Experiments',
    description:
      'A/B test monitoring: variant performance for each active experiment against its goal metric.',
    insights: [
      {
        name: 'exp_petition_headline — Form Start Rate by Variant',
        description: 'petition_form_started rate per variant of exp_petition_headline',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'petition_form_started',
              name: 'Form starts',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: '$feature/exp_petition_headline',
          breakdown_type: 'event',
          display: 'ActionsLineGraphCumulative',
        },
      },
      {
        name: 'exp_petition_cta_text — Submit Rate by Variant',
        description: 'petition_form_submitted rate per variant of exp_petition_cta_text',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'petition_form_submitted',
              name: 'Form submits',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: '$feature/exp_petition_cta_text',
          breakdown_type: 'event',
          display: 'ActionsLineGraphCumulative',
        },
      },
      {
        name: 'exp_petition_layout — Verification Success by Variant',
        description: 'petition_verification_success per variant of exp_petition_layout',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'petition_verification_success',
              name: 'Verification success',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: '$feature/exp_petition_layout',
          breakdown_type: 'event',
          display: 'ActionsLineGraphCumulative',
        },
      },
      {
        name: 'exp_thankyou_share_prompt — Share Rate by Variant',
        description: 'share_button_clicked per variant of exp_thankyou_share_prompt',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'share_button_clicked',
              name: 'Share clicks',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: '$feature/exp_thankyou_share_prompt',
          breakdown_type: 'event',
          display: 'ActionsLineGraphCumulative',
        },
      },
      {
        name: 'exp_donate_default_amount — Donation Rate by Variant',
        description: 'donate_webhook_received per variant of exp_donate_default_amount',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'donate_webhook_received',
              name: 'Donations confirmed',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: '$feature/exp_donate_default_amount',
          breakdown_type: 'event',
          display: 'ActionsLineGraphCumulative',
        },
      },
      {
        name: 'exp_homepage_hero — Petition Page Views by Variant',
        description: 'petition_page_viewed per variant of exp_homepage_hero',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'petition_page_viewed',
              name: 'Petition page views',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-30d',
          interval: 'day',
          breakdown: '$feature/exp_homepage_hero',
          breakdown_type: 'event',
          display: 'ActionsLineGraphCumulative',
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// PostHog API helpers
// ---------------------------------------------------------------------------

const API_BASE = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}`;

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API ${options.method ?? 'GET'} ${path}: ${response.status} ${response.statusText}\n${errorBody}`);
  }

  return response.json() as Promise<T>;
}

/** List existing dashboards and return a Set of names. */
async function getExistingDashboardNames(): Promise<Set<string>> {
  const data = await apiFetch<{ results: Array<{ name: string }> }>('/dashboards/');
  return new Set(data.results.map((d) => d.name));
}

/** Create a dashboard and return its numeric ID. */
async function createDashboard(name: string, description: string): Promise<number> {
  const data = await apiFetch<{ id: number }>('/dashboards/', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
  return data.id;
}

/** Create an insight (saved query) and return its ID. */
async function createInsight(insight: InsightDefinition, dashboardId: number): Promise<number> {
  const data = await apiFetch<{ id: number }>('/insights/', {
    method: 'POST',
    body: JSON.stringify({
      name: insight.name,
      description: insight.description ?? '',
      filters: insight.filters,
      dashboards: [dashboardId],
      saved: true,
    }),
  });
  return data.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('PostHog Dashboard Setup (Artifact 13 §7.1)');
  console.log(`Host: ${POSTHOG_HOST}`);
  console.log(`Project: ${POSTHOG_PROJECT_ID}`);
  console.log(`Dashboards to create: ${DASHBOARDS.length}\n`);

  const existingNames = await getExistingDashboardNames();

  let dashboardsCreated = 0;
  let dashboardsSkipped = 0;
  let insightsCreated = 0;
  let failed = 0;

  for (const dashboard of DASHBOARDS) {
    if (existingNames.has(dashboard.name)) {
      console.log(`  ${dashboard.name} ... SKIPPED (already exists)`);
      dashboardsSkipped++;
      continue;
    }

    try {
      process.stdout.write(`  ${dashboard.name} ... `);
      const dashboardId = await createDashboard(dashboard.name, dashboard.description);
      console.log(`CREATED (id: ${dashboardId})`);
      dashboardsCreated++;

      for (const insight of dashboard.insights) {
        try {
          process.stdout.write(`    ├─ ${insight.name} ... `);
          const insightId = await createInsight(insight, dashboardId);
          console.log(`OK (id: ${insightId})`);
          insightsCreated++;
        } catch (error) {
          console.log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log(
    `\nDone: ${dashboardsCreated} dashboards created, ${dashboardsSkipped} skipped, ` +
      `${insightsCreated} insights created, ${failed} failures.`,
  );

  if (dashboardsCreated > 0) {
    console.log(`\nView your dashboards at: ${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/dashboard`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
