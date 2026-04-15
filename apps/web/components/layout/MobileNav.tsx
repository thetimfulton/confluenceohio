// ---------------------------------------------------------------------------
// MobileNav — apps/web/components/layout/MobileNav.tsx
// ---------------------------------------------------------------------------
// Full-screen mobile navigation overlay with focus trap, expandable
// "The Case" section, and persistent sticky bottom CTA bar.
// See Artifact 02 §3.2 for the design spec.
// ---------------------------------------------------------------------------

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  FileText,
  HandHeart,
  Heart,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Newspaper,
  PenTool,
  Users,
  X,
} from 'lucide-react';
import { FocusTrap } from '@confluenceohio/ui/a11y';

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

const MOBILE_NAV_ITEMS = [
  { href: '/sign', label: 'Sign the Petition', icon: PenTool },
  { href: '/voices', label: 'Voices', icon: MessageSquare },
  { href: '/volunteer', label: 'Volunteer', icon: Users },
  { href: '/donate', label: 'Donate', icon: Heart },
  { href: '/about', label: 'About', icon: HandHeart },
  { href: '/press', label: 'Press', icon: Newspaper },
  { href: '/blog', label: 'Blog', icon: FileText },
  { href: '/faq', label: 'FAQ', icon: HelpCircle },
] as const;

// ---------------------------------------------------------------------------
// Mobile overlay
// ---------------------------------------------------------------------------

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const [caseExpanded, setCaseExpanded] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const isTheCaseActive = pathname.startsWith('/the-case');

  if (!open) return null;

  return (
    <FocusTrap active={open} onEscape={onClose}>
      <div
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="fixed inset-0 z-50 lg:hidden"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Panel */}
        <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
            <span className="text-lg font-bold text-gray-900">
              <span className="text-blue-700">Confluence</span> Ohio
            </span>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Mobile">
          <ul className="space-y-1">
            {/* The Case — expandable */}
            <li>
              <button
                onClick={() => setCaseExpanded(!caseExpanded)}
                aria-expanded={caseExpanded}
                className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-base font-medium transition-colors ${
                  isTheCaseActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                  The Case
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${caseExpanded ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {caseExpanded && (
                <ul className="ml-8 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                  {THE_CASE_LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                          pathname === href
                            ? 'font-medium text-blue-700'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        aria-current={pathname === href ? 'page' : undefined}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {/* Other items */}
            {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      </div>
    </FocusTrap>
  );
}

// ---------------------------------------------------------------------------
// StickyPetitionBar — persistent bottom CTA bar for mobile
// ---------------------------------------------------------------------------
// Appears after the user scrolls past the hero section. Hides on /sign.
// Hides when virtual keyboard is open (detected via viewport height change).
// ---------------------------------------------------------------------------

export function StickyPetitionBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Hide on the petition page itself
  const isSignPage = pathname === '/sign' || pathname.startsWith('/sign/');

  // Detect scroll past hero (~500px)
  useEffect(() => {
    if (isSignPage) return;
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isSignPage]);

  // Detect virtual keyboard via visualViewport API
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      // If viewport height is significantly less than window height, keyboard is open
      const heightRatio = vv.height / window.innerHeight;
      setKeyboardOpen(heightRatio < 0.75);
    };

    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  if (isSignPage || !visible || keyboardOpen) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-blue-200 bg-white/95 px-4 py-3 backdrop-blur-sm lg:hidden"
      role="complementary"
      aria-label="Sign the petition"
    >
      <Link
        href="/sign"
        className="flex h-12 w-full items-center justify-center rounded-md bg-blue-700 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Sign the Petition
        <svg
          className="ml-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}
