'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useReducedMotion } from '@confluenceohio/ui/a11y';

// ---------------------------------------------------------------------------
// Milestone thresholds (Artifact 06 §1.5)
// ---------------------------------------------------------------------------

const MILESTONES = [1_000, 2_500, 5_000, 10_000, 15_000, 22_000];
const GOAL = 22_000;

function getNextMilestone(count: number): number {
  for (const m of MILESTONES) {
    if (count < m) return m;
  }
  return GOAL;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SignatureCounterProps {
  initialCount: number;
  /** Compact mode for mobile above-form display. */
  compact?: boolean;
}

export function SignatureCounter({
  initialCount,
  compact = false,
}: SignatureCounterProps) {
  const [count, setCount] = useState(initialCount);
  const [announcedCount, setAnnouncedCount] = useState(initialCount);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Debounce screen reader announcements to every 30 seconds max (§8.2)
  const scheduleAnnouncement = useCallback((newCount: number) => {
    if (announceTimerRef.current) return; // Already scheduled
    announceTimerRef.current = setTimeout(() => {
      setAnnouncedCount(newCount);
      announceTimerRef.current = null;
    }, 10_000);
  }, []);

  // Subscribe to Supabase Realtime for campaign_metrics updates
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);

    const channel = supabase
      .channel('signature-counter')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_metrics',
          filter: "metric=eq.signature_count",
        },
        (payload) => {
          const newValue = (payload.new as { value: number }).value;
          if (typeof newValue === 'number') {
            setCount(newValue);
            scheduleAnnouncement(newValue);
          }
        },
      )
      .subscribe();

    return () => {
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [scheduleAnnouncement]);

  const nextMilestone = getNextMilestone(count);
  const progressPercent = Math.min((count / GOAL) * 100, 100);

  if (compact) {
    return (
      <div className="flex items-center gap-3" style={{ minHeight: '2rem' }}>
        <span className="text-2xl font-bold text-gray-900">
          {formatNumber(count)}
        </span>
        <span className="text-sm text-gray-500">signatures</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full bg-blue-600 ${prefersReducedMotion ? '' : 'transition-all duration-700'}`}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={GOAL}
            aria-label={`Petition signature progress: ${formatNumber(count)} of ${formatNumber(GOAL)} signatures`}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      style={{ minHeight: '176px' }}
    >
      {/* Visual counter */}
      <div className="text-center">
        <p className="text-5xl font-bold tracking-tight text-gray-900">
          {formatNumber(count)}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          of {formatNumber(GOAL)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full bg-blue-600 ${prefersReducedMotion ? '' : 'transition-all duration-700'}`}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={GOAL}
            aria-label={`Petition signature progress: ${formatNumber(count)} of ${formatNumber(GOAL)} signatures`}
          />
        </div>
        <p className="mt-2 text-center text-sm font-medium text-gray-600">
          Help us reach {formatNumber(nextMilestone)}
        </p>
      </div>

      {/* Screen reader live region — debounced (§8.2) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {formatNumber(announcedCount)} of {formatNumber(GOAL)} signatures collected
      </div>
    </div>
  );
}
