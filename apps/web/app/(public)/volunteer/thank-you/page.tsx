import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Thank You for Volunteering',
  description: "You're on the team. Here's what happens next.",
  path: '/volunteer/thank-you',
  noIndex: true,
});

/**
 * /volunteer/thank-you (Artifact 08 §4.1)
 *
 * Query params:
 *   ?returning=true — existing volunteer who added new roles
 *   ?firstName=...  — for personalized greeting (optional, from client redirect)
 */
export default async function VolunteerThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ returning?: string; firstName?: string }>;
}) {
  const params = await searchParams;
  const isReturning = params.returning === 'true';
  const firstName = params.firstName || null;

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
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {isReturning ? (
        /* ── Returning volunteer ── */
        <>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
            Welcome back{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="mb-6 text-lg text-gray-600">
            We&apos;ve updated your volunteer profile with your new roles.
            You&apos;ll receive updated next steps by email.
          </p>
          <p className="mb-8 text-base text-gray-500">
            Thank you for stepping up even further.
          </p>
        </>
      ) : (
        /* ── New volunteer ── */
        <>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
            {firstName ? `Thank you, ${firstName}!` : 'Thank you!'} You&apos;re in.
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            Here&apos;s what happens next:
          </p>

          <ol className="mb-8 space-y-4 text-left text-base text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                1
              </span>
              <span>
                <strong>Check your email</strong> — we just sent a confirmation
                with next steps specific to your role.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                2
              </span>
              <span>
                We&apos;ll <strong>follow up within 3 days</strong> with your
                onboarding details.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                3
              </span>
              <span>
                For <strong>Signature Collectors</strong>: training is required
                before your first shift. We&apos;ll send you available training
                dates.
              </span>
            </li>
          </ol>
        </>
      )}

      {/* Share CTAs */}
      <div className="mb-8 w-full">
        <p className="mb-3 text-sm font-medium text-gray-500">
          Share the campaign with friends:
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              "I just volunteered with Confluence Ohio — the movement to rename Columbus. Join us:",
            )}&url=${encodeURIComponent('https://confluenceohio.org/volunteer')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Share on X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
              'https://confluenceohio.org/volunteer',
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Share on Facebook
          </a>
        </div>
      </div>

      {/* Petition CTA */}
      <div className="w-full rounded-lg border border-blue-100 bg-blue-50 p-5">
        <p className="mb-3 text-sm text-blue-800">
          Haven&apos;t signed the petition yet?
        </p>
        <Link
          href="/sign"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Sign the Petition &rarr;
        </Link>
      </div>
    </main>
  );
}
