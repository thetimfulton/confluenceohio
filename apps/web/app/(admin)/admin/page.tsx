import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import { DashboardGrid } from './components/dashboard-grid';
import { RecentActivity } from './components/recent-activity';

export const revalidate = 60;

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/admin/login');

  const supabase = createServiceClient();

  const [
    metricsResult,
    todaySignaturesResult,
    weekSignaturesResult,
    yesterdaySignaturesResult,
    avgDonationResult,
    recurringPctResult,
    activeVolunteersResult,
    newVolunteersWeekResult,
    pendingVoicesResult,
    approvedVoicesResult,
    topReferralPlatformResult,
    kFactorResult,
    recentActivityResult,
  ] = await Promise.all([
    // Real-time counters from campaign_metrics
    supabase.from('campaign_metrics').select('metric, value'),

    // Today's signatures
    supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .gte('signed_at', todayStart())
      .is('deleted_at', null),

    // This week's signatures (Monday start)
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

    // Pending voice submissions
    supabase
      .from('voice_submissions')
      .select('id', { count: 'exact', head: true })
      .in('moderation_status', ['pending', 'needs_review']),

    // Approved voices total
    supabase
      .from('voice_submissions')
      .select('id', { count: 'exact', head: true })
      .in('moderation_status', ['auto_approved', 'approved']),

    // Top referral platform (RPC)
    supabase.rpc('top_referral_platform'),

    // Referral k-factor (RPC)
    supabase.rpc('referral_k_factor'),

    // Recent activity feed (RPC)
    supabase.rpc('recent_admin_activity', { limit_count: 20 }),
  ]);

  // Build a lookup from the campaign_metrics rows
  const counters: Record<string, number> = {};
  metricsResult.data?.forEach((row: { metric: string; value: number }) => {
    counters[row.metric] = row.value;
  });

  const signatureGoal = 22_000;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Campaign Dashboard
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Real-time campaign health at a glance. Metrics refresh every 60 seconds.
      </p>

      <div className="mt-6">
        <DashboardGrid
          signatureCount={counters.signature_count ?? 0}
          verifiedCount={counters.verified_signature_count ?? 0}
          signatureGoal={signatureGoal}
          todayCount={todaySignaturesResult.count ?? 0}
          yesterdayCount={yesterdaySignaturesResult.count ?? 0}
          weekCount={weekSignaturesResult.count ?? 0}
          donationTotalCents={counters.donation_total_cents ?? 0}
          avgDonationCents={avgDonationResult.data ?? 0}
          recurringPct={recurringPctResult.data ?? 0}
          activeVolunteers={activeVolunteersResult.count ?? 0}
          newVolunteersWeek={newVolunteersWeekResult.count ?? 0}
          pendingVoices={pendingVoicesResult.count ?? 0}
          approvedVoices={approvedVoicesResult.count ?? 0}
          emailSubscribers={counters.email_subscriber_count ?? 0}
          referralClicks={counters.referral_click_count ?? 0}
          referralConversions={counters.referral_conversion_count ?? 0}
          kFactor={kFactorResult.data ?? 0}
          topPlatform={topReferralPlatformResult.data?.[0] ?? null}
        />
      </div>

      <div className="mt-8">
        <RecentActivity items={recentActivityResult.data ?? []} />
      </div>
    </div>
  );
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
