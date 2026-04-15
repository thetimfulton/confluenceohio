import Link from 'next/link';
import { ResendVerificationButton } from './resend-button';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Verification Error',
  description: 'There was a problem verifying your email.',
  path: '/sign/verify/error',
  noIndex: true,
});

type VerifyErrorReason = 'missing-token' | 'invalid-token' | 'expired-token';

const ERROR_CONTENT: Record<
  VerifyErrorReason,
  { heading: string; message: string; showResend: boolean }
> = {
  'missing-token': {
    heading: 'Something went wrong',
    message:
      'The verification link appears to be incomplete. Please check the link in your email and try again.',
    showResend: false,
  },
  'invalid-token': {
    heading: 'Invalid verification link',
    message:
      'This verification link is not valid. It may have been used already or copied incorrectly.',
    showResend: false,
  },
  'expired-token': {
    heading: 'Verification link expired',
    message:
      'This verification link has expired. Verification links are valid for 72 hours.',
    showResend: true,
  },
};

/**
 * /sign/verify/error?reason=[reason]
 *
 * Error page for failed email verification (Artifact 06 §5.4).
 */
export default async function VerifyErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason as VerifyErrorReason | undefined;
  const content = reason && ERROR_CONTENT[reason]
    ? ERROR_CONTENT[reason]
    : ERROR_CONTENT['invalid-token'];

  return (
    <main
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center"
      role="main"
    >
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
        aria-hidden="true"
      >
        <svg
          className="h-8 w-8 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        {content.heading}
      </h1>

      <p className="mb-8 text-lg text-gray-600">{content.message}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        {content.showResend && <ResendVerificationButton />}

        <Link
          href="/sign"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
        >
          Return to petition page
        </Link>
      </div>

      {/* PostHog tracking data */}
      <script
        type="application/json"
        id="verify-error-data"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            event: 'email_verification_error',
            reason: reason || 'unknown',
          }),
        }}
      />
    </main>
  );
}
