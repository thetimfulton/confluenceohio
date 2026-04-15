import { createHash, randomBytes } from 'node:crypto';
import { customAlphabet } from 'nanoid';

// ---------------------------------------------------------------------------
// Address hashing — uses Smarty-normalized (canonical) address fields
// ---------------------------------------------------------------------------

export interface CanonicalAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zipCode: string;
}

/**
 * SHA-256 hash of a Smarty-normalized address.
 * Uppercases + trims each field, joins with '|', then hashes.
 * Because input comes from Smarty, "123 Main St" and "123 Main Street"
 * are already normalized to the same canonical form before reaching here.
 */
export function generateAddressHash(canonicalAddress: CanonicalAddress): string {
  const normalized = [
    canonicalAddress.line1.toUpperCase().trim(),
    (canonicalAddress.line2 ?? '').toUpperCase().trim(),
    canonicalAddress.city.toUpperCase().trim(),
    canonicalAddress.state.toUpperCase().trim(),
    canonicalAddress.zipCode.trim(),
  ].join('|');

  return createHash('sha256').update(normalized).digest('hex');
}

// ---------------------------------------------------------------------------
// Email hashing
// ---------------------------------------------------------------------------

/**
 * SHA-256 hash of a lowercased, trimmed email address.
 */
export function generateEmailHash(email: string): string {
  return createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

// ---------------------------------------------------------------------------
// IP hashing (rate limiting)
// ---------------------------------------------------------------------------

/**
 * SHA-256 hash of ip + salt for rate-limit tracking without storing raw IPs.
 * Salt should come from the RATE_LIMIT_SALT env var.
 */
export function generateIpHash(ip: string, salt: string): string {
  return createHash('sha256')
    .update(ip + salt)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Referral codes — CONF-XXXX
// ---------------------------------------------------------------------------

// Excludes ambiguous characters: 0/O, 1/l/I
const SUFFIX_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const generateSuffix = customAlphabet(SUFFIX_ALPHABET, 4);

/**
 * Generates a branded referral code in the format CONF-XXXX.
 * XXXX is 4 characters from a safe alphabet (no ambiguous chars).
 */
export function generateReferralCode(): string {
  return `CONF-${generateSuffix()}`;
}

// ---------------------------------------------------------------------------
// Email verification tokens
// ---------------------------------------------------------------------------

/**
 * Generates a verification token pair.
 * - rawToken: 32 random bytes as hex (64-char string). Goes in the email URL.
 * - tokenHash: SHA-256 of rawToken. Stored in the database.
 */
export function generateVerificationToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  return { rawToken, tokenHash };
}
