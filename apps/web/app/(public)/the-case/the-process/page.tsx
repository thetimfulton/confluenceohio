import { SubNavigation } from '@/components/shared/SubNavigation';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'How to Rename Columbus: The Legal Process',
  description:
    "22,000 signatures, a ballot measure, a simple majority. Here's exactly how Columbus can become Confluence.",
  path: '/the-case/the-process',
  ogType: 'article',
  ogImage: '/images/og/the-process.png',
});

const STEPS = [
  {
    number: 1,
    title: 'Form a Petition Committee',
    description:
      'Five registered Columbus electors file a petition committee with the city. This committee is the legal sponsor of the charter amendment.',
    status: 'Done',
  },
  {
    number: 2,
    title: 'Collect Signatures',
    description:
      'The committee has up to two years to collect valid signatures from Columbus registered voters equal to 10% of the votes cast in the last general municipal election \u2014 approximately 22,000 signatures.',
    status: 'In progress',
  },
  {
    number: 3,
    title: 'Submit to the Board of Elections',
    description:
      'The completed petition is submitted to the Franklin County Board of Elections for signature validation. The City Clerk and City Attorney also review the petition for legal sufficiency.',
    status: null,
  },
  {
    number: 4,
    title: 'Validation and Certification',
    description:
      'The Board of Elections verifies that enough valid signatures have been collected. If the threshold is met, the charter amendment is certified for the ballot.',
    status: null,
  },
  {
    number: 5,
    title: 'Voters Decide',
    description:
      'The charter amendment appears on the next eligible ballot. A simple majority (50% + 1) of voters approves the change. No supermajority. No City Council veto. The voters decide.',
    status: null,
  },
] as const;

const PROCESS_FAQ = [
  {
    question: 'Does City Council have to approve this?',
    answer:
      'No. A citizen-initiated charter amendment bypasses City Council entirely. It goes from petition to ballot to voters. Council could separately place a similar measure on the ballot, but our path does not require their cooperation.',
  },
  {
    question: 'What if we do not reach 22,000 signatures?',
    answer:
      'Then the measure does not go to the ballot, and the name stays Columbus. We believe we will reach the threshold.',
  },
  {
    question: 'What if the vote fails?',
    answer:
      'Then the name stays Columbus, and the democratic process has spoken. We believe in the process regardless of the outcome.',
  },
  {
    question: 'What would the transition look like?',
    answer:
      'The charter amendment would include a phased transition plan: immediate updates to digital systems and official documents, gradual replacement of physical signage over 3\u20135 years (aligning with normal replacement cycles), and a dual-name recognition period.',
  },
  {
    question: 'How much would it cost?',
    answer:
      'We are commissioning an independent cost analysis and will publish the results. A phased transition spread over several years \u2014 replacing signs at end-of-life, updating digital systems in bulk \u2014 significantly reduces the total cost compared to an immediate switchover.',
  },
] as const;

export default function TheProcessPage() {
  return (
    <main>
      <JsonLd data={breadcrumbSchema('/the-case/the-process')!} />
      <SubNavigation />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How It Works
          </h1>
          <p className="text-lg text-gray-600">
            22,000 signatures. A ballot measure. A simple majority. Here is the
            path to Confluence.
          </p>
        </header>

        <div className="space-y-10">
          {/* Overview */}
          <section>
            <p className="text-base leading-relaxed text-gray-600">
              Renaming Columbus does not require an act of Congress or permission
              from City Council. Ohio law gives citizens the power to propose
              charter amendments directly — through a petition that, if
              validated, places the question on the ballot for voters to decide.
            </p>
            <p className="mt-4 text-base font-medium leading-relaxed text-gray-700">
              This is democracy working exactly as designed.
            </p>
          </section>

          {/* The Five Steps */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              The Five Steps
            </h2>
            <ol className="space-y-6">
              {STEPS.map(({ number, title, description, status }) => (
                <li key={number} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        status === 'Done'
                          ? 'bg-green-100 text-green-700'
                          : status === 'In progress'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {status === 'Done' ? (
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        number
                      )}
                    </div>
                    {number < 5 && (
                      <div className="mt-2 h-full w-px bg-gray-200" />
                    )}
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {title}
                      </h3>
                      {status && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === 'Done'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Where We Are Now */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Where We Are Now
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              We have formed our petition committee and launched signature
              collection. Every signature is verified for Ohio residency before
              it counts. We are building this petition the right way — no
              shortcuts, no padding.
            </p>
          </section>

          {/* Legal Authority */}
          <section>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Legal Authority
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              This process is governed by{' '}
              <strong>Section 42 of the Columbus City Charter</strong>, which
              establishes the right of citizens to propose charter amendments by
              petition. The amendment process is further supported by the Ohio
              Revised Code provisions for municipal charter amendments.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              The charter amendment would modify the official name of the city in
              the charter document. All subsequent legal, administrative, and
              public-facing references would update on a transition timeline
              established by the amendment&apos;s language.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Frequently Asked Questions About the Process
            </h2>
            <dl className="space-y-6">
              {PROCESS_FAQ.map(({ question, answer }) => (
                <div key={question}>
                  <dt className="text-base font-semibold text-gray-900">
                    {question}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-gray-600">
                    {answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-12">
          <InlinePetitionBanner
            headline="Every signature gets us closer to the ballot."
            description="Add yours."
          />
        </div>
      </article>
    </main>
  );
}
