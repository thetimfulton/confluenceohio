'use client';

/**
 * ActBlue embeddable donation form (Artifact 09 §4.2).
 *
 * Renders the ActBlue embed iframe via their JS SDK.
 * Provides a <noscript> fallback link and detects load failure
 * with a timeout-based fallback. Fires analytics events for
 * embed_loaded, donate_initiated, and errors.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

interface ActBlueEmbedProps {
  /** Default refcode for this embed placement */
  refcode: string;
  /** Optional secondary refcode (campaign/experiment) */
  refcode2?: string;
  /** Suggested donation amounts in cents. Defaults to $5–$100. */
  amounts?: number[];
  /** Default selected amount in cents. Defaults to $25. */
  defaultAmount?: number;
}

declare global {
  interface Window {
    actblue?: {
      configure: (config: Record<string, unknown>) => void;
      addEventHandler: (
        event: string,
        callback: (data: unknown) => void,
      ) => void;
      remove: () => void;
    };
  }
}

/** How long to wait for the ActBlue script before showing fallback (ms) */
const LOAD_TIMEOUT_MS = 10_000;

export function ActBlueEmbed({
  refcode,
  refcode2,
  amounts = [500, 1000, 2500, 5000, 10000],
  defaultAmount = 2500,
}: ActBlueEmbedProps) {
  const embedRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const searchParams = useSearchParams();

  // Allow URL ?refcode= to override the default prop
  const effectiveRefcode = searchParams.get('refcode') || refcode;
  const effectiveRefcode2 = searchParams.get('refcode2') || refcode2;

  const fallbackUrl = buildFallbackUrl(effectiveRefcode, effectiveRefcode2);

  const handleContribute = useCallback((data: unknown) => {
    const contribution = data as {
      amount?: number;
      email?: string;
      order_number?: string;
      recurring?: boolean;
      refcode?: string;
    };

    trackEvent('donate_initiated', {
      amount_cents: contribution.amount,
      recurring: contribution.recurring,
      refcode: contribution.refcode ?? effectiveRefcode,
      source: 'embed',
    });
  }, [effectiveRefcode]);

  const handleComplete = useCallback(() => {
    trackEvent('donate_flow_complete', { source: 'embed' });
  }, []);

  const handleError = useCallback((error: unknown) => {
    trackEvent('donate_embed_error', { error: String(error) });
    console.error('[ActBlue Embed] Error:', error);
    setEmbedFailed(true);
  }, []);

  // Track page view on mount (§3.2.3)
  useEffect(() => {
    trackEvent('donate_page_viewed', {
      refcode: effectiveRefcode,
      utm_source:
        new URLSearchParams(window.location.search).get('utm_source') ??
        undefined,
    });
  }, [effectiveRefcode]);

  useEffect(() => {
    // Load the ActBlue script once
    if (!scriptLoaded.current) {
      const existing = document.querySelector(
        'script[src*="secure.actblue.com"]',
      );
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://secure.actblue.com/cf/assets/actblue.js';
        script.async = true;
        script.onerror = () => {
          setEmbedFailed(true);
          trackEvent('donate_embed_error', { error: 'script_load_failed' });
        };
        document.head.appendChild(script);
      }
      scriptLoaded.current = true;
    }

    // Poll for the actblue global (script load is async)
    const loadStart = Date.now();
    const interval = setInterval(() => {
      if (window.actblue) {
        window.actblue.configure({
          amounts,
          amount: defaultAmount,
          refcodes: {
            refcode: effectiveRefcode,
            ...(effectiveRefcode2 ? { refcode2: effectiveRefcode2 } : {}),
          },
          onContribute: handleContribute,
          onComplete: handleComplete,
          onError: handleError,
        });
        trackEvent('donate_embed_loaded', {
          load_time_ms: Date.now() - loadStart,
        });
        clearInterval(interval);
      }
    }, 100);

    // Timeout: show fallback if embed never loads
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!window.actblue) {
        setEmbedFailed(true);
        trackEvent('donate_embed_error', { error: 'load_timeout' });
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.actblue?.remove?.();
    };
  }, [
    effectiveRefcode,
    effectiveRefcode2,
    amounts,
    defaultAmount,
    handleContribute,
    handleComplete,
    handleError,
  ]);

  return (
    <div>
      {/* ActBlue embed container — the actblue.js script renders the form here */}
      {!embedFailed && (
        <div
          ref={embedRef}
          data-ab-form=""
          data-ab-token={process.env.NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN}
          data-ab-amounts={amounts.join(',')}
          data-ab-amount={defaultAmount.toString()}
          data-ab-other-amount="true"
          data-ab-height="auto"
          data-ab-refcode={effectiveRefcode}
          data-ab-refcode2={effectiveRefcode2}
          data-ab-preview={
            process.env.NODE_ENV === 'development' ? 'true' : undefined
          }
          className="min-h-[400px]"
          aria-label="Donation form"
        />
      )}

      {/* Fallback shown when embed fails to load */}
      {embedFailed && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="mb-4 text-gray-600">
            The donation form couldn&apos;t load. You can donate directly on
            ActBlue:
          </p>
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Donate on ActBlue &rarr;
          </a>
        </div>
      )}

      {/* No-JS fallback */}
      <noscript>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <a
            href={fallbackUrl}
            className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
          >
            Donate via ActBlue &rarr;
          </a>
        </div>
      </noscript>
    </div>
  );
}

/** Build the direct ActBlue URL for fallback scenarios */
function buildFallbackUrl(refcode: string, refcode2?: string): string {
  const base =
    process.env.NEXT_PUBLIC_ACTBLUE_FORM_URL ??
    'https://secure.actblue.com/donate/confluence';
  const url = new URL(base);
  url.searchParams.set('refcode', refcode);
  if (refcode2) {
    url.searchParams.set('refcode2', refcode2);
  }
  return url.toString();
}
