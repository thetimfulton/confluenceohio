// ---------------------------------------------------------------------------
// Slug Generator — packages/core/voices/slug.ts
// ---------------------------------------------------------------------------
// Generates URL-friendly slugs for voice submissions. See Artifact 10 §3.3
// for the slug spec: slugify title (or first 6 words of body), lowercase,
// hyphens, strip special chars, append 4-char random hex suffix.
// ---------------------------------------------------------------------------

import { randomBytes } from 'crypto';

/**
 * Generate a URL slug from a title and/or body.
 *
 * @param title - Optional submission title
 * @param body - Submission body text (used if no title)
 * @returns Slug like "the-rivers-were-here-first-a7b3"
 */
export function generateVoiceSlug(title: string | undefined | null, body: string): string {
  // Use title if provided, otherwise first 6 words of body
  const source = title && title.trim().length > 0
    ? title.trim()
    : body.trim().split(/\s+/).slice(0, 6).join(' ');

  // Slugify: lowercase, replace non-alphanumeric with hyphens, collapse multiples
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60); // Keep reasonable length

  // Append 4-char random hex suffix for uniqueness
  const suffix = randomBytes(2).toString('hex');

  return `${base}-${suffix}`;
}
