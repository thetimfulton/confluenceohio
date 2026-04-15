import { Suspense } from 'react';
import Link from 'next/link';
import { ActBlueEmbed } from '@/components/donate/ActBlueEmbed';
import { DonateFallbackLink } from '@/components/donate/DonateFallbackLink';
import { buildActBlueUrl } from '@confluenceohio/core/donations/refcode';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

/**
 * /donate — Donation page (Artifact 09 §4).
 *
 * Hero + two-column layout: impact info sidebar + ActBlue embed.
 * Fallback link for direct ActBlue access. Transparency section
 * and petition CTA below the fold.
 */

export const metadata = buildPageMetadata({
  title: 'Support the Campaign',
  description:
    'Fund the campaign to rename Columbus to Confluence. Every dollar helps us reach 22,000 signatures and get on the ballot.',
  path: '/donate',
  ogImage: '/images/og/donate.png',
});

const IMPACT_TIERS = [
  { amount: 5, label: 'Prints 25 petition flyers' },
  { amount: 10, label: 'Provides materials for one volunteer shift' },
  { amount: 25, label: 'Funds one community event' },
  { amount: 50, label: 'One week of targeted digital outreach' },
  { amount: 100, label: 'Covers legal filing costs for one month' },
] as const;

export default function DonatePage() {
  const fallbackUrl = buildActBlueUrl({
    refcode: 'donate_page_fallback',
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8" role="main">
      <JsonLd data={breadcrumbSchema('/donate')!} />
      {/* ─── Hero ─── */}
      <section className="mb-12 text-center" aria-labelledby="donate-heading">
        <h1
          id="donate-heading"
          className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
        >
          Fund the Future of Confluence
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          Every dollar moves us closer to 22,000 signatures and a spot on the
          ballot.
        </p>
      </section>

      {/* ─── Two-Column: Info + Embed ─── */}
      <section
        className="mb-16 lg:grid lg:grid-cols-[40%_60%] lg:gap-12"
        aria-label="Donation information and form"
      >
        {/* Left column — Why donate + impact grid */}
        <div className="mb-10 lg:mb-0">
          <h2 className="mb-3 text-2xl font-bold text-gray-900">
            Why Donate?
          </h2>
          <p className="mb-6 text-base text-gray-600">
            Running a petition campaign takes resources: printing flyers,
            training volunteers, running digital outreach, hosting community
            events, covering legal costs, and keeping the lights on. Confluence
            Ohio is a 501(c)(4) civic organization funded entirely by individual
            donations. We do not take corporate money.
          </p>

          {/* Impact Grid */}
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            How Your Money Is Used
          </h3>
          <div className="mb-6 space-y-3" role="list">
            {IMPACT_TIERS.map(({ amount, label }) => (
              <div
                key={amount}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                role="listitem"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  ${amount}
                </span>
                <span className="text-sm text-gray-700">{label}</span>
              </div>
            ))}
          </div>

          {/* Monthly pitch */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <h3 className="mb-1 text-base font-semibold text-blue-900">
              Make It Monthly
            </h3>
            <p className="text-sm text-blue-800">
              Sustaining donors keep the campaign running between big pushes. A
              $10/month commitment funds ongoing volunteer support and digital
              outreach.
            </p>
          </div>
        </div>

        {/* Right column — ActBlue embed + fallback */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <Suspense
              fallback={
                <div className="flex min-h-[400px] items-center justify-center">
                  <p className="text-sm text-gray-500">
                    Loading donation form&hellip;
                  </p>
                </div>
              }
            >
              <ActBlueEmbed refcode="donate_page" />
            </Suspense>
          </div>

          {/* Fallback link (always visible below embed) */}
          <DonateFallbackLink href={fallbackUrl} refcode="donate_page_fallback" />
        </div>
      </section>

      {/* ─── Transparency ─── */}
      <section
        className="mb-16 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:p-8"
        aria-label="Financial transparency"
      >
        <h2 className="mb-3 text-2xl font-bold text-gray-900">Transparency</h2>
        <p className="mb-4 text-base text-gray-600">
          Confluence Ohio is a 501(c)(4) civic organization. We are committed to
          full transparency about how donations are used. Quarterly financial
          reports are published on our blog.
        </p>
        <p className="text-sm text-gray-500">
          Contributions to Confluence Ohio are not tax-deductible. ActBlue
          charges a 3.95% processing fee, which you can optionally cover at
          checkout.
        </p>
      </section>

      {/* ─── Not ready to donate? CTAs ─── */}
      <section className="text-center" aria-label="Other ways to support">
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Not ready to donate?
        </h2>
        <p className="mb-6 text-base text-gray-600">
          Your signature is free — and it&apos;s the most important thing you
          can do.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Sign the Petition
          </Link>
          <Link
            href="/volunteer"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Volunteer Instead
          </Link>
        </div>
      </section>
    </main>
  );
}
