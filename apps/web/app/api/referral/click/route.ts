import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { inngest } from '@/inngest/client';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// POST /api/referral/click — Referral click tracking (Artifact 11 §1.4)
//
// Records a referral link click with: referral_code, platform (from
// utm_source), landing_page, user_agent, ip_hash.
//
// Rate limited to 10 requests per IP per minute to prevent inflation.
// ---------------------------------------------------------------------------

const REF_CODE_REGEX = /^CONF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

const VALID_PLATFORMS = [
  'facebook',
  'twitter',
  'whatsapp',
  'email',
  'copy',
  'linkedin',
  'other',
] as const;

type Platform = (typeof VALID_PLATFORMS)[number];

// In-memory rate limiter (per-instance; sufficient for edge/serverless)
const clickRateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ipHash: string): boolean {
  const now = Date.now();
  const entry = clickRateLimit.get(ipHash);

  if (!entry || now > entry.resetAt) {
    clickRateLimit.set(ipHash, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count++;
  return entry.count > 10;
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export async function POST(request: NextRequest) {
  // ── Validate referral code ──
  const ref = request.nextUrl.searchParams.get('ref');

  if (!ref || !REF_CODE_REGEX.test(ref)) {
    return NextResponse.json({ error: 'Invalid ref code' }, { status: 400 });
  }

  // ── Rate limit by IP hash ──
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const ipHash = hashIp(clientIp);

  if (isRateLimited(ipHash)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
  }

  // ── Normalize platform ──
  const rawPlatform = request.nextUrl.searchParams.get('platform') || 'other';
  const platform: Platform = (VALID_PLATFORMS as readonly string[]).includes(rawPlatform)
    ? (rawPlatform as Platform)
    : 'other';

  // ── Collect metadata ──
  const userAgent = request.headers.get('user-agent') || '';
  const landingPage = request.headers.get('referer') || '';
  const utmSource = request.nextUrl.searchParams.get('utm_source') || platform;
  const utmMedium = request.nextUrl.searchParams.get('utm_medium') || '';

  const supabase = createServiceClient();

  // ── Track the click via RPC (upsert referrals row, increment clicks) ──
  const { error: rpcError } = await supabase.rpc('track_referral_click', {
    p_referral_code: ref,
    p_platform: platform,
  });

  if (rpcError) {
    // If the RPC doesn't exist yet, fall back to direct insert/update
    if (rpcError.code === '42883') {
      // Function does not exist — insert directly
      const { error: directError } = await supabase
        .from('referral_clicks')
        .insert({
          referral_code: ref,
          platform,
          landing_page: landingPage.slice(0, 2048),
          utm_source: utmSource.slice(0, 100),
          utm_medium: utmMedium.slice(0, 100),
          user_agent: userAgent.slice(0, 500),
          ip_hash: ipHash,
        });

      if (directError) {
        console.error('[Referral] Click tracking insert failed:', directError);
        return NextResponse.json(
          { error: 'Tracking failed' },
          { status: 500 },
        );
      }
    } else {
      console.error('[Referral] Click tracking RPC failed:', rpcError);
      return NextResponse.json(
        { error: 'Tracking failed' },
        { status: 500 },
      );
    }
  }

  // ── Increment global click metric (best-effort) ──
  await supabase
    .rpc('increment_metric', { metric_name: 'referral_click_count', increment_by: 1 })
    .then(({ error }) => {
      if (error) {
        console.error('[Referral] Failed to increment click metric:', error);
      }
    });

  // ── Fire Inngest event for async processing (best-effort) ──
  try {
    await inngest.send({
      name: 'referral/click',
      data: {
        referralCode: ref,
        platform,
        landingPage: landingPage.slice(0, 2048),
        utmSource: utmSource.slice(0, 100),
        utmMedium: utmMedium.slice(0, 100),
        ipHash,
      },
    });
  } catch {
    // Non-fatal — the click is already recorded in the DB
  }

  return NextResponse.json({ ok: true });
}
