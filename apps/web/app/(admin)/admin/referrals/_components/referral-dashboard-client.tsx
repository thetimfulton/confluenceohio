'use client';

import type { ReferralPlatform } from '@confluenceohio/db/types';
import { MetricCard } from '../../components/metric-card';
import type { TopReferrer } from '../page';

// ---------------------------------------------------------------------------
// Platform labels and colors
// ---------------------------------------------------------------------------

const PLATFORM_LABELS: Record<ReferralPlatform, string> = {
  facebook: 'Facebook',
  twitter: 'Twitter/X',
  whatsapp: 'WhatsApp',
  email: 'Email',
  copy: 'Copy Link',
  other: 'Other',
};

const PLATFORM_COLORS: Record<ReferralPlatform, string> = {
  facebook: 'bg-blue-500',
  twitter: 'bg-sky-400',
  whatsapp: 'bg-green-500',
  email: 'bg-amber-500',
  copy: 'bg-purple-500',
  other: 'bg-gray-400',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReferralDashboardClientProps {
  kFactor: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  topReferrers: TopReferrer[];
  platformBreakdown: Record<string, { clicks: number; conversions: number }>;
}

export function ReferralDashboardClient({
  kFactor,
  totalClicks,
  totalConversions,
  conversionRate,
  topReferrers,
  platformBreakdown,
}: ReferralDashboardClientProps) {
  // Find the max click count for bar chart scaling
  const maxClicks = Math.max(
    ...Object.values(platformBreakdown).map((p) => p.clicks),
    1,
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="K-Factor"
          value={kFactor.toFixed(3)}
          detail={kFactor >= 1 ? 'Viral growth!' : 'Sub-viral'}
        />
        <MetricCard
          label="Total Clicks"
          value={totalClicks.toLocaleString()}
        />
        <MetricCard
          label="Conversions"
          value={totalConversions.toLocaleString()}
        />
        <MetricCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform breakdown */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
            Platform Breakdown
          </h2>
          {Object.keys(platformBreakdown).length === 0 ? (
            <p className="text-sm text-gray-500">No referral data yet.</p>
          ) : (
            <div className="space-y-3">
              {(Object.entries(platformBreakdown) as [ReferralPlatform, { clicks: number; conversions: number }][])
                .sort((a, b) => b[1].clicks - a[1].clicks)
                .map(([platform, data]) => (
                  <div key={platform}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {PLATFORM_LABELS[platform] ?? platform}
                      </span>
                      <span className="text-gray-500">
                        {data.clicks} clicks / {data.conversions} conversions
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${PLATFORM_COLORS[platform] ?? 'bg-gray-400'} transition-[width] duration-500`}
                          style={{
                            width: `${(data.clicks / maxClicks) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Top referrers leaderboard */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
            Top Referrers
          </h2>
          {topReferrers.length === 0 ? (
            <p className="text-sm text-gray-500">No referrers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      #
                    </th>
                    <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Referrer
                    </th>
                    <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Code
                    </th>
                    <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Referrals
                    </th>
                    <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Clicks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topReferrers.map((r, i) => (
                    <tr key={r.signature_id}>
                      <td className="py-2 text-sm text-gray-500">{i + 1}</td>
                      <td className="py-2 text-sm font-medium text-gray-900">
                        {r.first_name} {r.last_name_initial}.
                        {r.city && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({r.city})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-sm text-gray-600">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                          {r.referral_code}
                        </code>
                      </td>
                      <td className="py-2 text-right text-sm font-medium text-gray-900">
                        {r.referral_count}
                      </td>
                      <td className="py-2 text-right text-sm text-gray-600">
                        {r.total_clicks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
