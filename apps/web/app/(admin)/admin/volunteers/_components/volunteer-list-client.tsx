'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Download, Users } from 'lucide-react';
import type {
  AdminRole,
  Volunteer,
  VolunteerRole,
} from '@confluenceohio/db/types';
import { DataTable, Pagination, type Column } from '../../_components/data-table';
import { FilterBar } from '../../_components/filter-bar';
import { StatusBadge } from '../../_components/status-badge';
import { RoleBadges } from '../../_components/role-badge';

// ---------------------------------------------------------------------------
// Role display names and filter options
// ---------------------------------------------------------------------------

const ROLE_OPTIONS: { value: VolunteerRole; label: string }[] = [
  { value: 'signature_collector', label: 'Signature Collector' },
  { value: 'social_amplifier', label: 'Social Amplifier' },
  { value: 'neighborhood_captain', label: 'Neighborhood Captain' },
  { value: 'event_organizer', label: 'Event Organizer' },
  { value: 'story_collector', label: 'Story Collector' },
  { value: 'design_content', label: 'Design & Content' },
  { value: 'outreach_liaison', label: 'Outreach Liaison' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'onboarded', label: 'Onboarded' },
];

// ---------------------------------------------------------------------------
// Relative time formatter
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

interface VolunteerListClientProps {
  volunteers: Volunteer[];
  total: number;
  page: number;
  perPage: number;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  roleCounts: Record<string, number>;
  adminRole: AdminRole;
}

export function VolunteerListClient({
  volunteers,
  total,
  page,
  perPage,
  sortKey,
  sortDir,
  roleCounts,
  adminRole,
}: VolunteerListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // ── Selection ──

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === volunteers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(volunteers.map((v) => v.id)));
    }
  }, [volunteers, selectedIds.size]);

  // ── CSV export ──

  const handleExport = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('format', 'csv');
    params.delete('page');
    params.delete('per_page');
    window.open(`/api/admin/volunteers?${params.toString()}`, '_blank');
  }, [searchParams]);

  // ── Table columns ──

  const columns: Column<Volunteer>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (v) => (
        <span className="font-medium">
          {v.first_name} {v.last_name}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (v) => (
        <span className="text-gray-600">{v.email}</span>
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (v) => <RoleBadges roles={v.roles ?? []} />,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v) => <StatusBadge status={v.status} />,
    },
    {
      key: 'neighborhood',
      label: 'Neighborhood',
      sortable: true,
      render: (v) => v.neighborhood ?? '\u2014',
    },
    {
      key: 'signed_up_at',
      label: 'Signed up',
      sortable: true,
      render: (v) => (
        <span title={new Date(v.signed_up_at).toLocaleString()}>
          {relativeTime(v.signed_up_at)}
        </span>
      ),
    },
  ];

  // Map sort key: 'name' sorts by 'first_name' on the server
  const effectiveSortKey = sortKey === 'name' ? 'first_name' : sortKey;

  return (
    <div className="space-y-4">
      {/* Role breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {ROLE_OPTIONS.map(({ value, label }) => (
          <div
            key={value}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-semibold text-gray-900">
              {roleCounts[value] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search volunteers\u2026"
        filters={[
          { key: 'roles', label: 'All roles', options: ROLE_OPTIONS },
          { key: 'status', label: 'All statuses', options: STATUS_OPTIONS },
        ]}
        showDateRange
      />

      {/* Bulk actions bar */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-gray-500">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Data table */}
      <DataTable
        columns={columns}
        data={volunteers}
        sortKey={effectiveSortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={(v) => router.push(`/admin/volunteers/${v.id}`)}
        selectable={isAdmin}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        getRowId={(v) => v.id}
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
