import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { TrendData } from '@confluenceohio/core/analytics/compute-trend';

interface MetricCardProps {
  label: string;
  value: string;
  /** Optional sub-line displayed below the value (e.g. "avg $31.20") */
  detail?: string;
  trend?: TrendData;
  /** 0–1 fraction for a progress bar (e.g. signatures / goal). */
  progress?: number;
  /** Text rendered below the progress bar (e.g. "19.2%"). */
  progressLabel?: string;
  /** Optional flag to draw attention (e.g. pending moderation). */
  alert?: boolean;
}

const TREND_ICON = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
} as const;

const TREND_COLOR = {
  up: 'text-green-600',
  down: 'text-red-600',
  flat: 'text-gray-500',
} as const;

export function MetricCard({
  label,
  value,
  detail,
  trend,
  progress,
  progressLabel,
  alert,
}: MetricCardProps) {
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;

  return (
    <div
      className={`rounded-lg border bg-white p-5 shadow-sm ${
        alert ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>

      {detail && (
        <p className="mt-0.5 text-sm text-gray-600">{detail}</p>
      )}

      {trend && TrendIcon && (
        <div className={`mt-2 flex items-center gap-1 text-sm ${TREND_COLOR[trend.direction]}`}>
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {trend.percentChange > 0 ? '+' : ''}
            {trend.percentChange}%
          </span>
          <span className="text-gray-400">vs prior period</span>
        </div>
      )}

      {progress != null && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width] duration-500"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          {progressLabel && (
            <p className="mt-1 text-xs text-gray-500">{progressLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
