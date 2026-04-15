'use client';

import { trackEvent } from '@/lib/analytics';

interface DonateFallbackLinkProps {
  href: string;
  refcode: string;
}

export function DonateFallbackLink({ href, refcode }: DonateFallbackLinkProps) {
  return (
    <p className="mt-4 text-center text-sm text-gray-500">
      Prefer to donate on ActBlue directly?{' '}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackEvent('donate_fallback_clicked', { refcode });
        }}
        className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
      >
        Open donation form &rarr;
      </a>
    </p>
  );
}
