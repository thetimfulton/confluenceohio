'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef } from 'react';
import type { AdminRole, VoiceSubmission } from '@confluenceohio/db/types';
import { Pagination } from '../../_components/data-table';
import { FilterBar } from '../../_components/filter-bar';
import { ModerationCard } from './moderation-card';

// ---------------------------------------------------------------------------
// Status tabs
// ---------------------------------------------------------------------------

const STATUS_TABS = [
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'pending', label: 'Pending' },
  { value: 'auto_approved', label: 'Auto-Approved' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
] as const;

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const POSITION_OPTIONS = [
  { value: 'support', label: 'Supports renaming' },
  { value: 'oppose', label: 'Has concerns' },
  { value: 'undecided', label: 'Still deciding' },
];

const FEATURED_OPTIONS = [
  { value: 'true', label: 'Featured' },
  { value: 'false', label: 'Not featured' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VoiceListClientProps {
  submissions: VoiceSubmission[];
  total: number;
  page: number;
  perPage: number;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  currentStatus: string;
  adminRole: AdminRole;
  statusCounts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VoiceListClient({
  submissions,
  total,
  page,
  perPage,
  currentStatus,
  adminRole,
  statusCounts,
}: VoiceListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // ── Navigation helpers ──

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleTabChange = useCallback(
    (status: string) => {
      updateParams({ status, page: undefined });
    },
    [updateParams],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: String(newPage) });
    },
    [updateParams],
  );

  return (
    <div className="space-y-4">
      {/* ── Status tabs ── */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-x-1 overflow-x-auto" aria-label="Status filter">
          {STATUS_TABS.map((tab) => {
            const isActive = currentStatus === tab.value;
            const count = tab.value === 'all'
              ? undefined
              : statusCounts[tab.value];

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
                {count != null && count > 0 && (
                  <span
                    className={`ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : tab.value === 'needs_review'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Filters ── */}
      <FilterBar
        searchPlaceholder="Search voices\u2026"
        filters={[
          { key: 'position', label: 'All positions', options: POSITION_OPTIONS },
          { key: 'featured', label: 'Featured status', options: FEATURED_OPTIONS },
        ]}
        showDateRange
      />

      {/* ── Submission cards ── */}
      <div className="space-y-3" role="list" aria-label="Voice submissions">
        {submissions.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-500">
              No submissions found for this filter.
            </p>
          </div>
        ) : (
          submissions.map((submission, index) => {
            // Create a ref for the next card's expand button
            const nextRef = { current: cardRefs.current[index + 1] ?? null } as React.RefObject<HTMLButtonElement | null>;

            return (
              <div key={submission.id} role="listitem">
                <ModerationCard
                  submission={submission}
                  adminRole={adminRole}
                  nextCardRef={nextRef}
                />
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ── */}
      <Pagination
        page={page}
        perPage={perPage}
        total={total}
        onChange={handlePageChange}
      />
    </div>
  );
}
