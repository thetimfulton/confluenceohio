// ---------------------------------------------------------------------------
// Admin Referrals API — apps/web/app/api/admin/referrals/route.ts
// ---------------------------------------------------------------------------
// GET: Return referral analytics data (K-factor, top referrers, platform
//      breakdown).
//
// Admin only. See Artifact 15 §9.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  const admin = await requireAdminFromRequest(request, ['admin']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const [
    { data: kFactorResult, error: kErr },
    { data: metrics, error: mErr },
    { data: topReferrers, error: tErr },
    { data: referrals, error: rErr },
  ] = await Promise.all([
    supabase.rpc('referral_k_factor'),
    supabase
      .from('campaign_metrics')
      .select('metric, value')
      .in('metric', ['referral_click_count', 'referral_conversion_count']),
    supabase.rpc('top_referrers', { limit_count: 20 }),
    supabase.from('referrals').select('platform, clicks, conversions'),
  ]);

  if (kErr || mErr || tErr || rErr) {
    console.error('[Admin/Referrals] Query errors:', { kErr, mErr, tErr, rErr });
    return NextResponse.json(
      { error: 'Failed to fetch referral data' },
      { status: 500 },
    );
  }

  const clickCount =
    (metrics ?? []).find((m) => m.metric === 'referral_click_count')?.value ?? 0;
  const conversionCount =
    (metrics ?? []).find((m) => m.metric === 'referral_conversion_count')?.value ?? 0;

  // Platform breakdown
  const platformBreakdown: Record<string, { clicks: number; conversions: number }> = {};
  for (const r of referrals ?? []) {
    const key = r.platform;
    const existing = platformBreakdown[key] ?? { clicks: 0, conversions: 0 };
    platformBreakdown[key] = {
      clicks: existing.clicks + r.clicks,
      conversions: existing.conversions + r.conversions,
    };
  }

  return NextResponse.json({
    k_factor: Number(kFactorResult ?? 0),
    total_clicks: Number(clickCount),
    total_conversions: Number(conversionCount),
    conversion_rate:
      Number(clickCount) > 0
        ? Math.round((Number(conversionCount) / Number(clickCount)) * 100 * 10) / 10
        : 0,
    top_referrers: topReferrers ?? [],
    platform_breakdown: platformBreakdown,
  });
}
