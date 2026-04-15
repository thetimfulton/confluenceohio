export interface TrendData {
  current: number;
  previous: number;
  direction: 'up' | 'down' | 'flat';
  percentChange: number;
}

/**
 * Compute directional trend and percent change between two periods.
 *
 * A ±1% dead zone is used to avoid noise: changes within that band are
 * reported as "flat" rather than showing a misleading arrow.
 */
export function computeTrend(current: number, previous: number): TrendData {
  if (previous === 0) {
    return {
      current,
      previous,
      direction: current > 0 ? 'up' : 'flat',
      percentChange: current > 0 ? 100 : 0,
    };
  }

  const percentChange = ((current - previous) / previous) * 100;

  return {
    current,
    previous,
    direction: percentChange > 1 ? 'up' : percentChange < -1 ? 'down' : 'flat',
    percentChange: Math.round(percentChange * 10) / 10,
  };
}
