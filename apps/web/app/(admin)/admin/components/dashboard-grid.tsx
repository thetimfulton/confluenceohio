import { MetricCard } from './metric-card';
import { LiveSignatureCounter } from './live-signature-counter';
import { computeTrend } from '@confluenceohio/core/analytics/compute-trend';

export interface DashboardGridProps {
  signatureCount: number;
  verifiedCount: number;
  signatureGoal: number;
  todayCount: number;
  yesterdayCount: number;
  weekCount: number;
  donationTotalCents: number;
  avgDonationCents: number;
  recurringPct: number;
  activeVolunteers: number;
  newVolunteersWeek: number;
  pendingVoices: number;
  approvedVoices: number;
  emailSubscribers: number;
  referralClicks: number;
  referralConversions: number;
  kFactor: number;
  topPlatform: { platform: string; total_conversions: number } | null;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function DashboardGrid({
  signatureCount,
  verifiedCount,
  signatureGoal,
  todayCount,
  yesterdayCount,
  weekCount,
  donationTotalCents,
  avgDonationCents,
  recurringPct,
  activeVolunteers,
  newVolunteersWeek,
  pendingVoices,
  approvedVoices,
  emailSubscribers,
  referralClicks,
  referralConversions,
  kFactor,
  topPlatform,
}: DashboardGridProps) {
  const todayTrend = computeTrend(todayCount, yesterdayCount);

  // Conversion rate: verified / total signatures
  const conversionRate =
    signatureCount > 0
      ? ((verifiedCount / signatureCount) * 100).toFixed(1)
      : '0.0';

  // Compute week-over-week conversion trend:
  // Compare this week's daily avg to the prior period daily avg
  const daysInWeek = new Date().getUTCDay() || 7;
  const weeklyAvgPerDay =
    daysInWeek > 0 ? Math.round(weekCount / daysInWeek) : 0;
  const conversionTrend = computeTrend(todayCount, weeklyAvgPerDay);

  return (
    <div className="space-y-4">
      {/* Row 1: Hero metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LiveSignatureCounter
          initialCount={signatureCount}
          goal={signatureGoal}
        />
        <MetricCard
          label="Signatures Today"
          value={`+${formatNumber(todayCount)}`}
          trend={todayTrend}
        />
        <MetricCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          detail="verified / total"
          trend={conversionTrend}
        />
      </div>

      {/* Row 2: Secondary metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Donations"
          value={formatCents(donationTotalCents)}
          detail={`avg ${formatCents(avgDonationCents)} \u00B7 ${Number(recurringPct).toFixed(0)}% recurring`}
        />
        <MetricCard
          label="Volunteers"
          value={`${formatNumber(activeVolunteers)} active`}
          detail={`+${formatNumber(newVolunteersWeek)} this week`}
        />
        <MetricCard
          label="Voices"
          value={`${formatNumber(pendingVoices)} pending`}
          detail={`${formatNumber(approvedVoices)} approved`}
          alert={pendingVoices > 0}
        />
        <MetricCard
          label="Email List"
          value={`${formatNumber(emailSubscribers)} subs`}
        />
      </div>

      {/* Row 3: Referral snapshot */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Referral K-Factor"
          value={`k = ${Number(kFactor).toFixed(3)}`}
          detail={`${formatNumber(referralConversions)} via referral \u00B7 ${formatNumber(referralClicks)} clicks`}
        />
        <MetricCard
          label="Top Referral Source"
          value={topPlatform?.platform ?? 'N/A'}
          detail={
            topPlatform
              ? `${formatNumber(topPlatform.total_conversions)} conversions`
              : 'No referral data yet'
          }
        />
      </div>
    </div>
  );
}
