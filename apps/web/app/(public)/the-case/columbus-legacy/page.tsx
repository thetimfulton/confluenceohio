import { SubNavigation } from '@/components/shared/SubNavigation';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'Who Was Christopher Columbus?',
  description:
    "Columbus never set foot in North America. Here's the documented record — and what the city has already done about it.",
  path: '/the-case/columbus-legacy',
  ogType: 'article',
  ogImage: '/images/og/columbus-legacy.png',
});

export default function ColumbusLegacyPage() {
  return (
    <main>
      <JsonLd data={breadcrumbSchema('/the-case/columbus-legacy')!} />
      <SubNavigation />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Who Was Christopher Columbus?
          </h1>
          <p className="text-lg text-gray-600">
            The documented record — and why the city that bears his name has
            already started to reckon with it.
          </p>
        </header>

        <div className="space-y-10">
          {/* The Mythology */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              The Mythology
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              For most of American history, Christopher Columbus was presented as
              a hero: the bold explorer who &ldquo;discovered&rdquo; the New
              World in 1492. This version of Columbus — the visionary who proved
              the Earth was round and opened a new continent to civilization —
              was taught in schools, celebrated in a federal holiday, and honored
              in the names of cities, counties, and the nation&apos;s capital
              district.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              The real history is more complicated.
            </p>
          </section>

          {/* The Documented Record */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              The Documented Record
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-600">
              Columbus made four voyages between 1492 and 1504, reaching
              Caribbean islands, the coasts of Central America, and northern
              South America. He never reached the North American continent —
              never set foot in what would become the United States, and
              certainly never came anywhere near Ohio.
            </p>
            <p className="mb-4 text-base leading-relaxed text-gray-600">
              What he did in the places he reached is documented in Spanish
              colonial records, his own letters, and the accounts of
              contemporaries:
            </p>

            <div className="space-y-4">
              <div className="rounded-lg border-l-4 border-gray-300 bg-gray-50 p-4">
                <h3 className="mb-1 text-sm font-bold text-gray-900">
                  Enslavement
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  On his second voyage in 1493, Columbus enslaved an estimated
                  550 Arawak people. Roughly 200 died during the transatlantic
                  crossing to Spain.
                </p>
              </div>
              <div className="rounded-lg border-l-4 border-gray-300 bg-gray-50 p-4">
                <h3 className="mb-1 text-sm font-bold text-gray-900">
                  Forced labor and brutality
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  As governor of Hispaniola, Columbus imposed a gold tribute
                  system on the Indigenous Taino people. Those who failed to meet
                  quotas had their hands cut off.
                </p>
              </div>
              <div className="rounded-lg border-l-4 border-gray-300 bg-gray-50 p-4">
                <h3 className="mb-1 text-sm font-bold text-gray-900">
                  Arrest by Spain
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  Columbus&apos;s governance was so extreme that the Spanish
                  Crown sent Francisco de Bobadilla to investigate in 1500.
                  Bobadilla arrested Columbus and shipped him back to Spain in
                  chains.
                </p>
              </div>
              <div className="rounded-lg border-l-4 border-gray-300 bg-gray-50 p-4">
                <h3 className="mb-1 text-sm font-bold text-gray-900">
                  Contemporary testimony
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  Bartolom&eacute; de Las Casas, a Spanish priest who witnessed
                  the aftermath of Columbus&apos;s governance, documented the
                  conditions in his accounts. His testimony describes systematic
                  destruction of entire peoples.
                </p>
              </div>
            </div>

            <p className="mt-4 text-base leading-relaxed text-gray-600">
              These are not revisionist claims. They are documented in primary
              sources that historians have studied for centuries.
            </p>
          </section>

          {/* Zero Connection to Ohio */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Zero Connection to Ohio
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              This point is simple but worth emphasizing: Christopher Columbus
              never came to Ohio. He never came to North America. His four
              voyages took him to the Caribbean and the coasts of Central and
              South America. He had no connection to the Scioto River, no
              knowledge of the Olentangy, no awareness that the confluence
              existed.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              The name &ldquo;Columbus&rdquo; was attached to this city in 1812
              as a tribute to a figure who was widely admired at the time. It
              was a borrowed name — not a name earned through connection to this
              place.
            </p>
          </section>

          {/* What the City Has Already Done */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              What the City Has Already Done
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-600">
              Columbus, Ohio has not waited for a renaming campaign to begin
              grappling with its namesake:
            </p>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <time className="text-sm font-semibold text-blue-700">
                  July 1, 2020
                </time>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Mayor Andrew Ginther ordered the removal of a 20-foot
                  Christopher Columbus statue from City Hall. The statue, donated
                  by the Italian American community in 1955, was placed in
                  storage.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <time className="text-sm font-semibold text-blue-700">
                  2018&ndash;2020
                </time>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  The city stopped officially celebrating Columbus Day,
                  transitioning to recognition of Indigenous Peoples&apos; Day.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <time className="text-sm font-semibold text-blue-700">
                  June 2023
                </time>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  The city launched the Reimagining Columbus initiative — a $3.5
                  million project funded by the Mellon Foundation ($2 million)
                  and the City of Columbus ($1.5 million).
                </p>
              </div>
            </div>

            <p className="mt-4 text-base leading-relaxed text-gray-600">
              When a city removes the statue, replaces the holiday, and spends
              $3.5 million reimagining the narrative — the name is the remaining
              question.
            </p>
          </section>

          {/* Italian American Heritage */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              A Note on Italian American Heritage
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              We want to address this directly. For many Italian Americans,
              Christopher Columbus has historically represented a point of
              cultural pride and visibility. Columbus Day was established partly
              as recognition of Italian American contributions during an era of
              severe anti-Italian discrimination.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              We understand that renaming can feel like erasure. It is not our
              intention. Italian American contributions to Columbus are real and
              specific — from the markets of the old North End to the families
              and institutions that helped build this city. That heritage deserves
              recognition on its own terms, not through a figure whose legacy is
              increasingly contested.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              We support dedicated Italian American heritage recognition — a
              cultural center, a heritage trail, named public spaces — that
              celebrates the community&apos;s actual contributions to this city.
            </p>
          </section>

          {/* Sources */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Sources</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>
                Las Casas, Bartolom&eacute; de.{' '}
                <em>A Short Account of the Destruction of the Indies</em> (1552)
              </li>
              <li>Columbus&apos;s letters and logs (various translations)</li>
              <li>Bobadilla&apos;s report to the Spanish Crown (1500)</li>
              <li>
                NPR: &ldquo;Columbus, Ohio, Takes Down Statue Of Christopher
                Columbus&rdquo; (July 1, 2020)
              </li>
              <li>
                Mellon Foundation: &ldquo;Columbus, Ohio is Transcending the
                Confines of Its Namesake&rdquo; (2023)
              </li>
            </ul>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-12">
          <InlinePetitionBanner
            headline="We are not erasing history."
            description="We are making a different choice about what to honor."
          />
        </div>
      </article>
    </main>
  );
}
