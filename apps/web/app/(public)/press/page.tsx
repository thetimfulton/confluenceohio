import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'Press & Media',
  description:
    'Media kit, press releases, and coverage of the Confluence Ohio campaign. Press contact: press@confluenceohio.org.',
  path: '/press',
  ogImage: '/images/og/press.png',
});

const KEY_FACTS = [
  { label: 'Campaign', value: 'Confluence Ohio \u2014 a citizen petition to rename Columbus, Ohio' },
  { label: 'Organization', value: '501(c)(4) civic organization' },
  { label: 'Proposed name', value: 'Confluence \u2014 the geographic term for the meeting of the Scioto and Olentangy rivers' },
  { label: 'Legal mechanism', value: 'Citizen-initiated charter amendment under Section 42 of the Columbus City Charter' },
  { label: 'Threshold', value: '~22,000 valid signatures (10% of last general municipal election turnout)' },
  { label: 'Vote required', value: 'Simple majority on the ballot' },
  { label: 'Founded', value: '2026' },
  { label: 'Website', value: 'confluenceohio.org' },
] as const;

export default function PressPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema('/press')!} />
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Press &amp; Media
      </h1>

      {/* Press Contact */}
      <section className="mb-10 rounded-xl border border-blue-100 bg-blue-50 p-6">
        <h2 className="mb-2 text-lg font-bold text-gray-900">Press Contact</h2>
        <p className="text-base text-gray-700">
          For media inquiries, interviews, and press credentials:
        </p>
        <p className="mt-2 text-base">
          <a
            href="mailto:press@confluenceohio.org"
            className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
          >
            press@confluenceohio.org
          </a>
        </p>
        <p className="mt-1 text-sm text-gray-600">Response time: Within 24 hours</p>
      </section>

      {/* Media Kit */}
      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-bold text-gray-900">Media Kit</h2>
        <p className="mb-4 text-base text-gray-600">
          Download our media kit (PDF) including campaign summary, key facts,
          high-resolution logos, campaign photography, leadership bios, key
          talking points, and historical fact sheet.
        </p>
        {/* TODO: Link to actual media kit PDF when available */}
        <button
          type="button"
          disabled
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-400 shadow-sm"
          aria-label="Media kit download coming soon"
        >
          Download Media Kit (PDF) &mdash; Coming Soon
        </button>
      </section>

      {/* Key Facts */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Key Facts (At-a-Glance)
        </h2>
        <dl className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {KEY_FACTS.map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4"
            >
              <dt className="flex-shrink-0 text-sm font-semibold text-gray-900 sm:w-40">
                {label}
              </dt>
              <dd className="text-sm text-gray-600">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Press Releases */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Press Releases
        </h2>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="text-sm text-gray-600">
            Press releases will be published here as they are issued. Check back
            after campaign launch.
          </p>
        </div>
      </section>

      {/* In the News */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">In the News</h2>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="text-sm text-gray-600">
            Media coverage links will be posted here as coverage arrives.
          </p>
        </div>
      </section>

      {/* Brand Assets */}
      <section className="mb-12">
        <h2 className="mb-3 text-2xl font-bold text-gray-900">Brand Assets</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Campaign logo (full) &mdash; SVG, PNG</li>
          <li>Campaign logo (icon) &mdash; SVG, PNG</li>
          <li>Brand colors and typography guide</li>
          <li>Approved campaign photography</li>
        </ul>
        {/* TODO: Link to actual brand assets ZIP when available */}
        <button
          type="button"
          disabled
          className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-400 shadow-sm"
          aria-label="Brand assets download coming soon"
        >
          Download All Assets (ZIP) &mdash; Coming Soon
        </button>
      </section>

      <InlinePetitionBanner />
    </main>
  );
}
