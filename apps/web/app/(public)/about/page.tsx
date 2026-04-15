import Link from 'next/link';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { buildPageMetadata } from '@/lib/seo';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'About Confluence Ohio',
  description:
    'Confluence Ohio is a 501(c)(4) civic organization led by Columbus residents. Meet the team and learn our mission.',
  path: '/about',
  ogImage: '/images/og/about.png',
});

const VALUES = [
  {
    title: 'Honest conversation',
    description:
      'We present the strongest arguments on both sides. We do not mock people who disagree with us. We believe the best case for renaming is made in the presence of the best case against it.',
  },
  {
    title: 'Democratic process',
    description:
      'We are not here to impose anything. We are here to collect signatures, put a question on the ballot, and let voters decide. If the vote fails, we respect the outcome.',
  },
  {
    title: 'Historical rigor',
    description:
      'Every claim we make is sourced. We do not distort history to fit our argument. If we get something wrong, we correct it publicly.',
  },
  {
    title: 'Transparency',
    description:
      'We publish our team, our finances, and our methods. You can always ask us who we are and what we are doing with your support.',
  },
] as const;

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema('/about')!} />

      {/* Mission */}
      <section className="mb-12">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          About Confluence Ohio
        </h1>
        <p className="text-lg leading-relaxed text-gray-600">
          Confluence Ohio is building a civic movement to rename Columbus, Ohio
          to Confluence, Ohio — replacing a name honoring a man who never set
          foot in this state with one that describes the meeting of rivers,
          peoples, and ideas that made this city possible.
        </p>
      </section>

      {/* Values */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Our Values</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map(({ title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h3 className="mb-2 text-base font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* The Team */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">The Team</h2>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="text-base text-gray-600">
            We are a group of Columbus residents building this campaign together.
            Full team bios and photos are coming soon. Check back for
            introductions.
          </p>
        </div>
      </section>

      {/* Organization */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Organization</h2>
        <p className="mb-4 text-base leading-relaxed text-gray-600">
          Confluence Ohio is a 501(c)(4) civic organization registered in the
          state of Ohio. Our mission is to build public support for renaming
          Columbus to Confluence through education, community engagement, and
          the democratic petition process.
        </p>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
            <p className="text-sm text-gray-600">
              <a
                href="mailto:info@confluenceohio.org"
                className="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
              >
                info@confluenceohio.org
              </a>
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Social</h3>
            <ul className="flex gap-4 text-sm text-gray-600">
              <li>
                <a
                  href="https://www.facebook.com/confluenceohio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/confluenceohio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  X/Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/confluenceohio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTAs */}
      <InlinePetitionBanner />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/donate"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
        >
          Donate
        </Link>
        <Link
          href="/volunteer"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
        >
          Volunteer
        </Link>
      </div>
    </main>
  );
}
