'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  /** Render a checkbox column for bulk selection */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  getRowId?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  selectable,
  selectedIds,
  onSelect,
  onSelectAll,
  getRowId,
}: DataTableProps<T>) {
  const allSelected =
    selectable && data.length > 0 && selectedIds?.size === data.length;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {selectable && (
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${
                  col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''
                }`}
                onClick={col.sortable ? () => onSort?.(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-4 py-8 text-center text-sm text-gray-500"
              >
                No results found.
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const rowId = getRowId?.(row) ?? String(i);
              return (
                <tr
                  key={rowId}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(rowId)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onSelect?.(rowId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select row ${rowId}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-900"
                    >
                      {col.render
                        ? col.render(row)
                        : String(
                            (row as Record<string, unknown>)[col.key] ?? '',
                          )}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({
  active,
  dir,
}: {
  active: boolean;
  dir?: 'asc' | 'desc';
}) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />;
  return dir === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5 text-blue-600" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  perPage: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, perPage, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-gray-600">
        {total > 0
          ? `Showing ${from}\u2013${to} of ${total}`
          : 'No results'}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
