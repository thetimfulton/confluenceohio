'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Download, CheckCircle, XCircle } from 'lucide-react';
import type { AdminRole, Signature } from '@confluenceohio/db/types';
import { DataTable, Pagination, type Column } from '../../_components/data-table';
import { FilterBar } from '../../_components/filter-bar';
import { VerificationStatusBadge } from '../../_components/verification-status-badge';

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'duplicate', label: 'Duplicate' },
];

const EMAIL_VERIFIED_OPTIONS = [
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Not verified' },
];

const HAS_REFERRAL_OPTIONS = [
  { value: 'true', label: 'Referred' },
  { value: 'false', label: 'Not referred' },
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

interface SignatureListClientProps {
  signatures: Signature[];
  total: number;
  page: number;
  perPage: number;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  adminRole: AdminRole;
}

export function SignatureListClient({
  signatures,
  total,
  page,
  perPage,
  sortKey,
  sortDir,
  adminRole,
}: SignatureListClientProps) {
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
      // Map display key to DB field
      const dbKey = key === 'name' ? 'first_name' : key;
      const newDir = sortKey === dbKey && sortDir === 'desc' ? 'asc' : 'desc';
      updateParams({ sort: dbKey, order: newDir, page: undefined });
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
    if (selectedIds.size === signatures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(signatures.map((s) => s.id)));
    }
  }, [signatures, selectedIds.size]);

  // ── CSV export ──

  const handleExport = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('format', 'csv');
    params.delete('page');
    params.delete('per_page');
    window.open(`/api/admin/signatures?${params.toString()}`, '_blank');
  }, [searchParams]);

  // ── Table columns ──

  const columns: Column<Signature>[] = [
    {
      key: 'signature_number',
      label: '#',
      sortable: true,
      render: (s) => (
        <span className="font-mono text-gray-600">#{s.signature_number}</span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (s) => (
        <span className="font-medium">
          {s.first_name} {s.last_name}
        </span>
      ),
    },
    {
      key: 'city',
      label: 'City',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      render: (s) => (
        <span className="text-gray-600">{s.email}</span>
      ),
    },
    {
      key: 'verification_status',
      label: 'Verification',
      sortable: true,
      render: (s) => <VerificationStatusBadge status={s.verification_status} />,
    },
    {
      key: 'referred_by_code',
      label: 'Referred by',
      render: (s) =>
        s.referred_by_code ? (
          <span className="font-mono text-xs text-blue-600">{s.referred_by_code}</span>
        ) : (
          <span className="text-gray-400">&mdash;</span>
        ),
    },
    {
      key: 'email_verified',
      label: 'Email verified',
      sortable: true,
      render: (s) =>
        s.email_verified ? (
          <CheckCircle className="h-4 w-4 text-green-600" aria-label="Verified" />
        ) : (
          <XCircle className="h-4 w-4 text-gray-400" aria-label="Not verified" />
        ),
    },
    {
      key: 'signed_at',
      label: 'Signed at',
      sortable: true,
      render: (s) => (
        <span title={new Date(s.signed_at).toLocaleString()}>
          {relativeTime(s.signed_at)}
        </span>
      ),
    },
  ];

  // Map sort key: 'name' sorts by 'first_name' on the server
  const effectiveSortKey = sortKey === 'first_name' ? 'name' : sortKey;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search signatures&hellip;"
        filters={[
          { key: 'status', label: 'All statuses', options: STATUS_OPTIONS },
          { key: 'email_verified', label: 'Email verified', options: EMAIL_VERIFIED_OPTIONS },
          { key: 'has_referral', label: 'Referral', options: HAS_REFERRAL_OPTIONS },
        ]}
        showDateRange
      />

      {/* Actions bar */}
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
        data={signatures}
        sortKey={effectiveSortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={(s) => router.push(`/admin/signatures/${s.id}`)}
        selectable={isAdmin}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
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
