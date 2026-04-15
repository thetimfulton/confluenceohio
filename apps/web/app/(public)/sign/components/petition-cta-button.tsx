'use client';

/**
 * A/B tested petition submit button text (Artifact 13 §5.4 — exp_petition_cta_text).
 *
 * Variants:
 *   control   — "Add My Name →"
 *   variant_a — "Sign the Petition →"
 *   variant_b — "I Support This →"
 *
 * Goal metric: petition_form_submitted
 *
 * This component renders the *label only* so the parent button can own
 * layout, disabled states, and the loading spinner.
 */

import { useExperiment } from '@confluenceohio/ui/hooks/use-feature-flag';

const CTA_LABELS: Record<string, string> = {
  control: 'Add My Name',
  variant_a: 'Sign the Petition',
  variant_b: 'I Support This',
};

/**
 * Returns the experiment-driven CTA label for the petition submit button.
 * Arrow is appended by the caller so it can be omitted during loading state.
 */
export function usePetitionCtaLabel(): string {
  const { variant } = useExperiment('exp_petition_cta_text');
  return CTA_LABELS[variant] ?? CTA_LABELS.control;
}

/**
 * Renders the petition CTA label with trailing arrow.
 * Drop-in replacement for the static "Add My Name →" text.
 */
export function PetitionCtaLabel() {
  const label = usePetitionCtaLabel();
  return <>{label} &rarr;</>;
}
