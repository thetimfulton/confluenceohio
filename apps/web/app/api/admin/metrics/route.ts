import { NextRequest, NextResponse } from 'next/server';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  const admin = await requireAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const [
    metricsResult,
    todaySignaturesResult,
    weekSignaturesResult,
    yesterdaySignaturesResult,
    avgDonationResult,
    recurringDonationResult,
    activeVolunteersResult,
    newVolunteersWeekResult,
    pendingVoicesResult,
    approvedVoicesResult,
    topReferrerResult,
    topReferralPlatformResult,
    kFactorResult,
    recentActivityResult,
  ] = await Promise.all([
    // Campaign metrics (real-time counters)
    supabase.from('campaign_metrics').select('metric, value'),

    // Signatures today
    supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .gte('signed_at', todayStart())
      .is('deleted_at', null),

    // Signatures this week (Monday start)
    supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .gte('signed_at', weekStart())
      .is('deleted_at', null),

    // Yesterday's signatures (for trend comparison)
    supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .gte('signed_at', yesterdayStart())
      .lt('signed_at', todayStart())
      .is('deleted_at', null),

    // Average donation (RPC)
    supabase.rpc('avg_donation_cents'),

    // Recurring donation percentage (RPC)
    supabase.rpc('recurring_donation_pct'),

    // Active volunteers
    supabase
      .from('volunteers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // New volunteers this week
    supabase
      .from('volunteers')
      .select('id', { count: 'exact', head: true })
      .gte('signed_up_at', weekStart()),

    // Pending voice reviews
    supabase
      .from('voice_submissions')
      .select('id', { count: 'exact', head: true })
      .in('moderation_status', ['pending', 'needs_review']),

    // Approved voices total
    supabase
      .from('voice_submissions')
      .select('id', { count: 'exact', head: true })
      .in('moderation_status', ['auto_approved', 'approved']),

    // Top 10 referrers (RPC)
    supabase.rpc('get_top_referrers', { p_limit: 10 }),

    // Top referral platform (RPC)
    supabase.rpc('top_referral_platform'),

    // Referral k-factor (RPC)
    supabase.rpc('referral_k_factor'),

    // Recent activity feed (RPC)
    supabase.rpc('recent_admin_activity', { limit_count: 20 }),
  ]);

  // Build a lookup from the campaign_metrics rows
  const metrics: Record<string, number> = {};
  metricsResult.data?.forEach((row: { metric: string; value: number }) => {
    metrics[row.metric] = row.value;
  });

  return NextResponse.json({
    signatures: {
      total: metrics.signature_count ?? 0,
      verified: metrics.verified_signature_count ?? 0,
      today: todaySignaturesResult.count ?? 0,
      yesterday: yesterdaySignaturesResult.count ?? 0,
      thisWeek: weekSignaturesResult.count ?? 0,
      goal: 22_000,
    },
    donations: {
      totalCents: metrics.donation_total_cents ?? 0,
      averageCents: avgDonationResult.data ?? 0,
      recurringPct: recurringDonationResult.data ?? 0,
    },
    volunteers: {
      active: activeVolunteersResult.count ?? 0,
      newThisWeek: newVolunteersWeekResult.count ?? 0,
    },
    email: {
      subscribers: metrics.email_subscriber_count ?? 0,
    },
    voices: {
      pendingReview: pendingVoicesResult.count ?? 0,
      approved: approvedVoicesResult.count ?? 0,
    },
    referrals: {
      totalClicks: metrics.referral_click_count ?? 0,
      totalConversions: metrics.referral_conversion_count ?? 0,
      kFactor: kFactorResult.data ?? 0,
      topReferrers: topReferrerResult.data ?? [],
      topPlatform: topReferralPlatformResult.data?.[0] ?? null,
    },
    recentActivity: recentActivityResult.data ?? [],
  });
}

/** ISO string for midnight today (UTC). */
function todayStart(): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

/** ISO string for midnight yesterday (UTC). */
function yesterdayStart(): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - 1);
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

/** ISO string for the most recent Monday at midnight (UTC). */
function weekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setUTCDate(now.getUTCDate() + diff);
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}
