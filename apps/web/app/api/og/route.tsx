import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

// ---------------------------------------------------------------------------
// Font loading — bundled at build time via import.meta.url
// ---------------------------------------------------------------------------

const interBold = fetch(
  new URL('./fonts/Inter-Bold.ttf', import.meta.url),
).then((res) => res.arrayBuffer());

const interRegular = fetch(
  new URL('./fonts/Inter-Regular.ttf', import.meta.url),
).then((res) => res.arrayBuffer());

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------

const BRAND = {
  gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 100%)',
  progressGradient: 'linear-gradient(90deg, #60a5fa, #34d399)',
  cta: '#2563eb',
  positionColors: {
    support: '#34d399',
    oppose: '#f87171',
    undecided: '#fbbf24',
  } as Record<string, string>,
  positionLabels: {
    support: 'Supports renaming',
    oppose: 'Opposes renaming',
    undecided: 'Undecided',
  } as Record<string, string>,
};

// ---------------------------------------------------------------------------
// GET /api/og — Dynamic OG image generation
//
// Query params:
//   type      — petition | voice | blog | milestone (default: petition)
//   title     — headline text
//   subtitle  — secondary text
//   count     — numeric count (for petition/milestone)
//   name      — author name (for voice)
//   position  — support | oppose | undecided (for voice)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const [boldFont, regularFont] = await Promise.all([interBold, interRegular]);

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? 'petition';
  const title = searchParams.get('title') ?? '';
  const subtitle = searchParams.get('subtitle') ?? '';
  const count = searchParams.get('count') ?? '0';
  const name = searchParams.get('name') ?? '';
  const position = searchParams.get('position') ?? 'support';

  const fonts = [
    { name: 'Inter', data: boldFont, weight: 700 as const, style: 'normal' as const },
    { name: 'Inter', data: regularFont, weight: 400 as const, style: 'normal' as const },
  ];

  let element: React.ReactElement;

  switch (type) {
    case 'voice':
      element = renderVoice({ title, name, position });
      break;
    case 'blog':
      element = renderBlog({ title, subtitle });
      break;
    case 'milestone':
      element = renderMilestone({ count });
      break;
    case 'petition':
    default:
      element = renderPetition({ count });
      break;
  }

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    fonts,
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

// ---------------------------------------------------------------------------
// Type-specific renderers
// ---------------------------------------------------------------------------

function renderPetition({ count }: { count: string }) {
  const num = parseInt(count, 10) || 0;
  const formatted = num.toLocaleString('en-US');
  const milestones = [1000, 2500, 5000, 10000, 15000, 22000];
  const nextMilestone = milestones.find((m) => m > num) ?? 22000;
  const progress = Math.min((num / nextMilestone) * 100, 100);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND.gradient,
        color: 'white',
        fontFamily: 'Inter',
        padding: '60px',
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 400,
          opacity: 0.8,
          marginBottom: 20,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Confluence Ohio
      </div>

      <div
        style={{
          fontSize: 96,
          fontWeight: 700,
          lineHeight: 1,
          marginBottom: 16,
        }}
      >
        {formatted}
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 400,
          opacity: 0.9,
          marginBottom: 40,
        }}
      >
        Ohioans have signed the petition
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '80%',
          height: 16,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: BRAND.progressGradient,
            borderRadius: 8,
          }}
        />
      </div>

      <div style={{ fontSize: 24, marginTop: 16, opacity: 0.7 }}>
        Help us reach {nextMilestone.toLocaleString('en-US')}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginTop: 40,
          padding: '16px 48px',
          background: BRAND.cta,
          borderRadius: 12,
        }}
      >
        Add Your Name
      </div>
    </div>
  );
}

function renderVoice({
  title,
  name,
  position,
}: {
  title: string;
  name: string;
  position: string;
}) {
  const positionColor = BRAND.positionColors[position] ?? BRAND.positionColors.undecided;
  const positionLabel = BRAND.positionLabels[position] ?? BRAND.positionLabels.undecided;

  // Truncate title for display
  const displayTitle =
    title.length > 120 ? title.slice(0, 117).replace(/\s+\S*$/, '') + '...' : title;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BRAND.gradient,
        color: 'white',
        fontFamily: 'Inter',
        padding: '60px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: 24,
            opacity: 0.7,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Community Voices
        </div>
        <div
          style={{
            fontSize: 20,
            padding: '8px 20px',
            borderRadius: 20,
            background: positionColor,
            color: '#1e293b',
            fontWeight: 600,
          }}
        >
          {positionLabel}
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          lineHeight: 1.2,
          maxWidth: '90%',
        }}
      >
        &ldquo;{displayTitle}&rdquo;
      </div>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 28, fontWeight: 400 }}>{name}</div>
      </div>

      {/* Brand footer */}
      <div style={{ fontSize: 22, opacity: 0.6 }}>confluenceohio.org/voices</div>
    </div>
  );
}

function renderBlog({ title, subtitle }: { title: string; subtitle: string }) {
  const displayTitle =
    title.length > 100 ? title.slice(0, 97).replace(/\s+\S*$/, '') + '...' : title;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BRAND.gradient,
        color: 'white',
        fontFamily: 'Inter',
        padding: '60px',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 24,
          opacity: 0.7,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Confluence Ohio
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          lineHeight: 1.2,
          maxWidth: '90%',
        }}
      >
        {displayTitle}
      </div>

      {/* Bottom */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ fontSize: 24, opacity: 0.7 }}>{subtitle}</div>
        <div style={{ fontSize: 20, opacity: 0.6 }}>confluenceohio.org</div>
      </div>
    </div>
  );
}

function renderMilestone({ count }: { count: string }) {
  const num = parseInt(count, 10) || 0;
  const formatted = num.toLocaleString('en-US');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND.gradient,
        color: 'white',
        fontFamily: 'Inter',
        padding: '60px',
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 400,
          opacity: 0.8,
          marginBottom: 20,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Confluence Ohio
      </div>

      {/* Celebration emoji */}
      <div style={{ fontSize: 64, marginBottom: 16 }}>&#127881;</div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 400,
          opacity: 0.9,
          marginBottom: 8,
        }}
      >
        We just reached
      </div>

      <div
        style={{
          fontSize: 96,
          fontWeight: 700,
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {formatted}
      </div>

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          marginBottom: 40,
        }}
      >
        signatures!
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          padding: '16px 48px',
          background: BRAND.cta,
          borderRadius: 12,
        }}
      >
        Add Your Name
      </div>
    </div>
  );
}
