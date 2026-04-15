'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useCallback, useTransition } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Dropdown filter groups */
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    multi?: boolean;
  }[];
  /** Show date range inputs */
  showDateRange?: boolean;
}

export function FilterBar({
  searchPlaceholder = 'Search\u2026',
  filters = [],
  showDateRange = false,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filters change
      params.delete('page');
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${isPending ? 'opacity-70' : ''}`}
    >
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => {
            // Debounce: update on blur or after typing pause
            const value = e.target.value;
            const timeout = setTimeout(() => updateParam('search', value), 300);
            return () => clearTimeout(timeout);
          }}
          onBlur={(e) => updateParam('search', e.target.value)}
          className="h-9 w-56 rounded-md border border-gray-300 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Dropdown filters */}
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={searchParams.get(filter.key) ?? ''}
          onChange={(e) => updateParam(filter.key, e.target.value)}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {/* Date range */}
      {showDateRange && (
        <>
          <input
            type="date"
            aria-label="From date"
            defaultValue={searchParams.get('date_from') ?? ''}
            onChange={(e) => updateParam('date_from', e.target.value)}
            className="h-9 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-400">to</span>
          <input
            type="date"
            aria-label="To date"
            defaultValue={searchParams.get('date_to') ?? ''}
            onChange={(e) => updateParam('date_to', e.target.value)}
            className="h-9 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </>
      )}
    </div>
  );
}
