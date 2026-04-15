/**
 * ActBlue refcode utilities (Artifact 09 §3).
 *
 * Builds tracked ActBlue donation URLs with refcode attribution
 * and validates refcodes against ActBlue constraints.
 */

const DEFAULT_ACTBLUE_FORM_URL =
  'https://secure.actblue.com/donate/confluence';

export interface ActBlueLinkOptions {
  refcode: string;
  refcode2?: string;
  amount?: number; // Pre-selected amount in dollars
  recurring?: boolean;
}

/**
 * Build an ActBlue donation URL with refcode tracking.
 * Used for fallback links, email CTAs, and social share URLs.
 */
export function buildActBlueUrl(options: ActBlueLinkOptions): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_ACTBLUE_FORM_URL ?? DEFAULT_ACTBLUE_FORM_URL;
  const url = new URL(baseUrl);
  url.searchParams.set('refcode', options.refcode);
  if (options.refcode2) {
    url.searchParams.set('refcode2', options.refcode2);
  }
  if (options.amount) {
    url.searchParams.set('amount', options.amount.toString());
  }
  if (options.recurring) {
    url.searchParams.set('recurring', 'true');
  }
  return url.toString();
}

/**
 * Validate a refcode string against ActBlue constraints.
 * Letters, numbers, and underscores only.
 */
export function isValidRefcode(refcode: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(refcode);
}
