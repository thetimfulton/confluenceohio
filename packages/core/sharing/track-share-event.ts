/**
 * Share event tracking for PostHog (Artifact 11 §2.6).
 *
 * Fires `share_button_click` events to PostHog and also triggers
 * server-side referral click tracking when a referral code is present.
 */

import type { SharePlatform } from './build-share-url';
import type { ShareContext } from './share-messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShareEventMetadata {
  referralCode?: string;
  signerNumber?: number;
}

// ---------------------------------------------------------------------------
// PostHog type augmentation
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    posthog?: {
      capture: (
        event: string,
        properties?: Record<string, string | number | boolean | undefined>,
      ) => void;
    };
  }
}

// ---------------------------------------------------------------------------
// Event tracking
// ---------------------------------------------------------------------------

/**
 * Track a share button click in PostHog and pre-populate the server-side
 * referral tracking row if a referral code is present.
 *
 * Safe to call server-side (no-ops when `window` is unavailable).
 */
export function trackShareEvent(
  platform: SharePlatform | 'native',
  context: ShareContext,
  metadata?: ShareEventMetadata,
): void {
  if (typeof window === 'undefined') return;

  // PostHog event (§3.2.8 — share_button_clicked)
  if (window.posthog) {
    window.posthog.capture('share_button_clicked', {
      platform,
      context,
      page: window.location.pathname,
      referral_code: metadata?.referralCode,
      signer_number: metadata?.signerNumber,
    });
  }

  // Dev logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[share]', platform, context, metadata ?? '');
  }

  // Fire server-side referral click tracker to pre-populate the referrals
  // table row (§1.4). Uses keepalive so the request survives page navigation.
  if (metadata?.referralCode && platform !== 'native') {
    fetch(
      `/api/referral/track-click?ref=${encodeURIComponent(metadata.referralCode)}&platform=${encodeURIComponent(platform)}`,
      { method: 'POST', keepalive: true },
    ).catch(() => {
      // Best-effort — tracking failure is non-critical
    });
  }
}

/**
 * Track a successful clipboard copy for share links (§3.2.8).
 */
export function trackShareLinkCopied(
  referralCode?: string,
): void {
  if (typeof window === 'undefined') return;
  if (window.posthog) {
    window.posthog.capture('share_link_copied', {
      referral_code: referralCode,
    });
  }
}

/**
 * Track Web Share API completion (§3.2.8).
 */
export function trackShareNativeCompleted(
  context: ShareContext,
): void {
  if (typeof window === 'undefined') return;
  if (window.posthog) {
    window.posthog.capture('share_native_completed', {
      platform: 'native',
      context,
    });
  }
}

/**
 * Track Web Share API cancellation (§3.2.8).
 */
export function trackShareNativeCancelled(
  context: ShareContext,
): void {
  if (typeof window === 'undefined') return;
  if (window.posthog) {
    window.posthog.capture('share_native_cancelled', {
      context,
    });
  }
}
