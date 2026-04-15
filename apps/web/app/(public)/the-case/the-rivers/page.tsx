import { SubNavigation } from '@/components/shared/SubNavigation';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'The Confluence: Where the Scioto and Olentangy Meet',
  description:
    'Two rivers meet in downtown Columbus — the geographic fact that made this city possible. Discover the confluence.',
  path: '/the-case/the-rivers',
  ogType: 'article',
  ogImage: '/images/og/the-rivers.png',
});

export default function TheRiversPage() {
  return (
    <main>
      <JsonLd data={breadcrumbSchema('/the-case/the-rivers')!} />
      <SubNavigation />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            The Confluence
          </h1>
          <p className="text-lg text-gray-600">
            Two rivers meet in the heart of this city. That meeting is why the
            city exists.
          </p>
        </header>

        <div className="space-y-10">
          {/* The Scioto */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              The Scioto
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              The Scioto River flows 231 miles from its headwaters near Kenton,
              Ohio, south through the center of the state to the Ohio River at
              Portsmouth. It is the longest river flowing entirely within
              Ohio&apos;s borders — significant enough to appear on the state
              seal.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Its name comes from the Wyandot language, likely meaning
              &ldquo;deer&rdquo; — a reflection of the abundant wildlife that
              once lined its banks. The Scioto is Ohio&apos;s river: it threads
              through the state&apos;s geographic and political center, past the
              capital, carrying water that has shaped settlement patterns for
              thousands of years.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              In downtown Columbus, the Scioto runs through the heart of the
              city. The Scioto Mile — a network of parks, paths, and gathering
              spaces along the riverfront — has transformed what was once a
              neglected waterway into one of the city&apos;s most beloved public
              spaces.
            </p>
          </section>

          {/* River facts */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <h3 className="mb-1 text-lg font-bold text-gray-900">Scioto River</h3>
              <dl className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <dt>Length</dt>
                  <dd className="font-medium text-gray-900">231 miles</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Name origin</dt>
                  <dd className="font-medium text-gray-900">Wyandot (&ldquo;deer&rdquo;)</dd>
                </div>
                <div className="flex justify-between">
                  <dt>On the state seal</dt>
                  <dd className="font-medium text-gray-900">Yes</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <h3 className="mb-1 text-lg font-bold text-gray-900">Olentangy River</h3>
              <dl className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <dt>Length</dt>
                  <dd className="font-medium text-gray-900">97 miles</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Name origin</dt>
                  <dd className="font-medium text-gray-900">Delaware (mistaken 1833)</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Trail length</dt>
                  <dd className="font-medium text-gray-900">13 miles</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* The Olentangy */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              The Olentangy
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              The Olentangy River runs 97 miles from its source in Crawford
              County south through Delaware County and the Columbus metro,
              winding past Ohio State&apos;s campus before joining the Scioto.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Its name has a curious history. The settlers called it the
              Whetstone, from the Delaware (Lenape) word{' '}
              <em>keenhongsheconsepung</em> — &ldquo;place of the sharp
              tool,&rdquo; likely referring to the flint deposits along its
              banks. In 1833, the Ohio General Assembly tried to restore
              Indigenous place names to several waterways. In the process, they
              accidentally assigned the name &ldquo;Olentangy&rdquo; — a
              Delaware word meaning &ldquo;river of the red face paint,&rdquo;
              after the red ochre found along its banks — to the wrong river.
              The mix-up stuck.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              It is a small irony: even the river&apos;s name is a case of
              mistaken identity. But the river itself is no mistake.
            </p>
          </section>

          {/* Where They Meet */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Where They Meet
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              Just northwest of North Bank Park, in the northern edge of
              downtown Columbus, the Olentangy flows into the Scioto. This is
              the confluence.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              It is not dramatic in the way some river junctions are — no
              crashing whitewater, no towering canyon walls. It is a quiet
              meeting of two Midwestern rivers, visible from the bridges and
              paths that cross this part of the city. Confluence Park, a 21-acre
              green space, sits at the junction. The Boat House restaurant
              overlooks it.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              But this quiet junction is the reason Columbus exists. When the
              Ohio legislature chose a capital site in 1812, they chose the high
              banks at the forks of the Scioto — this specific spot, where the
              rivers come together. The geography determined the city. The
              confluence came first.
            </p>
          </section>

          {/* Indigenous history */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              A Place of Gathering — Before and After 1812
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              The rivers drew people here long before European settlement. The
              Shawnee, Delaware, Mingo, and Wyandot peoples all recognized the
              confluence as a gathering point. The nearly 200 mounds that once
              dotted Franklin County — burial sites, ceremonial earthworks,
              markers of civic and spiritual life — cluster along the river
              corridors. The rivers were not just water sources. They were
              routes, boundaries, meeting places.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              That has not changed. The Scioto Mile and the Olentangy Trail are
              where Columbus gathers now. The riverfront festivals, the morning
              jogs, the Saturday walks along the water — these are the modern
              expressions of the same geographic pull that brought people to this
              spot for millennia.
            </p>
          </section>

          {/* The Metaphor */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              The Metaphor That Is Not a Metaphor
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              &ldquo;Confluence&rdquo; is not just a geographic term. It is the
              word for what happens in this city every day.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Columbus is one of the most diverse metropolitan areas in the
              Midwest. It is home to one of the largest Somali communities in the
              United States. Significant Nepali and Bhutanese refugee communities
              have established roots here. The city&apos;s Appalachian, African
              American, and Latin American communities are woven into its
              neighborhoods from Linden to the Hilltop. Ohio State University
              brings 60,000 students from around the world.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              This is a city where state government and startup culture converge,
              where logistics hubs and research labs sit side by side, where a
              Big Ten university campus meets the Short North arts district meets
              a revitalizing Franklinton. It is a city defined by what comes
              together here.
            </p>
            <p className="mt-4 text-base font-medium leading-relaxed text-gray-700">
              &ldquo;Confluence&rdquo; is not a metaphor applied to this city.
              It is a description of what this city is.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-12">
          <InlinePetitionBanner
            headline="The rivers are still meeting."
            description="They have been meeting since long before 1812. We think the name should say so."
          />
        </div>
      </article>
    </main>
  );
}
