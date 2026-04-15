import Link from 'next/link';
import { SubNavigation } from '@/components/shared/SubNavigation';
import { InlinePetitionBanner } from '@/components/shared/InlinePetitionBanner';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildPageMetadata({
  title: 'Why Rename Columbus?',
  description:
    '7 reasons Columbus, Ohio should consider a new name — from geography to history to branding opportunity. Read the case.',
  path: '/the-case',
  ogImage: '/images/og/the-case.png',
});

const ARGUMENTS = [
  {
    number: 1,
    title: 'The documented record',
    summary:
      'Christopher Columbus enslaved hundreds of Indigenous people and governed so brutally that Spain imprisoned him. These are documented in colonial records and contemporaneous accounts.',
    href: '/the-case/columbus-legacy',
  },
  {
    number: 2,
    title: 'Zero connection to Ohio',
    summary:
      'Columbus never set foot on the North American continent. He never saw the Scioto River or knew this place existed. The name was borrowed as a tribute to a distant figure.',
    href: '/the-case/history',
  },
  {
    number: 3,
    title: 'The city already knows',
    summary:
      'Columbus removed the statue in 2020. Replaced the holiday. Invested $3.5 million to "reimagine" the name\'s legacy. The conversation is already happening.',
    href: '/the-case/columbus-legacy',
  },
  {
    number: 4,
    title: 'Geography, not mythology',
    summary:
      'The Scioto and Olentangy rivers meet in the heart of downtown. That confluence is why this city exists. "Confluence" describes the place itself.',
    href: '/the-case/the-rivers',
  },
  {
    number: 5,
    title: 'A truer story',
    summary:
      'Columbus is one of the most diverse cities in the Midwest — a meeting point of communities, industries, and ideas. "Confluence" captures that identity.',
    href: '/the-case/the-rivers',
  },
  {
    number: 6,
    title: 'A branding opportunity',
    summary:
      'No other major American city is named Confluence. The name is distinctive, memorable, and carries positive meaning. It would generate national attention.',
    href: '/the-case',
  },
  {
    number: 7,
    title: 'Cities have done this before',
    summary:
      'Cincinnati was once Losantiville. Atlanta was Terminus. Barrow became Utqiagvik. Mumbai was Bombay. The sky did not fall.',
    href: '/the-case/precedents',
  },
] as const;

export default function TheCasePage() {
  return (
    <main>
      <JsonLd data={breadcrumbSchema('/the-case')!} />
      <SubNavigation />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Intro */}
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Why Rename Columbus?
        </h1>
        <div className="mb-10 space-y-4 text-base leading-relaxed text-gray-600 sm:text-lg">
          <p>
            Why should Columbus consider a new name? Not because the old one is
            broken — but because a better one has been here all along, written in
            the rivers that made this city possible.
          </p>
          <p>
            Here is the case. We have organized it into seven arguments. We have
            also published the seven strongest arguments against renaming —
            because we believe you deserve to hear both sides before you decide.
          </p>
        </div>

        {/* 7 Arguments Grid */}
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          The Seven Arguments
        </h2>
        <div className="mb-12 grid gap-4 sm:grid-cols-2">
          {ARGUMENTS.map(({ number, title, summary, href }) => (
            <Link
              key={number}
              href={href}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {number}
                </span>
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                  {title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">{summary}</p>
            </Link>
          ))}
        </div>

        {/* The Other Side */}
        <div className="mb-12 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            The Other Side
          </h2>
          <p className="mb-4 text-base text-gray-600">
            We take the opposition seriously. Two centuries of tradition, the
            cost and complexity of transition, the attachment millions of people
            feel to the name &ldquo;Columbus&rdquo; — these are real concerns,
            and we engage with them honestly.
          </p>
          <Link
            href="/faq"
            className="text-base font-semibold text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-800"
          >
            Read Our FAQ — Including the Strongest Counterarguments &rarr;
          </Link>
        </div>

        {/* Petition CTA */}
        <InlinePetitionBanner
          headline="Convinced? Or curious enough to keep reading?"
          description="Either way — 22,000 signatures puts this question on the ballot. Let voters decide."
        />
      </div>
    </main>
  );
}
