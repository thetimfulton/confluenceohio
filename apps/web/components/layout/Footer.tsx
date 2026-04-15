// ---------------------------------------------------------------------------
// Footer — apps/web/components/layout/Footer.tsx
// ---------------------------------------------------------------------------
// Site footer with 3-column navigation, email signup, social links,
// and campaign finance/legal disclaimers.
// See Artifact 02 §3.3 for the design spec.
// ---------------------------------------------------------------------------

import Link from 'next/link';
import { EmailSignupForm } from '@/components/email/EmailSignupForm';

// ---------------------------------------------------------------------------
// Social icons (inline SVGs — lucide-react doesn't include brand icons)
// ---------------------------------------------------------------------------

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------

const CAMPAIGN_LINKS = [
  { href: '/sign', label: 'Sign Petition' },
  { href: '/volunteer', label: 'Volunteer' },
  { href: '/donate', label: 'Donate' },
  { href: '/about', label: 'About' },
  { href: '/voices', label: 'Voices' },
] as const;

const LEARN_LINKS = [
  { href: '/the-case', label: 'The Case' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
  { href: '/press', label: 'Press' },
] as const;

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Use' },
] as const;

const SOCIAL_LINKS = [
  {
    href: 'https://facebook.com/ConfluenceOhio',
    label: 'Facebook',
    icon: FacebookIcon,
  },
  {
    href: 'https://twitter.com/ConfluenceOhio',
    label: 'X / Twitter',
    icon: TwitterIcon,
  },
  {
    href: 'https://instagram.com/ConfluenceOhio',
    label: 'Instagram',
    icon: InstagramIcon,
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50" role="contentinfo">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Top section: logo + columns */}
        <div className="mb-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-block text-lg font-bold tracking-tight text-gray-900"
            >
              <span className="text-blue-700">Confluence</span> Ohio
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              A civic movement to rename Columbus, Ohio &mdash; honoring the
              land, the rivers, and everyone who calls this place home.
            </p>
          </div>

          {/* Campaign links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Campaign
            </h3>
            <ul className="mt-3 space-y-2">
              {CAMPAIGN_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Learn links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Learn
            </h3>
            <ul className="mt-3 space-y-2">
              {LEARN_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Legal
            </h3>
            <ul className="mt-3 space-y-2">
              {LEGAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Email signup */}
        <div className="mb-10 rounded-lg border border-gray-200 bg-white p-6">
          <EmailSignupForm
            source="footer"
            heading="Stay in the loop"
            description="Campaign updates, event invites, and milestone celebrations. No spam."
            showFirstName
            buttonText="Subscribe"
          />
        </div>

        {/* Social + legal bottom bar */}
        <div className="flex flex-col items-center gap-6 border-t border-gray-200 pt-8 sm:flex-row sm:justify-between">
          {/* Social links */}
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label={label}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </a>
            ))}
          </div>

          {/* Legal text */}
          <div className="text-center text-xs leading-relaxed text-gray-500 sm:text-right">
            <p>&copy; {new Date().getFullYear()} Confluence Ohio &middot; 501(c)(4) civic organization</p>
            <p className="mt-1">
              Paid for by Confluence Ohio. Not authorized by any candidate or
              candidate&apos;s committee.
            </p>
            <p className="mt-1 text-gray-400">
              #ConfluenceOhio &middot; #WhereTheRiversMeet
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
