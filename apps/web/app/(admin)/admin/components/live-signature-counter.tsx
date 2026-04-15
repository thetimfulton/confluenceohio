'use client';

import { useEffect, useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

interface LiveSignatureCounterProps {
  initialCount: number;
  goal: number;
}

export function LiveSignatureCounter({
  initialCount,
  goal,
}: LiveSignatureCounterProps) {
  const [count, setCount] = useState(initialCount);
  const [animating, setAnimating] = useState(false);
  const prevCount = useRef(initialCount);

  useEffect(() => {
    const supabase = createBrowserClient();

    const channel = supabase
      .channel('admin-signature-count')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_metrics',
          filter: 'metric=eq.signature_count',
        },
        (payload) => {
          const newValue = (payload.new as { value: number }).value;
          prevCount.current = count;
          setCount(newValue);
          setAnimating(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Only subscribe once on mount; count ref handles staleness
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!animating) return;
    const timer = setTimeout(() => setAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [animating]);

  const pct = goal > 0 ? Math.min((count / goal) * 100, 100) : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Total Signatures
      </p>

      <p
        className={`mt-1 text-2xl font-semibold transition-colors duration-300 ${
          animating ? 'text-indigo-600' : 'text-gray-900'
        }`}
      >
        {count.toLocaleString('en-US')}
        <span className="ml-1 text-base font-normal text-gray-400">
          / {goal.toLocaleString('en-US')}
        </span>
      </p>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">{pct.toFixed(1)}%</p>
      </div>
    </div>
  );
}
