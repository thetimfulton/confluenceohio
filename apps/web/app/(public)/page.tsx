import Link from 'next/link';
import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  SignatureCounterDynamic,
  SignatureCounterCompactDynamic,
} from '@/components/petition/SignatureCounterDynamic';
import { RecentSigners } from '@/components/petition/RecentSigners';
import { EmailSignupForm } from '@/components/email/EmailSignupForm';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { buildPageMetadata } from '@/lib/seo';
import { webPageSchema } from '@/lib/schema';
import type { PublicRecentSigner } from '@confluenceohio/db/types';
import type { PublicVoice } from '@confluenceohio/core/voices/types';

// ---------------------------------------------------------------------------
// ISR — revalidate every 60s for live signature count (Artifact 14 §2.4)
// ---------------------------------------------------------------------------

export const revalidate = 60;

// ---------------------------------------------------------------------------
// Metadata (Artifact 12 §1.2 — homepage uses default title, no template)
// ---------------------------------------------------------------------------

export const metadata = buildPageMetadata({
  title: 'Confluence Ohio — Where the Rivers Meet',
  description:
    'Join the movement to rename Columbus, Ohio to Confluence — a name rooted in geography, not borrowed mythology. Sign the petition.',
  path: '/',
  ogImage: '/images/og/default.png',
});

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
      p_limit: 5,
    });
    return (data as PublicRecentSigner[]) ?? [];
  } catch {
    return [];
  }
}

async function getFeaturedVoice(): Promise<PublicVoice | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('voice_submissions')
      .select(
        'id, author_name, author_neighborhood, position, title, body, slug, featured, approved_at',
      )
      .eq('featured', true)
      .in('moderation_status', ['approved', 'auto_approved'])
      .order('approved_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    return (data as PublicVoice) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HomePage() {
  const [signatureCount, recentSigners, featuredVoice] = await Promise.all([
    getSignatureCount(),
    getRecentSigners(),
    getFeaturedVoice(),
  ]);

  return (
    <main>
      <JsonLd
        data={webPageSchema({
          name: 'Confluence Ohio — Where the Rivers Meet',
          description:
            'Join the movement to rename Columbus, Ohio to Confluence — a name rooted in geography, not borrowed mythology. Sign the petition.',
          url: '/',
        })}
      />

      {/* ─── Hero ─── */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Where the Rivers Meet
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Two rivers made this city. We think the name should say so.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/sign"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-4
                text-lg font-semibold text-white shadow-sm transition-colors
                hover:bg-blue-700
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Sign the Petition &rarr;
            </Link>
            <Link
              href="/the-case"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300
                bg-white px-8 py-4 text-lg font-semibold text-gray-700 shadow-sm transition-colors
                hover:bg-gray-50
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
            >
              Read the Case
            </Link>
          </div>
          <div className="mt-8">
            <SignatureCounterCompactDynamic initialCount={signatureCount} compact />
          </div>
        </div>
      </section>

      {/* ─── The 30-Second Case ─── */}
      <section className="border-t border-gray-100 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            The 30-Second Case
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-gray-600 sm:text-lg">
            <p>
              Columbus, Ohio sits at the confluence of the Scioto and Olentangy
              rivers — the geographic fact that made this city possible. In 1812,
              a tavern-owning legislator named Joseph Foos convinced his
              colleagues to name the new capital after Christopher Columbus, an
              explorer who never set foot on the North American continent.
            </p>
            <p>
              We think &ldquo;Confluence&rdquo; tells a truer story. It is the
              word for the meeting of rivers. It is also a word for what this
              city does every day — bring different people, industries, and ideas
              into the same space. No other major American city carries the name.
            </p>
            <p>
              Ohio law allows citizens to put a charter amendment on the ballot.
              We need 22,000 signatures to give voters the choice.
            </p>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/the-case"
              className="text-base font-semibold text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-800"
            >
              Read the Full Case &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            How It Works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Sign',
                description:
                  'Add your name to the petition. We verify Ohio residency to ensure every signature counts.',
              },
              {
                step: '2',
                title: 'We Collect 22,000 Signatures',
                description:
                  'Once we reach the threshold, the Franklin County Board of Elections validates the petition.',
              },
              {
                step: '3',
                title: 'Voters Decide',
                description:
                  'The question goes on the ballot. A simple majority decides. Democracy in action.',
              },
            ].map(({ step, title, description }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/sign"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3.5
                text-base font-semibold text-white shadow-sm transition-colors
                hover:bg-blue-700
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Add Your Name &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── The Arguments (preview) ─── */}
      <section className="border-t border-gray-100 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            Why Confluence?
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <ArgumentCard
              title="The name has no connection to this place."
              description="Christopher Columbus never set foot on the North American continent. The name was chosen in 1812 as a borrowed tribute."
              href="/the-case/columbus-legacy"
              linkText="Read the history"
            />
            <ArgumentCard
              title="The city already knows."
              description="Columbus removed the statue, replaced the holiday, and invested $3.5 million reimagining its relationship with the name."
              href="/the-case/columbus-legacy"
              linkText="See what changed"
            />
            <ArgumentCard
              title="Cities have done this before."
              description="Cincinnati was once Losantiville. Atlanta was Terminus. Mumbai was Bombay. The sky did not fall."
              href="/the-case/precedents"
              linkText="See the precedents"
            />
          </div>
        </div>
      </section>

      {/* ─── Signature Counter + Recent Signers ─── */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">
            Join the Movement
          </h2>
          <SignatureCounterDynamic initialCount={signatureCount} />
          <p className="mt-4 text-sm text-gray-600">
            Every signature gets us closer to the ballot.
          </p>
          <div className="mt-8">
            <Suspense fallback={null}>
              <RecentSigners initialSigners={recentSigners} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ─── Featured Community Voice ─── */}
      <section className="border-t border-gray-100 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-8 text-2xl font-bold text-gray-900 sm:text-3xl">
            Community Voices
          </h2>
          <blockquote className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-base italic leading-relaxed text-gray-700 sm:text-lg">
              &ldquo;
              {featuredVoice
                ? featuredVoice.body.length > 300
                  ? featuredVoice.body.slice(0, 300).trim() + '...'
                  : featuredVoice.body
                : "I've lived in Columbus my whole life. The name never bothered me until I learned the history \u2014 that the guy it's named after never even came here. Confluence just makes more sense. It's what this city is."}
              &rdquo;
            </p>
            <footer className="mt-4 text-sm text-gray-500">
              &mdash;{' '}
              <span className="font-medium text-gray-700">
                {featuredVoice?.author_name ?? 'David R.'}
              </span>
              {(featuredVoice?.author_neighborhood || (!featuredVoice && 'Westerville')) && (
                <>, {featuredVoice?.author_neighborhood ?? 'Westerville'}</>
              )}
            </footer>
          </blockquote>
          <div className="mt-6">
            <Link
              href="/voices"
              className="text-base font-semibold text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-800"
            >
              Read More Perspectives &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Email Signup ─── */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Stay in the Loop
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            Campaign updates, historical deep dives, and community perspectives.
            No spam. Unsubscribe anytime.
          </p>
          <EmailSignupForm
            source="footer"
            showFirstName
            buttonText="Subscribe"
          />
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ArgumentCard({
  title,
  description,
  href,
  linkText,
}: {
  title: string;
  description: string;
  href: string;
  linkText: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-gray-600">
        {description}
      </p>
      <Link
        href={href}
        className="text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        {linkText} &rarr;
      </Link>
    </div>
  );
}
