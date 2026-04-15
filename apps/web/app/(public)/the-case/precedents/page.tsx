import { SubNavigation } from '@/components/shared/SubNavigation';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'Cities That Changed Their Names',
  description:
    "From Cincinnati to Mumbai, cities have renamed themselves throughout history. Here's what happened.",
  path: '/the-case/precedents',
  ogType: 'article',
  ogImage: '/images/og/precedents.png',
});

const CASE_STUDIES = [
  {
    before: 'Losantiville',
    after: 'Cincinnati',
    year: '1790',
    location: 'Ohio',
    heading: 'Cincinnati, Ohio (1790) — Ohio\u2019s Own Precedent',
    body: [
      'Right here in Ohio, the settlement that would become Cincinnati was originally named Losantiville \u2014 a tortured neologism coined by surveyor John Filson, who patched together Latin and French roots meaning "the town opposite the mouth of the Licking River." Even by 18th-century naming standards, it was a mouthful.',
      'Governor Arthur St. Clair renamed it Cincinnati in 1790, after the Society of the Cincinnati, an organization of Revolutionary War officers named for the Roman citizen-soldier Cincinnatus. The new name stuck. Cincinnati became one of the great American cities of the 19th century.',
      'Ohio has renamed a major city before. The process worked. The city is fine.',
    ],
  },
  {
    before: 'Barrow',
    after: 'Utqia\u0121vik',
    year: '2016',
    location: 'Alaska',
    heading: 'Utqia\u0121vik, Alaska (2016) — The Most Recent Example',
    body: [
      'In 2016, residents of Barrow, Alaska \u2014 the northernmost city in the United States \u2014 voted 381 to 375 to restore the city\u2019s original I\u00f1upiaq name, Utqia\u0121vik, meaning "place for gathering wild roots." The margin was just six votes.',
      'The campaign was driven by a desire to reclaim Indigenous identity and move past a colonial-era name. The transition was not without controversy \u2014 a margin that narrow ensures some lasting disagreement. But the name changed, official records were updated, and the city moved on.',
      'Utqia\u0121vik is the most recent American city renaming \u2014 and a reminder that it can be done at any scale, by democratic vote.',
    ],
  },
  {
    before: 'Terminus / Marthasville',
    after: 'Atlanta',
    year: '1845',
    location: 'Georgia',
    heading: 'Atlanta, Georgia (1845) — The Triple Rename',
    body: [
      'The city that became Atlanta was founded in 1837 as Terminus \u2014 literally "the end of the line," because it was where the Western & Atlantic Railroad ended. In 1843, it was renamed Marthasville after the governor\u2019s daughter. Just two years later, in 1845, it was renamed again to Atlanta.',
      'Atlanta changed its name twice in eight years. Today it is one of the most recognized city names in the world. No one mourns the loss of "Terminus."',
    ],
  },
  {
    before: 'Pig\u2019s Eye Landing',
    after: 'St. Paul',
    year: '1849',
    location: 'Minnesota',
    heading: 'St. Paul, Minnesota (1849) — From Pig\u2019s Eye to Sainthood',
    body: [
      'In the 1830s, the settlement that would become Minnesota\u2019s capital was informally called "Pig\u2019s Eye Landing" after Pierre Parrant, a one-eyed French-Canadian fur trader who operated a tavern on the riverbank. When a Catholic priest built a chapel and named it for St. Paul, the settlement followed suit.',
      'The parallel to Columbus is hard to miss: a tavern owner gave one city its name, and a tavern owner\u2019s legacy got replaced in another. Sometimes tavern names age well. Sometimes they don\u2019t.',
    ],
  },
  {
    before: 'Bombay',
    after: 'Mumbai',
    year: '1995',
    location: 'India',
    heading: 'Mumbai, India (1995\u201396) — Renaming at Global Scale',
    body: [
      'Mumbai is the case that answers the biggest objection: "But everyone knows the old name." Bombay was one of the most recognized city names on earth. When India\u2019s Maharashtra state government officially renamed it Mumbai \u2014 after the goddess Mumbadevi, reclaiming the Marathi heritage from a colonial-era English name \u2014 critics predicted confusion, economic damage, and brand destruction.',
      'None of that happened. Mumbai is now the world\u2019s fourth-largest metropolitan area. International businesses did not flee. The name change took time to propagate, but within a decade, "Mumbai" was standard usage worldwide.',
      'If a city of 20 million can change its name without losing its identity, a city of 905,000 can too.',
    ],
  },
] as const;

export default function PrecedentsPage() {
  return (
    <main>
      <JsonLd data={breadcrumbSchema('/the-case/precedents')!} />
      <SubNavigation />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Cities That Changed Their Names
          </h1>
          <p className="text-lg text-gray-600">
            It has happened before. It was disruptive, and then it was normal.
          </p>
        </header>

        <div className="space-y-10">
          {/* Introduction */}
          <p className="text-base leading-relaxed text-gray-600">
            City renaming sounds radical until you look at how many cities have
            done it. Across the United States and around the world, communities
            have changed their names when the old name no longer fit — or when a
            better one was waiting. In every case, the city survived. In most
            cases, it thrived.
          </p>

          {/* Case Studies */}
          {CASE_STUDIES.map((study) => (
            <section key={study.after}>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">
                {study.heading}
              </h2>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {study.before} &rarr; {study.after}
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {study.year}
                </span>
              </div>
              {study.body.map((paragraph, i) => (
                <p
                  key={i}
                  className="mt-4 first:mt-0 text-base leading-relaxed text-gray-600"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          {/* Others Worth Knowing */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Others Worth Knowing
            </h2>
            <div className="space-y-3">
              <p className="text-base leading-relaxed text-gray-600">
                <strong>Denali / Mount McKinley (2015):</strong> The federal
                government officially restored the name Denali to North
                America&apos;s tallest peak, ending decades of Alaskan advocacy.
                The state of Ohio, ironically, was the primary opponent.
              </p>
              <p className="text-base leading-relaxed text-gray-600">
                <strong>Istanbul / Constantinople (1930):</strong> Turkey
                officially adopted the name Istanbul — which had been in common
                Turkish usage for centuries — as part of broader national
                modernization.
              </p>
              <p className="text-base leading-relaxed text-gray-600">
                <strong>Chennai / Madras (1996):</strong> India renamed Madras to
                Chennai the same year as Mumbai&apos;s change, also to reclaim
                Indigenous heritage over colonial naming.
              </p>
            </div>
          </section>

          {/* The Pattern */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              The Pattern
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-600">
              Successful city renamings share common features:
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-base leading-relaxed text-gray-600">
              <li>
                <strong>A clear reason</strong> — geographic, cultural, or
                democratic
              </li>
              <li>
                <strong>A better name waiting</strong> — not just opposition to
                the old one
              </li>
              <li>
                <strong>Democratic process</strong> — a vote, a legal mechanism,
                a community decision
              </li>
              <li>
                <strong>A transition period</strong> — dual-name usage, phased
                sign replacement, patience
              </li>
              <li>
                <strong>Time</strong> — within a few years, the new name becomes
                normal
              </li>
            </ol>
            <p className="mt-4 text-base font-medium leading-relaxed text-gray-700">
              Columbus has all five ingredients.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-12">
          <InlinePetitionBanner
            headline="They did it. We can too."
            description="The first step is 22,000 signatures."
          />
        </div>
      </article>
    </main>
  );
}
