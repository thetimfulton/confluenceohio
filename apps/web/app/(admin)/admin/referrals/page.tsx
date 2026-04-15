import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { ReferralPlatform } from '@confluenceohio/db/types';
import { ReferralDashboardClient } from './_components/referral-dashboard-client';

export const metadata: Metadata = { title: 'Referrals' };

export default async function ReferralsPage() {
  const admin = await requireAdmin(['admin']);
  if (!admin) redirect('/admin/login');

  const supabase = createServiceClient();

  // ── Fetch all referral data in parallel ──
  const [
    { data: kFactorResult },
    { data: metrics },
    { data: topReferrers },
    { data: referrals },
  ] = await Promise.all([
    supabase.rpc('referral_k_factor'),
    supabase
      .from('campaign_metrics')
      .select('metric, value')
      .in('metric', ['referral_click_count', 'referral_conversion_count']),
    supabase.rpc('top_referrers', { limit_count: 20 }),
    supabase.from('referrals').select('platform, clicks, conversions'),
  ]);

  // Parse metrics
  const clickCount =
    (metrics ?? []).find((m) => m.metric === 'referral_click_count')?.value ?? 0;
  const conversionCount =
    (metrics ?? []).find((m) => m.metric === 'referral_conversion_count')?.value ?? 0;
  const conversionRate =
    Number(clickCount) > 0
      ? Math.round((Number(conversionCount) / Number(clickCount)) * 100 * 10) / 10
      : 0;

  // Platform breakdown
  const platformBreakdown: Record<
    string,
    { clicks: number; conversions: number }
  > = {};
  for (const r of referrals ?? []) {
    const key = r.platform as ReferralPlatform;
    const existing = platformBreakdown[key] ?? { clicks: 0, conversions: 0 };
    platformBreakdown[key] = {
      clicks: existing.clicks + r.clicks,
      conversions: existing.conversions + r.conversions,
    };
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Referrals</h1>
        <p className="mt-1 text-sm text-gray-600">
          Referral performance and viral growth metrics
        </p>
      </div>

      <ReferralDashboardClient
        kFactor={Number(kFactorResult ?? 0)}
        totalClicks={Number(clickCount)}
        totalConversions={Number(conversionCount)}
        conversionRate={conversionRate}
        topReferrers={(topReferrers ?? []) as TopReferrer[]}
        platformBreakdown={platformBreakdown}
      />
    </div>
  );
}

export interface TopReferrer {
  signature_id: string;
  first_name: string;
  last_name_initial: string;
  city: string;
  referral_code: string;
  referral_count: number;
  total_clicks: number;
}
