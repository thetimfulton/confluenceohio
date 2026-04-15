'use client';

import dynamic from 'next/dynamic';
import { SignatureCounterSkeleton } from './SignatureCounterSkeleton';

/**
 * Dynamically imported SignatureCounter — avoids loading Supabase Realtime
 * client-side JS on initial page render (Artifact 14 §2.4).
 * SSR disabled because the component subscribes to Realtime channels
 * which only work in the browser.
 */
export const SignatureCounterDynamic = dynamic(
  () =>
    import('./SignatureCounter').then((mod) => mod.SignatureCounter),
  {
    ssr: false,
    loading: () => <SignatureCounterSkeleton />,
  },
);

export const SignatureCounterCompactDynamic = dynamic(
  () =>
    import('./SignatureCounter').then((mod) => mod.SignatureCounter),
  {
    ssr: false,
    loading: () => <SignatureCounterSkeleton compact />,
  },
);
