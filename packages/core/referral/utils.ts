/**
 * Referral code utilities (Artifact 11 §1.1-§1.2).
 *
 * Provides helpers for building referral URLs, parsing referral codes from
 * URLs, and validating the CONF-XXXX format.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Regex matching a valid CONF-XXXX referral code.
 * Alphabet excludes ambiguous characters: 0/O, 1/l/I.
 */
const REF_CODE_REGEX = /^CONF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates whether a string is a valid referral code in CONF-XXXX format.
 *
 * Valid codes use the reduced alphabet (30 chars: 2-9 A-Z minus O and I).
 * Case-sensitive — codes are always uppercase.
 */
export function isValidRefCode(code: string): boolean {
  return REF_CODE_REGEX.test(code);
}

// ---------------------------------------------------------------------------
// URL building
// ---------------------------------------------------------------------------

/**
 * Appends a referral code as the `ref` query parameter to a base URL.
 *
 * @param baseUrl - The base URL to append the referral code to
 *                  (e.g. "https://confluenceohio.org/sign")
 * @param refCode - A valid CONF-XXXX referral code
 * @returns The URL with `?ref=CONF-XXXX` appended (preserves existing params)
 * @throws {Error} If the refCode is invalid
 */
export function buildReferralUrl(baseUrl: string, refCode: string): string {
  if (!isValidRefCode(refCode)) {
    throw new Error(`Invalid referral code: ${refCode}`);
  }

  const url = new URL(baseUrl);
  url.searchParams.set('ref', refCode);
  return url.toString();
}

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

/**
 * Extracts and validates a referral code from a URL string.
 *
 * Looks for the `ref` query parameter and validates its format.
 * Returns `null` if the parameter is absent or invalid.
 *
 * @param url - A full URL string (e.g. "https://confluenceohio.org/sign?ref=CONF-7KMN")
 * @returns The referral code string, or null if not found/invalid
 */
export function parseRefCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    const ref = parsed.searchParams.get('ref');
    if (ref && isValidRefCode(ref)) {
      return ref;
    }
    return null;
  } catch {
    return null;
  }
}
