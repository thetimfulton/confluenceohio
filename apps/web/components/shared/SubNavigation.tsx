'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const THE_CASE_LINKS = [
  { href: '/the-case', label: 'Overview' },
  { href: '/the-case/history', label: 'The Naming Story' },
  { href: '/the-case/the-rivers', label: 'The Confluence' },
  { href: '/the-case/columbus-legacy', label: 'Who Was Columbus?' },
  { href: '/the-case/precedents', label: 'Precedents' },
  { href: '/the-case/the-process', label: 'The Process' },
] as const;

export function SubNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-16 z-30 -mx-4 mb-8 border-b border-gray-200 bg-white/95 backdrop-blur-sm sm:-mx-6 lg:-mx-8"
      aria-label="The Case sub-navigation"
    >
      <div className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6 lg:px-8">
        <ul className="flex min-w-max gap-1 py-2">
          {THE_CASE_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`inline-block rounded-md px-3 py-2 text-sm font-medium transition-colors
                    ${
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
