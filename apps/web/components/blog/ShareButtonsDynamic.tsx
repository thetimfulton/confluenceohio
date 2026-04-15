'use client';

import dynamic from 'next/dynamic';

/**
 * Dynamically imported ShareButtons — not needed during SSR and only
 * interactive in the browser (clipboard API). Artifact 14 §2.4.
 */
export const ShareButtonsDynamic = dynamic(
  () => import('./ShareButtons').then((mod) => mod.ShareButtons),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-2" style={{ minHeight: '2.25rem' }}>
        <span className="text-sm font-medium text-gray-400">Share:</span>
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className="inline-block h-9 w-9 animate-pulse rounded-full bg-gray-100"
          />
        ))}
      </div>
    ),
  },
);
