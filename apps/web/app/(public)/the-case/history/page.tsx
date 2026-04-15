import { SubNavigation } from '@/components/shared/SubNavigation';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'How Columbus Got Its Name: The 1812 Story',
  description:
    'A tavern owner, a borrowed name, and a city that almost became "Ohio City." The real story of how Columbus was named.',
  path: '/the-case/history',
  ogType: 'article',
  ogImage: '/images/og/history.png',
});

const TIMELINE = [
  { year: '~1000 BCE \u2013 1700s CE', event: 'Indigenous peoples establish settlements and ceremonial sites at the Scioto-Olentangy confluence. Nearly 200 mounds built in Franklin County.' },
  { year: '1797', event: 'Lucas Sullivant founds Franklinton on the west bank of the Scioto.' },
  { year: '1803', event: 'Ohio becomes a state. Chillicothe serves as the first capital.' },
  { year: '1810', event: 'Legislature authorizes a permanent capital at the "High Banks opposite Franklinton at the Forks of the Scioto."' },
  { year: '1812', event: 'Capital formally established on February 14. Named "Columbus" over "Ohio City," reportedly at the urging of Joseph Foos.' },
  { year: '1816', event: 'Columbus becomes the official state capital.' },
  { year: '1833', event: 'Ohio General Assembly accidentally renames Whetstone Creek to "Olentangy" \u2014 a Delaware name that actually belonged to a different waterway.' },
  { year: '1937', event: 'Columbus Day becomes a federal holiday.' },
  { year: '2020', event: 'Columbus statue removed from City Hall (July 1). City transitions to Indigenous Peoples\u2019 Day.' },
  { year: '2023', event: '"Reimagining Columbus" initiative launches ($3.5M, Mellon Foundation + City).' },
  { year: '2026', event: 'Confluence Ohio launches petition campaign.' },
] as const;

export default function HistoryPage() {
  return (
    <main>
      <JsonLd data={breadcrumbSchema('/the-case/history')!} />
      <SubNavigation />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="mb-10">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How Columbus Got Its Name
          </h1>
          <p className="text-lg text-gray-600">
            A tavern, a borrowed name, and a city that almost had a different
            one.
          </p>
        </header>

        <div className="prose-campaign space-y-10">
          {/* Before Columbus */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Before Columbus: The Land at the Forks
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              Long before any European name was attached to this place, the land
              at the confluence of the Scioto and Olentangy rivers was home to
              Indigenous peoples for thousands of years. The Shawnee, Delaware
              (Lenape), Mingo, and Wyandot all had presence in what is now
              central Ohio. Franklin County once held nearly 200 burial and
              ceremonial mounds — earthworks that speak to centuries of spiritual
              and cultural significance at this meeting of waters. Most have
              since been destroyed, though one survives on McKinley Avenue.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              The rivers drew people here. They have been doing so for a very
              long time.
            </p>
          </section>

          {/* Franklinton */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Franklinton: The First Settlement
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              In 1797 — fifteen years before Columbus existed — a surveyor named
              Lucas Sullivant founded Franklinton on the west bank of the Scioto
              River, naming it after Benjamin Franklin. It became the seat of
              Franklin County and the region&apos;s first permanent
              European-American settlement.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Franklinton looked east across the Scioto to the high bluffs on
              the opposite bank — a ridge the early settlers called{' '}
              <strong>Wolf&apos;s Ridge</strong>, for the eastern gray wolves
              that still roamed the area. The last confirmed wolf sighting in
              the region came in 1842.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              When Ohio&apos;s legislature decided in 1810 to build a permanent
              state capital, Franklinton&apos;s residents expected the new city
              would be theirs. Instead, the legislature chose the other side of
              the river — the high ground across the Scioto, at the forks where
              the Olentangy joined it. The founding document describes the
              chosen site as &ldquo;the High Banks opposite Franklinton at the
              Forks of the Scioto.&rdquo;
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              The rivers chose the location. But who chose the name?
            </p>
          </section>

          {/* Joseph Foos */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Joseph Foos and the Naming
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              The new capital needed a name. The legislators initially favored
              &ldquo;Ohio City&rdquo; — a functional, geographic choice. But a
              Franklinton tavern owner and state legislator named Joseph Foos had
              a different idea.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Foos admired Christopher Columbus, as many Americans did in the
              early 19th century. Columbus was widely celebrated in the young
              republic as a symbol of exploration, discovery, and the New World.
              His name was already on the District of Columbia, dozens of towns,
              and even a song (&ldquo;Hail, Columbia&rdquo;). He was, in 1812,
              an uncontroversial hero.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Legend holds that Foos lobbied his colleagues over drinks at his
              tavern — a story that may be apocryphal but has persisted for two
              centuries. What we know for certain is that the legislature chose
              &ldquo;Columbus&rdquo; over &ldquo;Ohio City,&rdquo; and the
              capital was formally established on February 14, 1812.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              It was a fine name for its time. The question we are asking is
              whether it still is.
            </p>
          </section>

          {/* The Name in Context */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              The Name in Context
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              Why did early Americans love Christopher Columbus? Because they
              needed a founding myth that predated England. Columbus — Italian by
              birth, Spanish by employ, and connected to no single colonial
              power — offered a convenient symbol of discovery and independence.
              Washington Irving&apos;s romanticized 1828 biography cemented the
              mythology. Columbus Day became a federal holiday in 1937, driven in
              part by Italian American advocacy for recognition during an era of
              intense anti-Italian discrimination.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              The mythology began to crack in the late 20th century as historians
              returned to primary sources: Columbus&apos;s own letters, the
              accounts of Bartolom&eacute; de Las Casas, the records of the
              Spanish colonial administration. What they found was more
              complicated — and more troubling — than the schoolbook version.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Columbus, the city, has already started grappling with this. In
              2020, the statue came down. The holiday was replaced. The
              Reimagining Columbus initiative invested $3.5 million to rethink
              how the city tells its own story. The name is the question that
              remains.
            </p>
          </section>

          {/* Timeline */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Timeline</h2>
            <ol className="relative border-l-2 border-blue-200 pl-6">
              {TIMELINE.map(({ year, event }) => (
                <li key={year} className="mb-6 last:mb-0">
                  <div className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border-2 border-blue-600 bg-white" />
                  <time className="mb-1 block text-sm font-semibold text-blue-700">
                    {year}
                  </time>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {event}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-12">
          <InlinePetitionBanner
            headline="The name was chosen in a tavern in 1812."
            description="In 2026, voters should get to choose."
          />
        </div>
      </article>
    </main>
  );
}
