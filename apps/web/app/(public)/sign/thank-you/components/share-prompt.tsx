'use client';

/**
 * A/B tested share section heading on the thank-you page
 * (Artifact 13 §5.4 — exp_thankyou_share_prompt).
 *
 * Variants:
 *   control   — "Share with friends"            (neutral/direct)
 *   variant_a — "Every share = more signatures"  (impact framing)
 *   variant_b — "87% of signers share"           (social proof)
 *
 * Goal metric: share_button_clicked
 */

import { useExperiment } from '@confluenceohio/ui/hooks/use-feature-flag';

const PROMPTS: Record<string, { heading: string; subtext?: string }> = {
  control: {
    heading: 'Share with friends',
  },
  variant_a: {
    heading: 'Every share = more signatures',
    subtext: 'The average share brings in 2 new signers.',
  },
  variant_b: {
    heading: '87% of signers share',
    subtext: "Join them — it takes 10 seconds.",
  },
};

export function SharePrompt() {
  const { variant } = useExperiment('exp_thankyou_share_prompt');
  const content = PROMPTS[variant] ?? PROMPTS.control;

  return (
    <div className="mb-4 text-center">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {content.heading}
      </h2>
      {content.subtext && (
        <p className="mt-1 text-sm text-gray-500">{content.subtext}</p>
      )}
    </div>
  );
}
