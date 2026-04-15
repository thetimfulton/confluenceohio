import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/service';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { breadcrumbSchema } from '@/lib/schema';
import { POSITION_CONFIG } from '@confluenceohio/core/voices/types';
import type { VoicePosition, PublicVoice } from '@confluenceohio/core/voices/types';

export const metadata = buildPageMetadata({
  title: 'Community Voices',
  description:
    'Supporters, opponents, and undecided residents share their perspectives on renaming Columbus to Confluence.',
  path: '/voices',
  ogImage: '/images/og/voices.png',
});

export const revalidate = 60; // ISR: revalidate every 60 seconds

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getFeaturedVoices(): Promise<PublicVoice[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('voice_submissions')
    .select(
      'id, author_name, author_neighborhood, position, title, body, slug, featured, approved_at',
    )
    .eq('featured', true)
    .in('moderation_status', ['approved', 'auto_approved'])
    .order('approved_at', { ascending: false, nullsFirst: false })
    .limit(3);
  return (data as PublicVoice[]) ?? [];
}

async function getVoices(
  position?: VoicePosition,
  page = 1,
  limit = 20,
): Promise<{ voices: PublicVoice[]; total: number }> {
  const supabase = createServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('voice_submissions')
    .select(
      'id, author_name, author_neighborhood, position, title, body, slug, featured, approved_at',
      { count: 'exact' },
    )
    .in('moderation_status', ['approved', 'auto_approved']);

  if (position) {
    query = query.eq('position', position);
  }

  query = query
    .order('approved_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, count } = await query;
  return { voices: (data as PublicVoice[]) ?? [], total: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Position Badge component
// ---------------------------------------------------------------------------

function PositionBadge({ position }: { position: VoicePosition }) {
  const config = POSITION_CONFIG[position];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${config.color}15`, color: config.color }}
      aria-label={config.label}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Voice Card component
// ---------------------------------------------------------------------------

function VoiceCard({ voice }: { voice: PublicVoice }) {
  const excerpt =
    voice.body.length > 150
      ? voice.body.slice(0, 150) + '\u2026'
      : voice.body;

  return (
    <Link
      href={`/voices/${voice.slug}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <PositionBadge position={voice.position} />
      <h3 className="mt-2 text-base font-semibold text-gray-900 group-hover:text-blue-700">
        {voice.title || voice.body.split(/\s+/).slice(0, 8).join(' ') + '\u2026'}
      </h3>
      <p className="mt-1 text-sm text-gray-600">{excerpt}</p>
      <p className="mt-3 text-xs text-gray-400">
        {voice.author_name}
        {voice.author_neighborhood && ` \u00B7 ${voice.author_neighborhood}`}
      </p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Featured Voice Card
// ---------------------------------------------------------------------------

function FeaturedVoiceCard({
  voice,
  isExample,
}: {
  voice: PublicVoice;
  isExample?: boolean;
}) {
  const Wrapper = isExample ? 'div' : Link;
  const wrapperProps = isExample
    ? {}
    : { href: `/voices/${voice.slug}` as const };

  return (
    <Wrapper
      {...(wrapperProps as Record<string, string>)}
      className="relative block rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      {isExample && (
        <span className="absolute right-3 top-3 rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
          Example
        </span>
      )}
      <PositionBadge position={voice.position} />
      <h3 className="mt-3 text-lg font-semibold text-gray-900">
        {voice.title || 'A Perspective'}
      </h3>
      <p className="mt-2 text-sm text-gray-600">{voice.body}</p>
      <p className="mt-4 text-xs text-gray-400">
        {voice.author_name}
        {voice.author_neighborhood && ` \u00B7 ${voice.author_neighborhood}`}
      </p>
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// Example voices (Artifact 04 §8 — shown before real voices exist)
// ---------------------------------------------------------------------------

const EXAMPLE_VOICES: PublicVoice[] = [
  {
    id: 'example-1',
    author_name: 'Maria S.',
    author_neighborhood: 'German Village',
    position: 'support',
    title: 'The Rivers Were Here First',
    body: "I've lived in German Village for 22 years. The name 'Confluence' honors what actually makes this place special — the meeting of the Scioto and Olentangy rivers, and the meeting of cultures that's always defined this city. It's not about erasing history. It's about choosing which history we lead with.",
    slug: 'example-support',
    featured: true,
    approved_at: null,
  },
  {
    id: 'example-2',
    author_name: 'Tom K.',
    author_neighborhood: 'Westerville',
    position: 'oppose',
    title: "Columbus Is Who We Are",
    body: "I understand the arguments, but Columbus isn't just a name — it's an identity. My grandparents came here from Italy. The name means something to a lot of families. Changing it feels like you're telling us our history doesn't matter. I'd rather we focus on making the city better for everyone than spend years arguing about a name.",
    slug: 'example-oppose',
    featured: true,
    approved_at: null,
  },
  {
    id: 'example-3',
    author_name: 'Jasmine W.',
    author_neighborhood: 'OSU campus',
    position: 'undecided',
    title: "I See Both Sides",
    body: "Honestly, I go back and forth. I get why the name bothers people, and 'Confluence' is actually beautiful. But I also worry about the cost and disruption. I signed up here because I want to hear from more people before I make up my mind. That's what this page should be for.",
    slug: 'example-undecided',
    featured: true,
    approved_at: null,
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function VoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ position?: string; page?: string }>;
}) {
  const params = await searchParams;
  const position = ['support', 'oppose', 'undecided'].includes(
    params.position || '',
  )
    ? (params.position as VoicePosition)
    : undefined;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const [featuredVoices, { voices, total }] = await Promise.all([
    getFeaturedVoices(),
    getVoices(position, page),
  ]);

  const hasRealVoices = voices.length > 0 || featuredVoices.length > 0;
  const displayFeatured =
    featuredVoices.length > 0 ? featuredVoices : EXAMPLE_VOICES;
  const totalPages = Math.ceil(total / 20);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8" role="main">
      <JsonLd data={breadcrumbSchema('/voices')!} />
      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Every Perspective Matters
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          This isn&apos;t a one-sided campaign. Whether you support renaming
          Columbus, have concerns, or are still deciding — this section is that
          conversation. Real people, real perspectives, no filter.
        </p>
      </section>

      {/* Featured Voices */}
      <section className="mb-12" aria-label="Featured perspectives">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          Featured Perspectives
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {displayFeatured.map((voice) => (
            <FeaturedVoiceCard
              key={voice.id}
              voice={voice}
              isExample={!hasRealVoices}
            />
          ))}
        </div>
        {!hasRealVoices && (
          <p className="mt-4 text-center text-sm text-gray-500">
            These are example perspectives.{' '}
            <Link
              href="/voices/share"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Be the first to share your real perspective.
            </Link>
          </p>
        )}
      </section>

      {/* Filter Tabs */}
      <section aria-label="All perspectives">
        <div className="mb-6 flex gap-2 overflow-x-auto" role="tablist">
          {[
            { value: undefined, label: 'All' },
            { value: 'support' as const, label: 'Support' },
            { value: 'oppose' as const, label: 'Have Concerns' },
            { value: 'undecided' as const, label: 'Undecided' },
          ].map((tab) => {
            const isActive = position === tab.value;
            const href = tab.value
              ? `/voices?position=${tab.value}`
              : '/voices';
            return (
              <Link
                key={tab.label}
                href={href}
                role="tab"
                aria-selected={isActive}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Voice Grid */}
        {voices.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {voices.map((voice) => (
                <VoiceCard key={voice.id} voice={voice} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="mt-8 flex justify-center gap-2" aria-label="Pagination">
                {page > 1 && (
                  <Link
                    href={`/voices?${position ? `position=${position}&` : ''}page=${page - 1}`}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                <span className="flex items-center px-3 text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/voices?${position ? `position=${position}&` : ''}page=${page + 1}`}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Load More
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
            <p className="text-gray-500">
              {position
                ? `No perspectives yet in the "${POSITION_CONFIG[position].label}" category.`
                : 'No perspectives have been shared yet.'}
            </p>
            <Link
              href="/voices/share"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Be the First to Share
            </Link>
          </div>
        )}
      </section>

      {/* Share CTA */}
      <section className="mt-16 rounded-xl bg-blue-50 px-6 py-10 text-center">
        <h2 className="mb-3 text-2xl font-bold text-gray-900">
          Add Your Voice
        </h2>
        <p className="mx-auto mb-6 max-w-lg text-gray-600">
          Whether you support renaming Columbus, have concerns, or are still
          deciding — your perspective belongs here.
        </p>
        <Link
          href="/voices/share"
          className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Share Your Perspective
        </Link>
      </section>
    </main>
  );
}
