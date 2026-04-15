import { posthog } from 'posthog-js';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Track a client-side analytics event.
 *
 * Single entry point for all client-side event tracking.
 * Dispatches to PostHog (primary) and optionally GA4 (if loaded).
 *
 * Usage:
 *   trackEvent('petition_form_started', { source: 'homepage_cta' });
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
) {
  // PostHog — primary analytics
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.capture(eventName, properties);
  }

  // GA4 — optional, only if loaded and consent granted
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...properties,
      send_to: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
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
  traits?: Record<string, unknown>,
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
