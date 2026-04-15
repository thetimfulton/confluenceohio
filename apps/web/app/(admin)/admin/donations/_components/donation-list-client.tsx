'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Download } from 'lucide-react';
import type { AdminRole, Donation } from '@confluenceohio/db/types';
import { DataTable, Pagination, type Column } from '../../_components/data-table';
import { FilterBar } from '../../_components/filter-bar';
import { MetricCard } from '../../components/metric-card';
import type { DonationStats, RefcodePerf } from '../page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DonationListClientProps {
  donations: Donation[];
  total: number;
  page: number;
  perPage: number;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  stats: DonationStats;
  refcodePerformance: RefcodePerf[];
  adminRole: AdminRole;
}

export function DonationListClient({
  donations,
  total,
  page,
  perPage,
  sortKey,
  sortDir,
  stats,
  refcodePerformance,
  adminRole,
}: DonationListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAdmin = adminRole === 'admin';

  // ── Navigation helpers ──

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleSort = useCallback(
    (key: string) => {
      const newDir = sortKey === key && sortDir === 'desc' ? 'asc' : 'desc';
      updateParams({ sort: key, order: newDir, page: undefined });
    },
    [sortKey, sortDir, updateParams],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: String(newPage) });
    },
    [updateParams],
  );

  const handleExport = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('format', 'csv');
    params.delete('page');
    params.delete('per_page');
    window.open(`/api/admin/donations?${params.toString()}`, '_blank');
  }, [searchParams]);

  // ── Table columns ──

  const columns: Column<Donation>[] = [
    {
      key: 'donated_at',
      label: 'Date',
      sortable: true,
      render: (d) => (
        <span title={new Date(d.donated_at).toLocaleString()}>
          {relativeTime(d.donated_at)}
        </span>
      ),
    },
    {
      key: 'amount_cents',
      label: 'Amount',
      sortable: true,
      render: (d) => (
        <span className="font-medium">{formatCents(d.amount_cents)}</span>
      ),
    },
    {
      key: 'donor_name',
      label: 'Donor',
      sortable: true,
      render: (d) => (
        <div>
          <span className="font-medium">{d.donor_name ?? '\u2014'}</span>
          {d.donor_email && (
            <span className="ml-2 text-xs text-gray-500">{d.donor_email}</span>
          )}
        </div>
      ),
    },
    {
      key: 'recurring',
      label: 'Recurring',
      render: (d) => (
        <span className={d.recurring ? 'text-green-700' : 'text-gray-400'}>
          {d.recurring ? 'Yes' : 'One-time'}
        </span>
      ),
    },
    {
      key: 'express_lane',
      label: 'Express',
      render: (d) => (
        <span className={d.express_lane ? 'text-blue-600' : 'text-gray-400'}>
          {d.express_lane ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'refcode',
      label: 'Refcode',
      render: (d) => (
        <span className="text-gray-600">{d.refcode ?? '\u2014'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard
          label="Total Raised"
          value={formatCents(stats.totalRaised)}
        />
        <MetricCard
          label="Unique Donors"
          value={stats.donorCount.toLocaleString()}
        />
        <MetricCard
          label="Avg Donation"
          value={formatCents(stats.avgDonation)}
        />
        <MetricCard
          label="Recurring"
          value={`${stats.recurringPct}%`}
        />
        <MetricCard
          label="Largest"
          value={formatCents(stats.largest)}
        />
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search by donor name or email\u2026"
        filters={[
          {
            key: 'recurring',
            label: 'All types',
            options: [
              { value: 'true', label: 'Recurring only' },
              { value: 'false', label: 'One-time only' },
            ],
          },
        ]}
        showDateRange
      />

      {/* Export */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      )}

      {/* Data table */}
      <DataTable
        columns={columns}
        data={donations}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        getRowId={(d) => d.id}
      />

      {/* Pagination */}
      <Pagination
        page={page}
        perPage={perPage}
        total={total}
        onChange={handlePageChange}
      />

      {/* Refcode performance table */}
      {refcodePerformance.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Refcode Performance
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Refcode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Average
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Recurring
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refcodePerformance.map((r) => (
                  <tr key={r.refcode}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {r.refcode}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {r.donation_count}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {formatCents(Number(r.total_cents))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {formatCents(Math.round(Number(r.avg_cents)))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {r.recurring_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
