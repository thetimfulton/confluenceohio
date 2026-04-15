'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import posthog from 'posthog-js';

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      const search = searchParams?.toString();
      if (search) url += '?' + search;

      posthog.capture('$pageview', {
        $current_url: url,
        ref_code: searchParams?.get('ref') ?? undefined,
        utm_source: searchParams?.get('utm_source') ?? undefined,
        utm_medium: searchParams?.get('utm_medium') ?? undefined,
        utm_campaign: searchParams?.get('utm_campaign') ?? undefined,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
