// ---------------------------------------------------------------------------
// Email Package Entry Point — packages/email/index.ts
// ---------------------------------------------------------------------------
// Factory function for the email adapter. Returns a singleton BrevoAdapter
// instance so all callers share the same connection.
// ---------------------------------------------------------------------------

import { BrevoAdapter } from './brevo';
import type { EmailPort } from './types';

let instance: EmailPort | null = null;

/**
 * Returns a singleton BrevoAdapter instance.
 * Reads BREVO_API_KEY from process.env on first call.
 *
 * @throws {Error} if BREVO_API_KEY is not set
 */
export function getEmailAdapter(): EmailPort {
  if (!instance) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error(
        'BREVO_API_KEY environment variable is not set. ' +
          'Add it to your .env.local file or Vercel environment variables.',
      );
    }
    instance = new BrevoAdapter(apiKey);
  }
  return instance;
}

// Re-export types and adapter for convenience
export { BrevoAdapter, BrevoApiError } from './brevo';
export type {
  EmailPort,
  Contact,
  TransactionalEmail,
  CampaignEmail,
  ListId,
} from './types';
export { getTemplateId } from './templates';
export type { TemplateName } from './templates';
