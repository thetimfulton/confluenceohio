'use client';

/**
 * A/B tested petition page headline (Artifact 13 §5.4 — exp_petition_headline).
 *
 * Variants:
 *   control   — "Add Your Name to the Confluence Ohio Petition"
 *   variant_a — "22,000 Signatures Can Change Our City's Name"
 *   variant_b — "Where Two Rivers Meet, a New Name Begins"
 *
 * Goal metric: petition_form_started
 */

import { useExperiment } from '@confluenceohio/ui/hooks/use-feature-flag';

const HEADLINES: Record<string, { title: string; subtitle: string }> = {
  control: {
    title: 'Add Your Name to the Confluence Ohio Petition',
    subtitle: 'Help put the question on the ballot.',
  },
  variant_a: {
    title: "22,000 Signatures Can Change Our City's Name",
    subtitle: "We're already on our way. Add yours.",
  },
  variant_b: {
    title: 'Where Two Rivers Meet, a New Name Begins',
    subtitle: 'Sign the petition for Confluence, Ohio.',
  },
};

export function PetitionHeadline() {
  const { variant } = useExperiment('exp_petition_headline');
  const content = HEADLINES[variant] ?? HEADLINES.control;

  return (
    <div className="mb-8 text-center lg:mb-10">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {content.title}
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-600">
        {content.subtitle}
      </p>
    </div>
  );
}
