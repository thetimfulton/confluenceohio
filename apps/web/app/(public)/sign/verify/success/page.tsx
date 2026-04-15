import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Email Verified',
  description:
    'Your email has been verified. Your signature is officially confirmed.',
  path: '/sign/verify/success',
  noIndex: true,
});

/**
 * /sign/verify/success
 *
 * Shown after successful email verification (Artifact 06 §5.3).
 * Query params:
 *   ?already=true  — token was previously used (idempotent success)
 *   ?n=<number>    — signature number (for PostHog)
 *   ?h=<hours>     — hours to verify (for PostHog)
 */
export default async function VerifySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ already?: string; n?: string; h?: string }>;
}) {
  const params = await searchParams;
  const signatureNumber = params.n ? Number(params.n) : null;
  const hoursToVerify = params.h ? Number(params.h) : null;

  return (
    <main
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center"
      role="main"
    >
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

      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Your email is verified!
      </h1>

      <p className="mb-8 text-lg text-gray-600">
        Your signature is officially confirmed. Thank you for being part of this movement.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/sign/thank-you#share"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Share with friends
        </Link>

        <Link
          href="/volunteer"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
        >
          Volunteer
        </Link>

        <Link
          href="/donate"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
        >
          Donate
        </Link>
      </div>

      {/* PostHog tracking data — picked up by client-side analytics script */}
      <script
        type="application/json"
        id="verify-success-data"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            event: 'email_verification_success',
            signatureNumber: signatureNumber,
            hoursToVerify: hoursToVerify,
          }),
        }}
      />
    </main>
  );
}
