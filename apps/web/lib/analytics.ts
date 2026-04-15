/**
 * Analytics event tracking (Artifact 13).
 *
 * Thin wrapper that fires events to PostHog (when available) and
 * logs to console in development. Full PostHog integration is
 * wired in the analytics artifact — this stub provides the
 * `trackEvent` function that components can import now.
 */

type EventProperties = Record<string, string | number | boolean | undefined>;

/**
 * Track a named event with optional properties.
 * Safe to call before PostHog is initialized — events are silently dropped.
 */
export function trackEvent(
  eventName: string,
  properties?: EventProperties,
): void {
  // PostHog client-side capture (when loaded)
  if (
    typeof window !== 'undefined' &&
    'posthog' in window &&
    typeof (window as Record<string, unknown>).posthog === 'object'
  ) {
    const ph = (window as Record<string, unknown>).posthog as {
      capture: (event: string, props?: EventProperties) => void;
    };
    ph.capture(eventName, properties);
  }

  // Dev logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[analytics] ${eventName}`, properties ?? '');
  }
}
