import type { DonationEvent, RefundEvent } from './types.js';
import { webhookPayloadSchema } from './types.js';

/**
 * Parse and validate an ActBlue webhook payload.
 *
 * Pure function — no infrastructure dependencies. Takes the raw request body
 * (already parsed from JSON), validates it against the webhook schema, and
 * extracts a typed DonationEvent.
 *
 * Returns null if the payload fails validation.
 */
export function parseActBlueWebhook(
  body: unknown,
): { event: DonationEvent; error: null } | { event: null; error: string } {
  const result = webhookPayloadSchema.safeParse(body);

  if (!result.success) {
    return {
      event: null,
      error: result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    };
  }

  const payload = result.data;
  const lineItem = payload.lineitems[0];
  const amountCents = Math.round(parseFloat(lineItem.amount) * 100);

  if (amountCents <= 0 || !Number.isFinite(amountCents)) {
    return { event: null, error: `Invalid amount: ${lineItem.amount}` };
  }

  const recurring =
    lineItem.recurringPeriod !== undefined &&
    lineItem.recurringPeriod !== 'once';

  const donorName =
    `${payload.donor.firstname} ${payload.donor.lastname}`.trim();

  const event: DonationEvent = {
    type: 'contribution',
    orderNumber: payload.orderNumber,
    donorEmail: payload.donor.email,
    donorName,
    amountCents,
    recurring,
    refcode: payload.contribution.refcode ?? null,
    refcode2: payload.contribution.refcode2 ?? null,
    expressLane: payload.donor.isEligibleForExpressLane,
    lineItems: payload.lineitems,
    donatedAt: lineItem.paidAt,
  };

  return { event, error: null };
}
