import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'donations') {
        return {
          insert: mockInsert,
          select: () => ({ eq: mockEq }),
        };
      }
      return {};
    },
  }),
}));

// Set up the select → eq → maybeSingle chain
mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

const mockInngestSend = vi.fn();
vi.mock('@/inngest/client', () => ({
  inngest: { send: (...args: unknown[]) => mockInngestSend(...args) },
}));

// Set env vars for Basic Auth
vi.stubEnv('ACTBLUE_WEBHOOK_USERNAME', 'testuser');
vi.stubEnv('ACTBLUE_WEBHOOK_PASSWORD', 'testpass');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function basicAuthHeader(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

function validPayload() {
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
  };
}

function makeRequest(
  body: unknown,
  auth = basicAuthHeader('testuser', 'testpass'),
): NextRequest {
  return new NextRequest('https://confluenceohio.org/api/webhooks/actblue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/webhooks/actblue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing donation, successful insert, successful Inngest send
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockInsert.mockResolvedValue({ error: null });
    mockInngestSend.mockResolvedValue(undefined);
  });

  // --- Auth ---

  it('returns 401 for missing auth header', async () => {
    const req = new NextRequest(
      'https://confluenceohio.org/api/webhooks/actblue',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload()),
      },
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 for wrong credentials', async () => {
    const req = makeRequest(
      validPayload(),
      basicAuthHeader('wrong', 'creds'),
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // --- Payload validation ---

  it('returns 400 for malformed JSON', async () => {
    const req = new NextRequest(
      'https://confluenceohio.org/api/webhooks/actblue',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: basicAuthHeader('testuser', 'testpass'),
        },
        body: 'not json {{{',
      },
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid payload structure', async () => {
    const req = makeRequest({ invalid: true });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // --- Happy path ---

  it('processes a valid contribution webhook', async () => {
    const req = makeRequest(validPayload());
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');

    // Verify donation was inserted
    expect(mockInsert).toHaveBeenCalledOnce();
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg).toMatchObject({
      actblue_order_id: 'AB-12345678',
      donor_email: 'jane@example.com',
      donor_name: 'Jane Doe',
      amount_cents: 2500,
      recurring: false,
      refcode: 'homepage_hero',
      refcode2: 'launch_2026',
      express_lane: false,
      donated_at: '2026-04-01T12:00:00Z',
    });
    expect(insertArg.webhook_payload_hash).toMatch(/^[a-f0-9]{64}$/);

    // Verify Inngest event was fired
    expect(mockInngestSend).toHaveBeenCalledOnce();
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'donation/received',
        data: expect.objectContaining({
          email: 'jane@example.com',
          donorName: 'Jane Doe',
          amountCents: 2500,
          recurring: false,
          refcode: 'homepage_hero',
          orderNumber: 'AB-12345678',
        }),
      }),
    );
  });

  // --- Idempotency ---

  it('returns 200 with already_processed for duplicate order', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'existing-id' },
    });

    const req = makeRequest(validPayload());
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('already_processed');

    // Should NOT attempt insert or fire Inngest event
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  // --- Refcode attribution ---

  it('passes refcode through to donation record and Inngest event', async () => {
    const payload = validPayload();
    payload.contribution.refcode = 'petition_thankyou';
    payload.contribution.refcode2 = 'milestone_10k';

    const req = makeRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.refcode).toBe('petition_thankyou');
    expect(insertArg.refcode2).toBe('milestone_10k');

    const inngestArg = mockInngestSend.mock.calls[0][0];
    expect(inngestArg.data.refcode).toBe('petition_thankyou');
  });

  it('handles missing refcodes gracefully', async () => {
    const payload = validPayload();
    delete (payload.contribution as Record<string, unknown>).refcode;
    delete (payload.contribution as Record<string, unknown>).refcode2;

    const req = makeRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.refcode).toBeNull();
    expect(insertArg.refcode2).toBeNull();
  });

  // --- Recurring donations ---

  it('detects recurring donations', async () => {
    const payload = validPayload();
    (payload.lineitems[0] as Record<string, unknown>).recurringPeriod =
      'monthly';

    const req = makeRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockInsert.mock.calls[0][0].recurring).toBe(true);
    expect(mockInngestSend.mock.calls[0][0].data.recurring).toBe(true);
  });

  // --- Error handling ---

  it('returns 500 when database insert fails', async () => {
    mockInsert.mockResolvedValue({
      error: { message: 'DB error', code: '500' },
    });

    const req = makeRequest(validPayload());
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 200 even when Inngest send fails', async () => {
    mockInngestSend.mockRejectedValue(new Error('Inngest down'));

    const req = makeRequest(validPayload());
    const res = await POST(req);

    // Donation was inserted successfully — returns 200 despite Inngest failure
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledOnce();
  });
});
