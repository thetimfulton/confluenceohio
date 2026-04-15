import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';

/**
 * /donate/thank-you — Post-donation confirmation (Artifact 09 §4).
 *
 * Reached via ActBlue redirect-after-contribute or client-side
 * navigation after the embed's onComplete callback. Provides
 * share buttons, petition CTA (if not yet signed), and volunteer CTA.
 */

export const metadata = buildPageMetadata({
  title: 'Thank You for Donating',
  description:
    'Your donation helps fund the campaign to rename Columbus to Confluence, Ohio.',
  path: '/donate/thank-you',
  noIndex: true,
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://confluenceohio.org';

export default async function DonateThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; refcode?: string }>;
}) {
  const params = await searchParams;
  const amountDisplay = params.amount ? `$${params.amount}` : null;

  return (
    <main
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center"
      role="main"
    >
      {/* Success icon */}
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
        aria-hidden="true"
      >
        <svg
          className="h-8 w-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Thank you for your{amountDisplay ? ` ${amountDisplay}` : ''} donation!
      </h1>
      <p className="mb-8 text-lg text-gray-600">
        Your support moves us closer to 22,000 signatures and a spot on the
        ballot. We&apos;ll send you a receipt from ActBlue by email.
      </p>

      {/* Share CTAs */}
      <div className="mb-8 w-full">
        <p className="mb-3 text-sm font-medium text-gray-500">
          Spread the word:
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              'I just donated to Confluence Ohio \u2014 the movement to rename Columbus to a name that honors the land, rivers, and people. Join us:',
            )}&url=${encodeURIComponent(`${SITE_URL}/donate`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Share on X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
              `${SITE_URL}/donate`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Share on Facebook
          </a>
        </div>
      </div>

      {/* Next steps */}
      <div className="w-full space-y-3">
        {/* Petition CTA */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
          <p className="mb-3 text-sm text-blue-800">
            Haven&apos;t signed the petition yet? Your signature is free.
          </p>
          <Link
            href="/sign"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Sign the Petition &rarr;
          </Link>
        </div>

        {/* Volunteer CTA */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm text-gray-600">
            Want to do even more? We need volunteers.
          </p>
          <Link
            href="/volunteer"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Join the Team &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
