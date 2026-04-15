// ---------------------------------------------------------------------------
// SubNav — apps/web/components/layout/SubNav.tsx
// ---------------------------------------------------------------------------
// Horizontal sub-navigation for /the-case/* pages. Sticky below the
// primary header on desktop; horizontal scrollable row on mobile.
// See Artifact 02 §3.4 for the design spec.
// ---------------------------------------------------------------------------

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------

const THE_CASE_LINKS = [
  { href: '/the-case', label: 'Overview' },
  { href: '/the-case/history', label: 'History' },
  { href: '/the-case/the-rivers', label: 'The Rivers' },
  { href: '/the-case/columbus-legacy', label: 'Columbus Legacy' },
  { href: '/the-case/precedents', label: 'Precedents' },
  { href: '/the-case/the-process', label: 'The Process' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubNav() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // Scroll active item into view on mobile
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const active = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      // If the active item is out of view, scroll it into view
      if (
        activeRect.left < containerRect.left ||
        activeRect.right > containerRect.right
      ) {
        active.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [pathname]);

  return (
    <nav
      className="sticky top-16 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm"
      aria-label="The Case sub-navigation"
    >
      <div
        ref={scrollRef}
        className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6 lg:px-8"
      >
        <ul
          className="-mb-px flex min-w-max gap-1 py-1"
        >
          {THE_CASE_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  ref={isActive ? activeRef : undefined}
                  href={href}
                  className={`inline-block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
