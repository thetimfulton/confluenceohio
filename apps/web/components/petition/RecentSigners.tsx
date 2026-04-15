'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicRecentSigner } from '@confluenceohio/db/types';

// ---------------------------------------------------------------------------
// Relative time formatting
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RecentSignersProps {
  initialSigners: PublicRecentSigner[];
  /** Collapsible on mobile (§1.2). */
  collapsible?: boolean;
}

export function RecentSigners({
  initialSigners,
  collapsible = false,
}: RecentSignersProps) {
  const [signers, setSigners] = useState(initialSigners);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [expanded, setExpanded] = useState(!collapsible);
  const listRef = useRef<HTMLUListElement>(null);

  // Poll get_recent_signers every 30 seconds (§1.6)
  useEffect(() => {
    const controller = new AbortController();

    const poll = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return;

        const response = await fetch(
          `${url}/rest/v1/rpc/get_recent_signers`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({ p_limit: 10 }),
            signal: controller.signal,
          },
        );

        if (response.ok) {
          const data = (await response.json()) as PublicRecentSigner[];
          setSigners(data);
        }
      } catch {
        // Silently ignore poll failures
      }
    };

    const interval = setInterval(poll, 30_000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, []);

  // Auto-scroll on mobile when new signers arrive (pause on hover/focus)
  const scrollToTop = useCallback(() => {
    if (!isHovered && !isFocused && listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isHovered, isFocused]);

  useEffect(() => {
    scrollToTop();
  }, [signers, scrollToTop]);

  if (signers.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-500">
          Be the first to sign!
        </p>
      </div>
    );
  }

  const listContent = (
    /* Wrapper captures hover/focus to pause auto-scroll — not interactive */
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
    <ul
      ref={listRef}
      aria-label="Recent petition signers"
      aria-live="off"
      className="max-h-72 space-y-2 overflow-y-auto"
    >
      {signers.map((signer, i) => (
        <li
          key={`${signer.first_name}-${signer.city}-${signer.signed_at}-${i}`}
          className="flex items-baseline justify-between rounded-lg px-3 py-2 text-sm
            odd:bg-gray-50"
        >
          <span className="font-medium text-gray-900">
            {signer.first_name}{' '}
            <span className="font-normal text-gray-500">
              from {signer.city}
            </span>
          </span>
          <time
            dateTime={signer.signed_at}
            className="ml-2 flex-shrink-0 text-xs text-gray-400"
          >
            {relativeTime(signer.signed_at)}
          </time>
        </li>
      ))}
    </ul>
    </div>
  );

  if (collapsible) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium
            text-gray-700 hover:bg-gray-50"
        >
          Recent signers
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expanded && <div className="px-4 pb-4">{listContent}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        Recent signers
      </h3>
      {listContent}
    </div>
  );
}
