import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';
import { VolunteerForm } from './volunteer-form';

export const metadata = buildPageMetadata({
  title: 'Volunteer',
  description:
    'Join the Confluence Ohio campaign. Collect signatures, organize events, create content, and help build a movement.',
  path: '/volunteer',
  ogImage: '/images/og/volunteer.png',
});

/**
 * /volunteer — Volunteer signup page (Artifact 08 §2).
 *
 * Server component shell with metadata. The interactive form is a
 * client component imported below.
 */
export default function VolunteerPage({
  searchParams,
}: {
  searchParams: Promise<{ signed?: string; source?: string }>;
}) {
  // We can't await searchParams in a sync server component that also
  // renders a client subtree easily, so pass the promise through
  // and let the client component read it. Instead, pass as props.
  // Actually in Next.js 15 with async server components, we can:
  return <VolunteerPageInner searchParams={searchParams} />;
}

async function VolunteerPageInner({
  searchParams,
}: {
  searchParams: Promise<{ signed?: string; source?: string }>;
}) {
  const params = await searchParams;
  const cameFromPetition = params.signed === 'true';
  const source = params.source || (cameFromPetition ? 'petition_thankyou' : 'volunteer_page');

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8" role="main">
      <JsonLd data={breadcrumbSchema('/volunteer')!} />
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Join the Movement
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          Renaming a city takes more than signatures — it takes people. Pick the
          roles that fit your skills and schedule, and we&apos;ll get you started.
        </p>
      </div>

      {/* Two-column layout on desktop (Artifact 08 §2.2) */}
      <div className="lg:grid lg:grid-cols-[55%_45%] lg:gap-12">
        <div>
          <VolunteerForm
            source={source}
            cameFromPetition={cameFromPetition}
          />
        </div>

        {/* Social proof sidebar — desktop only */}
        <aside className="hidden lg:block" aria-label="Volunteer information">
          <div className="sticky top-8 space-y-8">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                Why volunteer?
              </h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    1
                  </span>
                  <span>
                    This is how cities change — neighbors talking to neighbors.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    2
                  </span>
                  <span>
                    Every role matters. Even an hour a week of social sharing reaches
                    people we can&apos;t reach alone.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    3
                  </span>
                  <span>
                    You&apos;ll get training, materials, and support — nobody&apos;s
                    thrown in alone.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <blockquote className="text-sm italic text-gray-600">
                &ldquo;I signed the petition and then thought — what else can I do?
                Two weeks later I was collecting signatures at the North Market.
                Best decision I made this year.&rdquo;
              </blockquote>
              {/* TODO: Replace with real volunteer testimonial before launch */}
              <p className="mt-3 text-xs font-medium text-gray-500">
                &mdash; Early volunteer, Clintonville
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Below-form CTA for non-signers (Artifact 08 §2.7) */}
      {!cameFromPetition && (
        <div className="mt-12 rounded-lg border border-blue-100 bg-blue-50 p-6 text-center">
          <p className="text-sm text-blue-800">
            Haven&apos;t signed the petition yet?{' '}
            <a
              href="/sign"
              className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
            >
              Start there
            </a>{' '}
            — then come back and join the team.
          </p>
        </div>
      )}
    </main>
  );
}
