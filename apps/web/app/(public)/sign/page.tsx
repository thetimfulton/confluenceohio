import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PetitionForm } from '@/components/petition/PetitionForm';
import {
  SignatureCounterDynamic,
  SignatureCounterCompactDynamic,
} from '@/components/petition/SignatureCounterDynamic';
import { RecentSigners } from '@/components/petition/RecentSigners';
import { PetitionHeadline } from './components/petition-headline';
import type { PublicRecentSigner } from '@confluenceohio/db/types';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';

// ---------------------------------------------------------------------------
// Dynamic SSR — fresh counter + Turnstile on every request (Artifact 14 §2.4)
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Metadata — dynamic OG with live signature count (Artifact 11 §3.4)
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  let count = 0;
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('campaign_metrics')
      .select('value')
      .eq('metric', 'signature_count')
      .maybeSingle();
    count = data?.value ?? 0;
  } catch {
    // Fall back to generic description
  }

  const formatted = count.toLocaleString('en-US');
  const milestones = [1000, 2500, 5000, 10000, 15000, 22000];
  const next = milestones.find((m) => m > count) ?? 22000;

  const title = count > 0
    ? `${formatted} Ohioans Have Signed — Add Your Name`
    : 'Sign the Petition — Confluence Ohio';
  const description = count > 0
    ? `${formatted} Ohioans have signed. Help us reach ${next.toLocaleString('en-US')} to put the question on the ballot.`
    : 'Add your name to rename Columbus to Confluence, Ohio. 22,000 signatures puts the question on the ballot.';

  return {
    title: 'Sign the Petition',
    description,
    alternates: { canonical: '/sign' },
    openGraph: {
      title,
      description: `Join ${formatted || ''} people who want Columbus to become Confluence, Ohio. 22,000 signatures puts the question on the ballot.`,
      images: [
        {
          url: '/api/og/petition',
          width: 1200,
          height: 630,
          alt: `${formatted} signatures on the Confluence Ohio petition`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/api/og/petition'],
    },
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getSignatureCount(): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('campaign_metrics')
      .select('value')
      .eq('metric', 'signature_count')
      .maybeSingle();
    return data?.value ?? 0;
  } catch {
    return 0;
  }
}

async function getRecentSigners(): Promise<PublicRecentSigner[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.rpc('get_recent_signers', {
      p_limit: 10,
    });
    return (data as PublicRecentSigner[]) ?? [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SignPage() {
  const [signatureCount, recentSigners] = await Promise.all([
    getSignatureCount(),
    getRecentSigners(),
  ]);

  return (
    <main className="pb-20 md:pb-0">
      <JsonLd data={breadcrumbSchema('/sign')!} />
      {/* Skip to form link for keyboard users */}
      <a
        href="#petition-form"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50
          focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to petition form
      </a>

      {/* ─── Above the fold ─── */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Heading — A/B tested (exp_petition_headline, Artifact 13 §5.4) */}
        <PetitionHeadline />

        {/* Two-column layout: form (left) + counter/signers (right) on desktop */}
        <div className="lg:grid lg:grid-cols-5 lg:gap-12">
          {/* Left column — form (60%) */}
          <div className="lg:col-span-3">
            {/* Mobile: compact counter above form */}
            <div className="mb-6 lg:hidden">
              <SignatureCounterCompactDynamic initialCount={signatureCount} compact />
            </div>

            <Suspense fallback={null}>
              <PetitionForm />
            </Suspense>
          </div>

          {/* Right column — counter + signers (40%) */}
          <div className="mt-10 space-y-6 lg:col-span-2 lg:mt-0">
            {/* Desktop: full counter */}
            <div className="hidden lg:block">
              <SignatureCounterDynamic initialCount={signatureCount} />
            </div>

            {/* Desktop: recent signers list */}
            <div className="hidden lg:block">
              <RecentSigners initialSigners={recentSigners} />
            </div>

            {/* Mobile: collapsible recent signers below form */}
            <div className="lg:hidden">
              <RecentSigners
                initialSigners={recentSigners}
                collapsible
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Below the fold: reinforcement content (§1.10) ─── */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
            Why this matters
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-base font-semibold text-gray-900">
                The name has no connection to this place.
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                Christopher Columbus never set foot on the North American
                continent. The name was chosen in 1812 as a borrowed tribute.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-base font-semibold text-gray-900">
                The city already knows.
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                Columbus removed the statue, replaced the holiday, and invested
                $3.5 million reimagining its relationship with the name. We are
                following that conversation to its conclusion.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-base font-semibold text-gray-900">
                Voters decide, not us.
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                22,000 signatures puts the question on the ballot. A simple
                majority decides. This is democracy — your signature just gets
                the question asked.
              </p>
            </div>
          </div>

          {/* Second CTA — scrolls to form */}
          <div className="mt-10 text-center">
            <a
              href="#petition-form"
              className="inline-block rounded-lg bg-[#1e40af] px-8 py-3.5 text-base
                font-semibold text-white shadow-sm transition-colors
                hover:bg-[#1e3a8a]
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
            >
              Add Your Name &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ─── FAQ excerpt (§1.11) ─── */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
            Common questions
          </h2>

          <dl className="space-y-6">
            <div>
              <dt className="text-base font-semibold text-gray-900">
                Who can sign?
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-gray-600">
                Any Ohio resident. We verify residency via address validation.
              </dd>
            </div>

            <div>
              <dt className="text-base font-semibold text-gray-900">
                Is this legally binding?
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-gray-600">
                The petition triggers a ballot measure. The ballot vote is
                binding — a charter amendment approved by voters has the force
                of law.
              </dd>
            </div>

            <div>
              <dt className="text-base font-semibold text-gray-900">
                What happens after I sign?
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-gray-600">
                You will receive a confirmation email with your signer number
                and options to share, volunteer, or donate.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
