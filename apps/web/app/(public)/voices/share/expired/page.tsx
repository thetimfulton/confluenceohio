import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Link Expired',
  description: 'This verification link has expired. Please resubmit your perspective.',
  path: '/voices/share/expired',
  noIndex: true,
});

/**
 * /voices/share/expired — Expired verification token page
 * (Artifact 10 §7.3, Handoff 10A file 8).
 */
export default function VoiceExpiredPage() {
  return (
    <main
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center"
      role="main"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <svg
          className="h-8 w-8 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>

      <h1 className="mb-3 text-2xl font-bold text-gray-900">
        Your Verification Link Has Expired
      </h1>

      <p className="mb-2 text-gray-600">
        Verification links are valid for 72 hours. This link is no longer
        active.
      </p>

      <p className="mb-8 text-sm text-gray-500">
        Please submit your perspective again and check your email promptly to
        verify it.
      </p>

      <Link
        href="/voices/share"
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Submit Again
      </Link>
    </main>
  );
}
