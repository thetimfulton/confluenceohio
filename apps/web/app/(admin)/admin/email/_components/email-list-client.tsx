'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Download } from 'lucide-react';
import type { EmailSubscriber, SubscriberSource } from '@confluenceohio/db/types';
import { DataTable, Pagination, type Column } from '../../_components/data-table';
import { FilterBar } from '../../_components/filter-bar';
import { MetricCard } from '../../components/metric-card';

// ---------------------------------------------------------------------------
// Source labels
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<SubscriberSource, string> = {
  petition: 'Petition',
  standalone: 'Standalone',
  volunteer: 'Volunteer',
  blog: 'Blog',
  footer: 'Footer',
  event: 'Event',
};

const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'complained', label: 'Complained' },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  unsubscribed: 'bg-gray-100 text-gray-700',
  bounced: 'bg-red-100 text-red-800',
  complained: 'bg-amber-100 text-amber-800',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

interface EmailListClientProps {
  subscribers: EmailSubscriber[];
  total: number;
  page: number;
  perPage: number;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  sourceCounts: Record<string, number>;
  activeCount: number;
  totalCount: number;
}

export function EmailListClient({
  subscribers,
  total,
  page,
  perPage,
  sortKey,
  sortDir,
  sourceCounts,
  activeCount,
  totalCount,
}: EmailListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    window.open(`/api/admin/email?${params.toString()}`, '_blank');
  }, [searchParams]);

  // ── Table columns ──

  const columns: Column<EmailSubscriber>[] = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (s) => <span className="font-medium">{s.email}</span>,
    },
    {
      key: 'first_name',
      label: 'Name',
      render: (s) => s.first_name ?? '\u2014',
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      render: (s) => (
        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {SOURCE_LABELS[s.source] ?? s.source}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (s) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {s.status}
        </span>
      ),
    },
    {
      key: 'brevo_contact_id',
      label: 'Brevo ID',
      render: (s) => (
        <span className="text-xs text-gray-500">
          {s.brevo_contact_id ?? '\u2014'}
        </span>
      ),
    },
    {
      key: 'subscribed_at',
      label: 'Subscribed',
      sortable: true,
      render: (s) => (
        <span title={new Date(s.subscribed_at).toLocaleString()}>
          {relativeTime(s.subscribed_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Active Subscribers"
          value={activeCount.toLocaleString()}
        />
        <MetricCard
          label="Total Subscribers"
          value={totalCount.toLocaleString()}
        />
        <MetricCard
          label="Opt-in Rate"
          value={totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : '0%'}
        />
        <MetricCard
          label="Top Source"
          value={
            Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
              ? SOURCE_LABELS[Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0][0] as SubscriberSource] ?? 'N/A'
              : 'N/A'
          }
        />
      </div>

      {/* Source breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Source Breakdown</h3>
        <div className="flex flex-wrap gap-4">
          {SOURCE_OPTIONS.map(({ value, label }) => {
            const count = sourceCounts[value] ?? 0;
            const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            return (
              <div key={value} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-indigo-500" style={{ opacity: Math.max(0.2, pct / 100) }} />
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
                <span className="text-xs text-gray-400">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search by email or name\u2026"
        filters={[
          { key: 'source', label: 'All sources', options: SOURCE_OPTIONS },
          { key: 'status', label: 'All statuses', options: STATUS_OPTIONS },
        ]}
      />

      {/* Export */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Data table */}
      <DataTable
        columns={columns}
        data={subscribers}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        getRowId={(s) => s.id}
      />

      {/* Pagination */}
      <Pagination
        page={page}
        perPage={perPage}
        total={total}
        onChange={handlePageChange}
      />
    </div>
  );
}
