import { createHmac } from 'crypto';

/**
 * Generate an HMAC-SHA256 unsubscribe token for a given email address.
 * Used when building unsubscribe links for custom email footers.
 *
 * @param email — lowercase, trimmed email address
 * @param secret — EMAIL_VERIFICATION_SECRET env var
 */
export function generateUnsubscribeToken(
  email: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(email.toLowerCase().trim())
    .digest('hex');
}

/**
 * Build the full unsubscribe URL for a given email.
 */
export function buildUnsubscribeUrl(email: string): string {
  const secret = process.env.EMAIL_VERIFICATION_SECRET;
  if (!secret) {
    throw new Error('EMAIL_VERIFICATION_SECRET is not set');
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';
  const token = generateUnsubscribeToken(email, secret);

  return `${siteUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
