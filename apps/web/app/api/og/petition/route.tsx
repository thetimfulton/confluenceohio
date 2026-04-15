import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Revalidate every 5 minutes — balance freshness vs. compute cost.
// Social platforms cache aggressively anyway, so real-time isn't needed.
export const revalidate = 300;

// ---------------------------------------------------------------------------
// Font loading
// ---------------------------------------------------------------------------

const interBold = fetch(
  new URL('../fonts/Inter-Bold.ttf', import.meta.url),
).then((res) => res.arrayBuffer());

const interRegular = fetch(
  new URL('../fonts/Inter-Regular.ttf', import.meta.url),
).then((res) => res.arrayBuffer());

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------

const GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 100%)';
const PROGRESS_GRADIENT = 'linear-gradient(90deg, #60a5fa, #34d399)';
const CTA_BG = '#2563eb';

// ---------------------------------------------------------------------------
// Signature milestones
// ---------------------------------------------------------------------------

const MILESTONES = [1000, 2500, 5000, 10000, 15000, 22000];

// ---------------------------------------------------------------------------
// GET /api/og/petition — Petition OG image with live signature count
//
// Queries campaign_metrics for the current signature count and renders
// a 1200x630 image with progress bar toward the next milestone.
// ---------------------------------------------------------------------------

export async function GET() {
  const [boldFont, regularFont] = await Promise.all([interBold, interRegular]);

  // Fetch current signature count
  let signatureCount = 0;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      const supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await supabase
        .from('campaign_metrics')
        .select('value')
        .eq('metric', 'signature_count')
        .maybeSingle();
      signatureCount = data?.value ?? 0;
    }
  } catch {
    // Fall back to 0 on any DB error — still render the image
  }

  const formatted = signatureCount.toLocaleString('en-US');
  const nextMilestone =
    MILESTONES.find((m) => m > signatureCount) ?? 22000;
  const progress = Math.min((signatureCount / nextMilestone) * 100, 100);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: GRADIENT,
          color: 'white',
          fontFamily: 'Inter',
          padding: '60px',
        }}
      >
        {/* Brand */}
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

        {/* Signature count */}
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
              background: PROGRESS_GRADIENT,
              borderRadius: 8,
            }}
          />
        </div>

        <div style={{ fontSize: 24, marginTop: 16, opacity: 0.7 }}>
          Help us reach {nextMilestone.toLocaleString('en-US')}
        </div>

        {/* CTA */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginTop: 40,
            padding: '16px 48px',
            background: CTA_BG,
            borderRadius: 12,
          }}
        >
          Sign the Petition
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: boldFont, weight: 700, style: 'normal' },
        { name: 'Inter', data: regularFont, weight: 400, style: 'normal' },
      ],
      headers: {
        'Cache-Control':
          'public, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  );
}
