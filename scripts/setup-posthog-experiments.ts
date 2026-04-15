#!/usr/bin/env npx tsx
/**
 * PostHog Experiment Setup Script (Artifact 13 §5.4)
 *
 * Creates the 6 planned A/B test experiments in PostHog using the HTTP API.
 * Run once during project setup, or to reset experiments in a new environment.
 *
 * Usage:
 *   POSTHOG_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 npx tsx scripts/setup-posthog-experiments.ts
 *
 * Required environment variables:
 *   POSTHOG_API_KEY      — A PostHog *personal API key* (not a project API key).
 *                          Create at: https://us.posthog.com/settings/user-api-keys
 *   POSTHOG_PROJECT_ID   — Numeric project ID from PostHog project settings.
 *   POSTHOG_HOST         — PostHog instance URL (default: https://us.i.posthog.com)
 *
 * The script is idempotent: it checks for existing feature flags by key
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
      '  POSTHOG_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 npx tsx scripts/setup-posthog-experiments.ts',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Experiment definitions (§5.4)
// ---------------------------------------------------------------------------

interface ExperimentVariant {
  key: string;
  name: string;
  rollout_percentage: number;
}

interface ExperimentDefinition {
  key: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  /** PostHog event name used as the primary goal metric. */
  goal_event: string;
}

const EXPERIMENTS: ExperimentDefinition[] = [
  {
    key: 'exp_petition_headline',
    name: 'Petition Page Headline',
    description:
      'Tests headline copy on /sign. Control: "Add Your Name to the Confluence Ohio Petition". ' +
      'variant_a: "22,000 Signatures Can Change Our City\'s Name". ' +
      'variant_b: "Where Two Rivers Meet, a New Name Begins".',
    variants: [
      { key: 'control', name: 'Control — Add Your Name', rollout_percentage: 34 },
      { key: 'variant_a', name: '22,000 Signatures', rollout_percentage: 33 },
      { key: 'variant_b', name: 'Two Rivers Meet', rollout_percentage: 33 },
    ],
    goal_event: 'petition_form_started',
  },
  {
    key: 'exp_petition_cta_text',
    name: 'Petition Submit Button Text',
    description:
      'Tests the submit button label on the petition form. ' +
      'Control: "Add My Name →". variant_a: "Sign the Petition →". variant_b: "I Support This →".',
    variants: [
      { key: 'control', name: 'Control — Add My Name', rollout_percentage: 34 },
      { key: 'variant_a', name: 'Sign the Petition', rollout_percentage: 33 },
      { key: 'variant_b', name: 'I Support This', rollout_percentage: 33 },
    ],
    goal_event: 'petition_form_submitted',
  },
  {
    key: 'exp_petition_layout',
    name: 'Petition Page Layout',
    description:
      'Tests form layout on desktop. Control: Two-column (form left, counter right). ' +
      'variant_a: Single-column (counter above, form below).',
    variants: [
      { key: 'control', name: 'Control — Two-column', rollout_percentage: 50 },
      { key: 'variant_a', name: 'Single-column', rollout_percentage: 50 },
    ],
    goal_event: 'petition_verification_success',
  },
  {
    key: 'exp_thankyou_share_prompt',
    name: 'Thank-You Share Prompt',
    description:
      'Tests the share CTA heading on the thank-you page. ' +
      'Control: "Share with friends". variant_a: "Every share = more signatures". ' +
      'variant_b: Social proof ("87% of signers share").',
    variants: [
      { key: 'control', name: 'Control — Share with friends', rollout_percentage: 34 },
      { key: 'variant_a', name: 'Every share = more signatures', rollout_percentage: 33 },
      { key: 'variant_b', name: '87% of signers share', rollout_percentage: 33 },
    ],
    goal_event: 'share_button_clicked',
  },
  {
    key: 'exp_donate_default_amount',
    name: 'Default Donation Amount',
    description:
      'Tests the pre-selected donation amount on ActBlue embed. ' +
      'Control: $25. variant_a: $10. variant_b: $50.',
    variants: [
      { key: 'control', name: 'Control — $25', rollout_percentage: 34 },
      { key: 'variant_a', name: '$10', rollout_percentage: 33 },
      { key: 'variant_b', name: '$50', rollout_percentage: 33 },
    ],
    goal_event: 'donate_webhook_received',
  },
  {
    key: 'exp_homepage_hero',
    name: 'Homepage Hero Section',
    description:
      'Tests the homepage hero. Control: River imagery + manifesto excerpt. ' +
      'variant_a: Video background + counter. variant_b: Map visualization.',
    variants: [
      { key: 'control', name: 'Control — River imagery', rollout_percentage: 34 },
      { key: 'variant_a', name: 'Video + counter', rollout_percentage: 33 },
      { key: 'variant_b', name: 'Map visualization', rollout_percentage: 33 },
    ],
    goal_event: 'petition_page_viewed',
  },
];

// ---------------------------------------------------------------------------
// PostHog API helpers
// ---------------------------------------------------------------------------

const API_BASE = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}`;

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

/** Check if a feature flag already exists by key. */
async function flagExists(key: string): Promise<boolean> {
  const response = await apiFetch(`/feature_flags/?search=${encodeURIComponent(key)}`);
  if (!response.ok) {
    throw new Error(`Failed to list feature flags: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { results: Array<{ key: string }> };
  return data.results.some((f) => f.key === key);
}

/** Create a multivariate feature flag for an experiment. */
async function createFeatureFlag(experiment: ExperimentDefinition): Promise<void> {
  const multivariate = {
    variants: experiment.variants.map((v) => ({
      key: v.key,
      name: v.name,
      rollout_percentage: v.rollout_percentage,
    })),
  };

  const body = {
    key: experiment.key,
    name: experiment.name,
    filters: {
      groups: [{ properties: [], rollout_percentage: 100 }],
      multivariate,
    },
    // Start inactive — activate when ready to run the experiment
    active: false,
    ensure_experience_continuity: true,
  };

  const response = await apiFetch('/feature_flags/', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to create flag "${experiment.key}": ${response.status} ${response.statusText}\n${errorBody}`,
    );
  }
}

/** Create an experiment linked to a feature flag. */
async function createExperiment(experiment: ExperimentDefinition): Promise<void> {
  const body = {
    name: experiment.name,
    description: experiment.description,
    feature_flag_key: experiment.key,
    parameters: {
      feature_flag_variants: experiment.variants.map((v) => ({
        key: v.key,
        name: v.name,
        rollout_percentage: v.rollout_percentage,
      })),
      recommended_sample_size: 500,
      recommended_running_time: 14,
    },
    filters: {
      events: [{ id: experiment.goal_event, name: experiment.goal_event, type: 'events', order: 0 }],
    },
    // Don't start yet — activate when traffic is sufficient
    start_date: null,
  };

  const response = await apiFetch('/experiments/', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to create experiment "${experiment.name}": ${response.status} ${response.statusText}\n${errorBody}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('PostHog Experiment Setup (Artifact 13 §5.4)');
  console.log(`Host: ${POSTHOG_HOST}`);
  console.log(`Project: ${POSTHOG_PROJECT_ID}`);
  console.log(`Experiments to create: ${EXPERIMENTS.length}\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const experiment of EXPERIMENTS) {
    process.stdout.write(`  ${experiment.key} ... `);

    try {
      const exists = await flagExists(experiment.key);
      if (exists) {
        console.log('SKIPPED (already exists)');
        skipped++;
        continue;
      }

      await createFeatureFlag(experiment);
      await createExperiment(experiment);
      console.log('CREATED');
      created++;
    } catch (error) {
      console.log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed.`);

  if (created > 0) {
    console.log(
      '\nExperiments are created INACTIVE. To start an experiment:\n' +
        `  1. Go to ${POSTHOG_HOST}/experiments\n` +
        '  2. Select the experiment\n' +
        '  3. Click "Launch" when you have sufficient traffic (~500 visitors/variant/week)\n',
    );
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
