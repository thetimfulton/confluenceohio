// ---------------------------------------------------------------------------
// Voice Submission Validation — packages/core/voices/validation.ts
// ---------------------------------------------------------------------------
// Zod schemas for community voice submissions. See Artifact 10 §1.2 for
// field specifications and §7.2 for the server-side validation pipeline.
// ---------------------------------------------------------------------------

import { z } from 'zod';

// ============================================
// Constants
// ============================================

const AUTHOR_NAME_MIN = 2;
const AUTHOR_NAME_MAX = 60;
const NEIGHBORHOOD_MAX = 100;
const TITLE_MAX = 100;
const BODY_MIN = 50;
const BODY_MAX = 2500;
const MAX_LINK_COUNT = 2;

/** Minimum time (ms) a legitimate user would spend composing a submission. */
export const MIN_TIME_ON_PAGE_MS = 30_000;

// ============================================
// Helpers
// ============================================

/** Strip HTML tags from text. */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/** Sanitize all string values — strip HTML, normalize whitespace. */
export function sanitizeInput(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = stripHtml(value).replace(/\s+/g, ' ').trim();
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Count the number of URLs in a string. */
function countLinks(text: string): number {
  const urlPattern = /https?:\/\/[^\s]+/gi;
  return (text.match(urlPattern) || []).length;
}

// ============================================
// Zod Schema — Submission Form (Artifact 10 §1.2)
// ============================================

export const voiceSubmitSchema = z
  .object({
    author_name: z
      .string()
      .min(AUTHOR_NAME_MIN, `Display name must be at least ${AUTHOR_NAME_MIN} characters`)
      .max(AUTHOR_NAME_MAX, `Display name must be ${AUTHOR_NAME_MAX} characters or fewer`)
      .trim(),
    author_email: z
      .string()
      .email('Please enter a valid email address')
      .max(254)
      .trim()
      .transform((v) => v.toLowerCase()),
    author_neighborhood: z
      .string()
      .max(NEIGHBORHOOD_MAX, `Neighborhood must be ${NEIGHBORHOOD_MAX} characters or fewer`)
      .trim()
      .optional()
      .or(z.literal('')),
    position: z.enum(['support', 'oppose', 'undecided'], {
      errorMap: () => ({ message: 'Please select your position' }),
    }),
    title: z
      .string()
      .max(TITLE_MAX, `Title must be ${TITLE_MAX} characters or fewer`)
      .trim()
      .optional()
      .or(z.literal('')),
    body: z
      .string()
      .min(BODY_MIN, `Your perspective must be at least ${BODY_MIN} characters`)
      .max(BODY_MAX, `Your perspective must be ${BODY_MAX} characters or fewer`)
      .trim(),
    guidelines_accepted: z.preprocess(
      (v) => v === 'true' || v === true || v === 'on',
      z.literal(true, {
        errorMap: () => ({ message: 'You must accept the community guidelines' }),
      }),
    ),
    cf_turnstile_response: z.string().optional(),
    website: z.string().optional(), // Honeypot
    form_loaded_at: z.preprocess(
      (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
      z.number().optional(),
    ),
  })
  .refine(
    (data) => countLinks(data.body) <= MAX_LINK_COUNT,
    {
      message: `Submissions may contain at most ${MAX_LINK_COUNT} links`,
      path: ['body'],
    },
  );

export type VoiceSubmitInput = z.infer<typeof voiceSubmitSchema>;
