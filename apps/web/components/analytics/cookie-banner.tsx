'use client';

import { useEffect, useState } from 'react';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

/**
 * Minimal cookie consent banner for GDPR compliance.
 *
 * Only renders when GA4 is configured (NEXT_PUBLIC_GA4_MEASUREMENT_ID is set).
 * Two options: accept analytics cookies or continue without tracking.
 * No pre-checked boxes, no tracking before consent.
 *
 * On acceptance, dispatches an 'analytics-consent' CustomEvent that
 * GA4ConsentLoader listens for to load GA4 scripts.
 *
 * Consent is stored in sessionStorage (not localStorage) so it resets
 * between browser sessions for extra privacy.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if GA4 isn't configured
    if (!GA4_ID) return;

    // Don't show if consent was already given or dismissed this session
    const consent = sessionStorage.getItem('analytics_consent');
    if (consent === 'granted' || consent === 'denied') return;

    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    sessionStorage.setItem('analytics_consent', 'granted');
    window.dispatchEvent(
      new CustomEvent('analytics-consent', {
        detail: { analytics: true },
      }),
    );
    setVisible(false);
  };

  const handleDecline = () => {
    sessionStorage.setItem('analytics_consent', 'denied');
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6"
    >
      <p className="text-sm text-gray-700">
        We use cookies for Google Analytics to understand how visitors find us.
        PostHog analytics runs without cookies regardless of your choice.
      </p>
      <div className="mt-3 flex gap-3 sm:mt-0 sm:shrink-0">
        <button
          type="button"
          onClick={handleDecline}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none"
        >
          Continue without tracking
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          Accept Analytics
        </button>
      </div>
    </div>
  );
}
