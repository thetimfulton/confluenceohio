import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Submission Received',
  description:
    'Your perspective has been received. We review submissions within 48 hours.',
  path: '/voices/share/confirmed',
  noIndex: true,
});

/**
 * /voices/share/confirmed — Success page after email verification
 * (Artifact 10 §8.1, Handoff 10A file 7).
 */
export default function VoiceConfirmedPage() {
  return (
    <main
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center"
      role="main"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-8 w-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>

      <h1 className="mb-3 text-2xl font-bold text-gray-900">
        Your Submission Is Being Reviewed
      </h1>

      <p className="mb-2 text-gray-600">
        Thank you for sharing your perspective. We&apos;ve received your
        submission and it&apos;s now in our review queue.
      </p>

      <p className="mb-8 text-sm text-gray-500">
        Most perspectives are reviewed within 48 hours. You&apos;ll receive an
        email when your submission is approved or if it needs any changes.
      </p>

      <Link
        href="/voices"
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Read Other Perspectives
      </Link>
    </main>
  );
}
