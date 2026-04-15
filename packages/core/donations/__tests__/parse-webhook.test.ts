import { describe, expect, it } from 'vitest';
import { parseActBlueWebhook } from '../parse-webhook.js';

// ---------------------------------------------------------------------------
// Fixture: valid ActBlue webhook payload
// ---------------------------------------------------------------------------

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    donor: {
      firstname: 'Jane',
      lastname: 'Doe',
      email: 'jane@example.com',
      phone: '614-555-0100',
      addr1: '123 Main St',
      city: 'Columbus',
      state: 'OH',
      zip: '43215',
      isEligibleForExpressLane: false,
    },
    orderNumber: 'AB-12345678',
    contribution: {
      createdAt: '2026-04-01T12:00:00Z',
      refcode: 'homepage_hero',
      refcode2: 'launch_2026',
    },
    lineitems: [
      {
        sequence: 1,
        entityId: 98765,
        committeeName: 'Confluence Ohio',
        amount: '25.00',
        paidAt: '2026-04-01T12:00:00Z',
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseActBlueWebhook
// ---------------------------------------------------------------------------

describe('parseActBlueWebhook', () => {
  it('parses a valid contribution payload', () => {
    const result = parseActBlueWebhook(validPayload());
    expect(result.error).toBeNull();
    expect(result.event).toMatchObject({
      type: 'contribution',
      orderNumber: 'AB-12345678',
      donorEmail: 'jane@example.com',
      donorName: 'Jane Doe',
      amountCents: 2500,
      recurring: false,
      refcode: 'homepage_hero',
      refcode2: 'launch_2026',
      expressLane: false,
      donatedAt: '2026-04-01T12:00:00Z',
    });
  });

  it('correctly computes amount_cents from dollar string', () => {
    const payload = validPayload();
    (payload.lineitems as Array<{ amount: string }>)[0].amount = '100.50';
    const result = parseActBlueWebhook(payload);
    expect(result.event!.amountCents).toBe(10050);
  });

  it('detects recurring donations from recurringPeriod', () => {
    const payload = validPayload();
    (payload.lineitems as Array<Record<string, unknown>>)[0].recurringPeriod =
      'monthly';
    const result = parseActBlueWebhook(payload);
    expect(result.event!.recurring).toBe(true);
  });

  it('treats recurringPeriod "once" as non-recurring', () => {
    const payload = validPayload();
    (payload.lineitems as Array<Record<string, unknown>>)[0].recurringPeriod =
      'once';
    const result = parseActBlueWebhook(payload);
    expect(result.event!.recurring).toBe(false);
  });

  it('sets refcode to null when absent', () => {
    const payload = validPayload();
    delete (payload.contribution as Record<string, unknown>).refcode;
    delete (payload.contribution as Record<string, unknown>).refcode2;
    const result = parseActBlueWebhook(payload);
    expect(result.event!.refcode).toBeNull();
    expect(result.event!.refcode2).toBeNull();
  });

  it('returns error for missing donor email', () => {
    const payload = validPayload();
    (payload.donor as Record<string, unknown>).email = 'not-an-email';
    const result = parseActBlueWebhook(payload);
    expect(result.event).toBeNull();
    expect(result.error).toContain('email');
  });

  it('returns error for missing orderNumber', () => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).orderNumber;
    const result = parseActBlueWebhook(payload);
    expect(result.event).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error for empty lineitems array', () => {
    const payload = validPayload({ lineitems: [] });
    const result = parseActBlueWebhook(payload);
    expect(result.event).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error for zero-dollar amount', () => {
    const payload = validPayload();
    (payload.lineitems as Array<{ amount: string }>)[0].amount = '0.00';
    const result = parseActBlueWebhook(payload);
    expect(result.event).toBeNull();
    expect(result.error).toContain('Invalid amount');
  });

  it('returns error for negative amount', () => {
    const payload = validPayload();
    (payload.lineitems as Array<{ amount: string }>)[0].amount = '-5.00';
    const result = parseActBlueWebhook(payload);
    expect(result.event).toBeNull();
    expect(result.error).toContain('Invalid amount');
  });

  it('returns error for non-numeric amount', () => {
    const payload = validPayload();
    (payload.lineitems as Array<{ amount: string }>)[0].amount = 'abc';
    const result = parseActBlueWebhook(payload);
    expect(result.event).toBeNull();
    expect(result.error).toContain('Invalid amount');
  });

  it('returns error for completely invalid input', () => {
    const result = parseActBlueWebhook('not json');
    expect(result.event).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error for null input', () => {
    const result = parseActBlueWebhook(null);
    expect(result.event).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('preserves Express Lane status', () => {
    const payload = validPayload();
    (payload.donor as Record<string, unknown>).isEligibleForExpressLane = true;
    const result = parseActBlueWebhook(payload);
    expect(result.event!.expressLane).toBe(true);
  });

  it('defaults isEligibleForExpressLane to false when missing', () => {
    const payload = validPayload();
    delete (payload.donor as Record<string, unknown>).isEligibleForExpressLane;
    const result = parseActBlueWebhook(payload);
    expect(result.event!.expressLane).toBe(false);
  });
});
