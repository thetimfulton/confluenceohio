// ---------------------------------------------------------------------------
// Header — apps/web/components/layout/Header.tsx
// ---------------------------------------------------------------------------
// Desktop + mobile header with sticky behavior, "The Case" dropdown,
// and persistent "Sign the Petition" accent button.
// See Artifact 02 §3.1 for the design spec.
// ---------------------------------------------------------------------------

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MobileNav } from './MobileNav';

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------

const THE_CASE_LINKS = [
  { href: '/the-case', label: 'Why Rename?' },
  { href: '/the-case/history', label: 'The Naming Story' },
  { href: '/the-case/the-rivers', label: 'The Confluence' },
  { href: '/the-case/columbus-legacy', label: 'Who Was Columbus?' },
  { href: '/the-case/precedents', label: 'Cities That Changed Their Names' },
  { href: '/the-case/the-process', label: 'How It Works Legally' },
] as const;

const PRIMARY_NAV = [
  { href: '/voices', label: 'Voices' },
  { href: '/volunteer', label: 'Volunteer' },
  { href: '/donate', label: 'Donate' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  // Track scroll for sticky shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent | FocusEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('focusin', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('focusin', handler);
    };
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        dropdownButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [dropdownOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const isTheCaseActive = pathname.startsWith('/the-case');

  const toggleDropdown = useCallback(() => {
    setDropdownOpen((prev) => !prev);
  }, []);

  return (
    <>
      <header
        role="banner"
        className={`sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur-sm transition-shadow ${
          scrolled ? 'shadow-sm' : ''
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900 transition-colors hover:text-blue-800"
          >
            <span className="text-blue-700">Confluence</span>
            <span>Ohio</span>
          </Link>

          {/* Desktop navigation */}
          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Main navigation"
          >
            {/* The Case dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                ref={dropdownButtonRef}
                onClick={toggleDropdown}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isTheCaseActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                The Case
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                  role="menu"
                >
                  {THE_CASE_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      className={`block px-4 py-2.5 text-sm transition-colors ${
                        pathname === href
                          ? 'bg-blue-50 font-medium text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Other nav items */}
            {PRIMARY_NAV.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}
                </Link>
              );
            })}

            {/* Sign the Petition — accent button, always visible */}
            <Link
              href="/sign"
              className="ml-3 inline-flex h-9 items-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign the Petition
            </Link>
          </nav>

          {/* Mobile: hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 transition-colors hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
