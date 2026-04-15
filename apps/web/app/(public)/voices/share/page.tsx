import { buildPageMetadata } from '@/lib/seo';
import { VoiceSubmissionForm } from './voice-submission-form';

export const metadata = buildPageMetadata({
  title: 'Share Your Perspective',
  description:
    'Whether you support, oppose, or are undecided — share your perspective on renaming Columbus to Confluence, Ohio.',
  path: '/voices/share',
  ogImage: '/images/og/voices.png',
  noIndex: true,
});

/**
 * /voices/share — Community voice submission form (Artifact 10 §1).
 *
 * Server component shell with metadata. The interactive form is a
 * client component with progressive enhancement.
 */
export default async function VoiceSharePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main
      className="mx-auto max-w-[640px] px-4 py-12 sm:px-6"
      role="main"
    >
      {/* Community Guidelines (Artifact 10 §1.3) */}
      <section className="mb-10">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Share Your Perspective
        </h1>
        <p className="mb-6 text-gray-600">
          We publish perspectives from all positions — support, opposition, and
          undecided. Every voice matters, and disagreement is welcome.
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Community Guidelines
          </h2>
          <p className="mb-3 text-sm text-gray-600">
            We publish perspectives from all positions — support, opposition,
            and undecided. Every voice matters, and disagreement is welcome.
          </p>
          <p className="mb-2 text-sm text-gray-600">
            We do remove submissions that contain:
          </p>
          <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
            <li>Personal attacks or name-calling</li>
            <li>Spam, commercial content, or off-topic material</li>
            <li>Hate speech or slurs targeting any group</li>
            <li>Threats or incitement to violence</li>
            <li>
              Plagiarized content or AI-generated text presented as personal
              perspective
            </li>
          </ul>
          <p className="text-sm text-gray-500">
            Submissions are reviewed by a combination of automated tools and
            human moderators. Most submissions are reviewed within 48 hours.
            You&apos;ll receive an email when your submission is approved or if
            it needs revision.
          </p>
        </div>
      </section>

      {/* Submission form (client component) */}
      <VoiceSubmissionForm error={params.error} />
    </main>
  );
}
