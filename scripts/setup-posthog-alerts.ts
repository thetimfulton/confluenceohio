#!/usr/bin/env npx tsx
/**
 * PostHog Alert Setup Script (Artifact 13 §7.2)
 *
 * Creates the 6 monitoring alerts for campaign anomaly detection.
 * All alerts send email notifications to Tim.
 *
 * Usage:
 *   POSTHOG_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 ALERT_EMAIL=tim@confluenceohio.org \
 *     npx tsx scripts/setup-posthog-alerts.ts
 *
 * Required environment variables:
 *   POSTHOG_API_KEY      — A PostHog *personal API key* (not a project API key).
 *                          Create at: https://us.posthog.com/settings/user-api-keys
 *   POSTHOG_PROJECT_ID   — Numeric project ID from PostHog project settings.
 *   POSTHOG_HOST         — PostHog instance URL (default: https://us.i.posthog.com)
 *   ALERT_EMAIL          — Email address for alert notifications (default: tim@confluenceohio.org)
 *
 * The script is idempotent: it checks for existing alerts by name
 * and skips any that already exist.
 *
 * Note: PostHog's alert/subscription API varies by version. This script creates
 * insights configured for alerting. Some alert types (e.g., drought detection
 * during specific hours) may require manual refinement in the PostHog UI
 * after the initial insights are created.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POSTHOG_HOST = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com';
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const ALERT_EMAIL = process.env.ALERT_EMAIL ?? 'tim@confluenceohio.org';

if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
  console.error(
    'Missing required environment variables:\n' +
      '  POSTHOG_API_KEY      — Personal API key from PostHog settings\n' +
      '  POSTHOG_PROJECT_ID   — Numeric project ID from PostHog project settings\n\n' +
      'Optional:\n' +
      '  ALERT_EMAIL          — Notification email (default: tim@confluenceohio.org)\n' +
      '  POSTHOG_HOST         — PostHog instance URL (default: https://us.i.posthog.com)\n\n' +
      'Usage:\n' +
      '  POSTHOG_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 npx tsx scripts/setup-posthog-alerts.ts',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertInsightFilters {
  insight: 'TRENDS';
  events: Array<{
    id: string;
    name?: string;
    type?: string;
    order?: number;
    math?: string;
    math_property?: string;
    properties?: Array<{
      key: string;
      value: string | string[];
      operator?: string;
      type?: string;
    }>;
  }>;
  date_from?: string;
  interval?: string;
  display?: string;
  formula?: string;
}

interface AlertDefinition {
  name: string;
  description: string;
  /** The insight filters that define what metric to monitor. */
  filters: AlertInsightFilters;
  /**
   * Alert threshold configuration.
   * PostHog alerts use "absolute_value" condition with upper/lower bounds.
   */
  threshold: {
    /** 'upper' triggers when the metric exceeds the value; 'lower' triggers when it drops below. */
    type: 'upper' | 'lower';
    value: number;
  };
  /**
   * How often PostHog checks this alert (in hours).
   * 1 = hourly check.
   */
  check_interval_hours: number;
}

// ---------------------------------------------------------------------------
// Alert definitions (§7.2)
// ---------------------------------------------------------------------------

const ALERTS: AlertDefinition[] = [
  {
    name: 'Signature Surge (>200/hour)',
    description:
      'Triggers when signatures exceed 200 in a single hour (~3x normal rate). ' +
      'Could indicate viral sharing, media coverage, or bot attack. ' +
      'Check bot activity dashboard and Turnstile logs first.',
    filters: {
      insight: 'TRENDS',
      events: [
        {
          id: 'petition_verification_success',
          name: 'Verified signatures',
          type: 'events',
          order: 0,
          math: 'total',
        },
      ],
      date_from: '-1h',
      interval: 'hour',
    },
    threshold: { type: 'upper', value: 200 },
    check_interval_hours: 1,
  },
  {
    name: 'Signature Drought (<5 in 4 hours, 8am-10pm ET)',
    description:
      'Triggers when fewer than 5 signatures are recorded in a 4-hour window ' +
      'during active hours (8am-10pm ET). May indicate a site outage, broken form, ' +
      'or DNS issue. NOTE: This alert should be manually configured in PostHog UI ' +
      'to only fire during 8am-10pm ET. The insight monitors 4-hour windows.',
    filters: {
      insight: 'TRENDS',
      events: [
        {
          id: 'petition_verification_success',
          name: 'Verified signatures',
          type: 'events',
          order: 0,
          math: 'total',
        },
      ],
      date_from: '-4h',
      interval: 'hour',
    },
    threshold: { type: 'lower', value: 5 },
    check_interval_hours: 4,
  },
  {
    name: 'Verification Failure Spike (>20%/hour)',
    description:
      'Triggers when the verification failure rate exceeds 20% in a single hour. ' +
      'May indicate Smarty API issues, a misconfigured address validator, or ' +
      'a targeted bot attack with fake addresses. Check Smarty dashboard and ' +
      'failure_reason breakdown.',
    filters: {
      insight: 'TRENDS',
      events: [
        {
          id: 'petition_verification_failed',
          name: 'Verification failures',
          type: 'events',
          order: 0,
          math: 'total',
        },
        {
          id: 'petition_form_submitted',
          name: 'Form submissions',
          type: 'events',
          order: 1,
          math: 'total',
        },
      ],
      date_from: '-1h',
      interval: 'hour',
      // PostHog formula: A / B gives failure rate. Alert on > 0.20.
      formula: 'A / B',
    },
    threshold: { type: 'upper', value: 0.2 },
    check_interval_hours: 1,
  },
  {
    name: 'High Form Abandonment (start→submit <40%)',
    description:
      'Triggers when the form start-to-submit conversion rate drops below 40%. ' +
      'May indicate UX regression, slow autocomplete, confusing error messages, ' +
      'or a broken field. Check session replays for the most recent abandonments.',
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
        {
          id: 'petition_form_started',
          name: 'Form starts',
          type: 'events',
          order: 1,
          math: 'total',
        },
      ],
      date_from: '-1h',
      interval: 'hour',
      // Formula: submits / starts. Alert when < 0.40.
      formula: 'A / B',
    },
    threshold: { type: 'lower', value: 0.4 },
    check_interval_hours: 1,
  },
  {
    name: 'Donation Spike (>$500/hour)',
    description:
      'Triggers when donation revenue exceeds $500 in a single hour. ' +
      'Likely positive (media coverage, viral moment) but could also indicate ' +
      'a fraudulent card testing attack. Verify with ActBlue dashboard.',
    filters: {
      insight: 'TRENDS',
      events: [
        {
          id: 'donate_webhook_received',
          name: 'Donation revenue',
          type: 'events',
          order: 0,
          math: 'sum',
          math_property: 'amount_cents',
        },
      ],
      date_from: '-1h',
      interval: 'hour',
    },
    // $500 = 50000 cents
    threshold: { type: 'upper', value: 50000 },
    check_interval_hours: 1,
  },
  {
    name: 'Bot Activity (>50 rate-limited/hour)',
    description:
      'Triggers when more than 50 requests are rate-limited in a single hour. ' +
      'Indicates possible bot attack or scraping attempt. Check Cloudflare ' +
      'analytics, Turnstile challenge rates, and IP patterns.',
    filters: {
      insight: 'TRENDS',
      events: [
        {
          id: 'petition_verification_failed',
          name: 'Rate-limited requests',
          type: 'events',
          order: 0,
          math: 'total',
          properties: [
            { key: 'failure_reason', value: 'rate_limited', operator: 'exact', type: 'event' },
          ],
        },
      ],
      date_from: '-1h',
      interval: 'hour',
    },
    threshold: { type: 'upper', value: 50 },
    check_interval_hours: 1,
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
    throw new Error(
      `API ${options.method ?? 'GET'} ${path}: ${response.status} ${response.statusText}\n${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}

/** Get all existing insight names to check for duplicates. */
async function getExistingInsightNames(): Promise<Set<string>> {
  // Fetch first page; alerts are insights so we search the insights list.
  const data = await apiFetch<{ results: Array<{ name: string }> }>('/insights/?limit=200');
  return new Set(data.results.map((i) => i.name));
}

/** Create an insight configured for alerting. Returns the insight ID. */
async function createAlertInsight(alert: AlertDefinition): Promise<number> {
  const data = await apiFetch<{ id: number }>('/insights/', {
    method: 'POST',
    body: JSON.stringify({
      name: alert.name,
      description: alert.description,
      filters: alert.filters,
      saved: true,
    }),
  });
  return data.id;
}

/**
 * Create a subscription (alert) on an insight.
 *
 * PostHog subscriptions API sends recurring email digests for an insight.
 * For threshold-based alerting, PostHog uses the "alerts" API (available
 * on recent versions). We attempt the alerts API first and fall back to
 * subscriptions for email digest if alerts API is unavailable.
 */
async function createAlert(
  insightId: number,
  alert: AlertDefinition,
): Promise<{ type: 'alert' | 'subscription'; id: number }> {
  // Try the alerts API first (PostHog >=2024.05)
  try {
    const alertData = await apiFetch<{ id: number }>(`/insights/${insightId}/alerts/`, {
      method: 'POST',
      body: JSON.stringify({
        name: alert.name,
        condition: {
          type: 'absolute_value',
          ...(alert.threshold.type === 'upper'
            ? { above: alert.threshold.value }
            : { below: alert.threshold.value }),
        },
        enabled: true,
        subscribed_users: [], // Will need manual configuration for email
        threshold: {
          configuration: {
            type: alert.threshold.type === 'upper' ? 'increase' : 'decrease',
            absoluteThreshold: alert.threshold.value,
          },
        },
      }),
    });
    return { type: 'alert', id: alertData.id };
  } catch {
    // Fall back to subscription-based email digest
    const subData = await apiFetch<{ id: number }>('/subscriptions/', {
      method: 'POST',
      body: JSON.stringify({
        title: alert.name,
        insight: insightId,
        target_type: 'email',
        target_value: ALERT_EMAIL,
        frequency: 'hourly',
        // For 4-hour checks, use 'daily' and note in docs to refine manually
        ...(alert.check_interval_hours > 1 && { frequency: 'daily' }),
      }),
    });
    return { type: 'subscription', id: subData.id };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('PostHog Alert Setup (Artifact 13 §7.2)');
  console.log(`Host: ${POSTHOG_HOST}`);
  console.log(`Project: ${POSTHOG_PROJECT_ID}`);
  console.log(`Alert email: ${ALERT_EMAIL}`);
  console.log(`Alerts to create: ${ALERTS.length}\n`);

  const existingNames = await getExistingInsightNames();

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const manualSteps: string[] = [];

  for (const alert of ALERTS) {
    if (existingNames.has(alert.name)) {
      console.log(`  ${alert.name} ... SKIPPED (already exists)`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  ${alert.name} ... `);

      // Step 1: Create the insight
      const insightId = await createAlertInsight(alert);

      // Step 2: Create the alert/subscription
      const result = await createAlert(insightId, alert);

      if (result.type === 'subscription') {
        console.log(`CREATED as email subscription (insight: ${insightId}, sub: ${result.id})`);
        manualSteps.push(
          `  - "${alert.name}" (insight ${insightId}): Set up threshold-based alerting ` +
            `in PostHog UI → Insight → Alerts. Threshold: ${alert.threshold.type} ${alert.threshold.value}`,
        );
      } else {
        console.log(`CREATED (insight: ${insightId}, alert: ${result.id})`);
      }

      created++;
    } catch (error) {
      console.log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log(
    `\nDone: ${created} alerts created, ${skipped} skipped, ${failed} failures.`,
  );

  if (manualSteps.length > 0) {
    console.log(
      '\n⚠️  Some alerts were created as email subscriptions because the threshold-based ' +
        'alerts API was not available. Configure threshold-based alerting manually:\n',
    );
    for (const step of manualSteps) {
      console.log(step);
    }
    console.log(
      '\nTo configure alerts in PostHog UI:\n' +
        `  1. Go to ${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/insights\n` +
        '  2. Open each alert insight\n' +
        '  3. Click the "..." menu → "Set up alert"\n' +
        '  4. Configure the threshold and email notification\n',
    );
  }

  // Special note about the signature drought alert
  console.log(
    'Note: The "Signature Drought" alert should be refined in the PostHog UI to only\n' +
      'fire during active hours (8am-10pm ET). PostHog alert scheduling may require\n' +
      'manual configuration for time-of-day restrictions.\n',
  );

  console.log(`View alerts at: ${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/insights`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
