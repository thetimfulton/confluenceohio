import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/service';
import { POSITION_CONFIG } from '@confluenceohio/core/voices/types';
import type { VoicePosition, PublicVoice } from '@confluenceohio/core/voices/types';
import { JsonLd } from '@confluenceohio/ui/json-ld';
import { voiceArticleSchema, breadcrumbSchema } from '@/lib/schema';

export const revalidate = 60; // ISR: revalidate every 60 seconds

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getVoiceBySlug(slug: string): Promise<PublicVoice | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('voice_submissions')
    .select(
      'id, author_name, author_neighborhood, position, title, body, slug, featured, approved_at, submitted_at',
    )
    .eq('slug', slug)
    .in('moderation_status', ['approved', 'auto_approved'])
    .maybeSingle();
  return data as PublicVoice | null;
}

// ---------------------------------------------------------------------------
// Static params generation
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('voice_submissions')
    .select('slug')
    .in('moderation_status', ['approved', 'auto_approved'])
    .limit(100);

  return (data ?? []).map((voice) => ({ slug: voice.slug }));
}

// ---------------------------------------------------------------------------
// Metadata (Artifact 10 §3.3)
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const voice = await getVoiceBySlug(slug);

  if (!voice) {
    return { title: 'Voice Not Found | Confluence Ohio' };
  }

  const excerpt = voice.body.slice(0, 155).replace(/\s+\S*$/, '') + '...';
  const title = voice.title
    ? `"${voice.title}" \u2014 ${voice.author_name} on Renaming Columbus`
    : `${voice.author_name} on Renaming Columbus`;

  // Build dynamic OG image URL with voice details
  const ogParams = new URLSearchParams({
    type: 'voice',
    title: voice.title || 'A Perspective on Renaming Columbus',
    name: voice.author_name + (voice.author_neighborhood ? ` \u00B7 ${voice.author_neighborhood}` : ''),
    position: voice.position,
  });

  return {
    title: `${title} | Confluence Ohio`,
    description: excerpt,
    alternates: { canonical: `/voices/${slug}` },
    openGraph: {
      title: `"${voice.title}" \u2014 Confluence Ohio Voices`,
      description: excerpt,
      url: `https://confluenceohio.org/voices/${slug}`,
      type: 'article',
      images: [
        {
          url: `/api/og?${ogParams.toString()}`,
          width: 1200,
          height: 630,
          alt: `Community perspective: ${voice.title}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `"${voice.title}" \u2014 Confluence Ohio Voices`,
      description: excerpt,
      images: [`/api/og?${ogParams.toString()}`],
    },
  };
}

// ---------------------------------------------------------------------------
// Body renderer — plain text to paragraphs, XSS-safe (Artifact 10 §3.5)
// ---------------------------------------------------------------------------

function renderBody(body: string) {
  const paragraphs = body.split(/\n\n+/).filter(Boolean);
  return paragraphs.map((p, i) => (
    <p key={i} className="mb-4 last:mb-0">
      {p.split('\n').map((line, j) => (
        <span key={j}>
          {j > 0 && <br />}
          {line}
        </span>
      ))}
    </p>
  ));
}

// ---------------------------------------------------------------------------
// Position Badge
// ---------------------------------------------------------------------------

function PositionBadge({ position }: { position: VoicePosition }) {
  const config = POSITION_CONFIG[position];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
      style={{ backgroundColor: `${config.color}15`, color: config.color }}
      aria-label={config.label}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Share Buttons (Artifact 10 §3.3)
// ---------------------------------------------------------------------------

function ShareButtons({ voice, url }: { voice: PublicVoice; url: string }) {
  const text = `Read this perspective on renaming Columbus: ${url}`;
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Share on X
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Share on Facebook
      </a>
      <a
        href={`https://wa.me/?text=${encodedText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        WhatsApp
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function VoiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const voice = await getVoiceBySlug(slug);

  if (!voice) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';
  const voiceUrl = `${siteUrl}/voices/${voice.slug}`;
  const fallbackTitle = voice.author_neighborhood
    ? `A Perspective from ${voice.author_neighborhood}`
    : 'A Perspective';

  // Format submitted date
  const submittedDate = voice.approved_at
    ? new Date(voice.approved_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6" role="main">
      <JsonLd
        data={voiceArticleSchema({
          title: voice.title || fallbackTitle,
          description: voice.body.slice(0, 155),
          slug: voice.slug,
          authorName: voice.author_name,
          publishedAt: voice.approved_at || new Date().toISOString(),
          ogImageUrl: `${siteUrl}/api/og?${new URLSearchParams({
            type: 'voice',
            title: voice.title || 'A Perspective on Renaming Columbus',
            name: voice.author_name,
          }).toString()}`,
        })}
      />
      <JsonLd
        data={breadcrumbSchema(`/voices/${voice.slug}`, voice.title || fallbackTitle)!}
      />

      {/* Position Badge */}
      <PositionBadge position={voice.position} />

      {/* Title */}
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {voice.title || fallbackTitle}
      </h1>

      {/* Author line */}
      <p className="mt-3 text-sm text-gray-500">
        {voice.author_name}
        {voice.author_neighborhood && ` \u00B7 ${voice.author_neighborhood}`}
        {submittedDate && ` \u00B7 ${submittedDate}`}
      </p>

      {/* Body */}
      <article className="mt-8 text-base leading-7 text-gray-700">
        {renderBody(voice.body)}
      </article>

      <hr className="my-8 border-gray-200" />

      {/* Share buttons */}
      <ShareButtons voice={voice} url={voiceUrl} />

      <hr className="my-8 border-gray-200" />

      {/* Navigation */}
      <div className="space-y-4">
        <Link
          href="/voices"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          &larr; Back to All Voices
        </Link>

        <div className="rounded-xl bg-gray-50 p-6 text-center">
          <p className="mb-3 text-gray-600">Have your own perspective?</p>
          <Link
            href="/voices/share"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Share Your Perspective
          </Link>
        </div>
      </div>
    </main>
  );
}
