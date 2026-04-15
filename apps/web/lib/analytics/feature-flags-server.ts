/**
 * Server-side PostHog feature flag bootstrapping (Artifact 13 §5.2).
 *
 * Evaluates all feature flags on the server before the page renders,
 * eliminating variant flickering on the client. The result is injected
 * into the page as `window.__PH_FLAGS__` and consumed by the client-side
 * PostHog init bootstrap option.
 */

import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { getPostHogServer } from '@confluenceohio/core/analytics/posthog-server';

const PH_COOKIE_NAME = 'ph_distinct_id';

/**
 * Read (or generate) a PostHog distinct_id and evaluate all feature flags
 * for that identity. Returns both so the layout can inject them into the page.
 */
export async function bootstrapFeatureFlags(
  cookieStore: ReadonlyRequestCookies,
): Promise<{ distinctId: string; flags: Record<string, string | boolean> }> {
  const phCookie = cookieStore.get(PH_COOKIE_NAME);
  const distinctId = phCookie?.value ?? crypto.randomUUID();

  let flags: Record<string, string | boolean> = {};
  try {
    const posthog = getPostHogServer();
    flags = await posthog.getAllFlags(distinctId);
  } catch {
    // If PostHog is unreachable, fall through with empty flags.
    // The client will re-evaluate once posthog-js initialises.
  }

  return { distinctId, flags };
}
