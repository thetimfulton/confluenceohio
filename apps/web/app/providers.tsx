'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: '/ingest',
      ui_host: 'https://us.i.posthog.com',

      // Cookieless mode — no persistent cookies, session-scoped only
      persistence: 'memory',

      // Capture pageviews manually (we handle route changes ourselves)
      capture_pageview: false,

      // Session replay — enabled at launch for form abandonment diagnosis
      enable_recording_console_log: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
        blockSelector: '[data-ph-block]',
      },

      // Respect Do Not Track browser setting
      respect_dnt: true,

      // Bootstrap feature flags + distinct_id from server for instant
      // availability with no variant flickering (Artifact 13 §5.2)
      bootstrap: {
        distinctID:
          typeof window !== 'undefined'
            ? (window as unknown as Record<string, string>).__PH_DISTINCT_ID__ ?? undefined
            : undefined,
        featureFlags:
          typeof window !== 'undefined'
            ? ((window as unknown as Record<string, Record<string, string | boolean>>).__PH_FLAGS__ ?? {})
            : {},
      },
    });

    // Register super properties for session-level context (§3.3)
    const params = new URLSearchParams(window.location.search);
    posthog.register({
      app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
      environment: process.env.NODE_ENV,
      initial_ref_code: params.get('ref') ?? null,
      initial_utm_source: params.get('utm_source') ?? null,
      initial_utm_medium: params.get('utm_medium') ?? null,
      initial_utm_campaign: params.get('utm_campaign') ?? null,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
