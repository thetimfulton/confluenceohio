'use client';

/**
 * A/B test experiment hook (Artifact 13 §5.3).
 *
 * Wraps PostHog's feature flag React hooks to provide a clean interface
 * for experiment components. Flags are bootstrapped server-side (§5.2)
 * so the initial render always has the correct variant — no flickering.
 */

import {
  useFeatureFlagVariantKey,
  useFeatureFlagPayload,
} from 'posthog-js/react';

export interface ExperimentResult {
  /** The active variant key (e.g. 'control', 'variant_a', 'variant_b'). */
  variant: string;
  /** Optional JSON payload attached to the variant in PostHog. */
  payload: Record<string, unknown> | undefined;
  /** True when the user is in the control group (or flags haven't loaded). */
  isControl: boolean;
  /** True when the variant hasn't been resolved yet. */
  isLoading: boolean;
}

/**
 * Hook for A/B test variant assignment.
 *
 * @param flagKey - The PostHog feature flag key (e.g. 'exp_petition_headline')
 * @returns The variant assignment and metadata
 *
 * @example
 * ```tsx
 * const { variant, isControl } = useExperiment('exp_petition_headline');
 * const headline = isControl ? 'Default headline' : VARIANTS[variant];
 * ```
 */
export function useExperiment(flagKey: string): ExperimentResult {
  const variant = useFeatureFlagVariantKey(flagKey);
  const payload = useFeatureFlagPayload(flagKey);

  return {
    variant: (variant as string) ?? 'control',
    payload: payload as Record<string, unknown> | undefined,
    isControl: variant === 'control' || variant === undefined || variant === null,
    isLoading: variant === undefined,
  };
}
