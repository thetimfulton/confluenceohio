import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// -- Supabase mock --

const mockRpc = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelectChain = vi.fn();

/** Builds a chainable Supabase mock for .from(table) calls. */
function buildFromMock() {
  // Track per-table state for chained calls
  const chains: Record<string, ReturnType<typeof buildChain>> = {};

  function buildChain() {
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: mockInsert.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    // Each chain method returns the chain itself for fluent API
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.is.mockReturnValue(chain);
    chain.gte.mockReturnValue(chain);
    return chain;
  }

  return {
    from: (table: string) => {
      if (!chains[table]) {
        chains[table] = buildChain();
      }
      return chains[table];
    },
    rpc: mockRpc,
    _chains: chains,
    _buildChain: buildChain,
  };
}

let supabaseMock: ReturnType<typeof buildFromMock>;

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => supabaseMock,
}));

// -- Smarty mock --

const mockVerifySmartyAddress = vi.fn();

vi.mock('@confluenceohio/verification/smarty', () => ({
  verifySmartyAddress: (...args: unknown[]) => mockVerifySmartyAddress(...args),
  SmartyApiError: class SmartyApiError extends Error {
    statusCode: number | undefined;
    constructor(message: string, statusCode?: number) {
      super(message);
      this.name = 'SmartyApiError';
      this.statusCode = statusCode;
    }
  },
}));

// -- Inngest mock --

const mockInngestSend = vi.fn();

vi.mock('@/inngest/client', () => ({
  inngest: { send: (...args: unknown[]) => mockInngestSend(...args) },
}));

// -- Dedup mock (partial — let real hashing run, mock referral/token) --

vi.mock('@confluenceohio/core/petition/dedup', async (importOriginal) => {
  const original = await importOriginal<typeof import('@confluenceohio/core/petition/dedup')>();
  return {
    ...original,
    generateReferralCode: () => 'CONF-TEST',
    generateVerificationToken: () => ({
      rawToken: 'raw-test-token-hex',
      tokenHash: 'hashed-test-token',
    }),
  };
});

// -- Turnstile mock (mock global fetch for turnstile endpoint) --

const originalFetch = globalThis.fetch;
const mockTurnstileFetch = vi.fn();

// -- Env vars --

vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-turnstile-secret');
vi.stubEnv('RATE_LIMIT_SALT', 'test-salt');
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://confluenceohio.org');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
vi.stubEnv('SMARTY_AUTH_ID', 'test-smarty-id');
vi.stubEnv('SMARTY_AUTH_TOKEN', 'test-smarty-token');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validSmartyResult(overrides: Record<string, unknown> = {}) {
  return {
    isValid: true,
    isOhio: true,
    isResidential: true,
    isCMRA: false,
    isVacant: false,
    dpvMatchCode: 'Y',
    canonicalAddress: {
      line1: '123 MAIN ST',
      line2: null,
      city: 'COLUMBUS',
      state: 'OH',
      zipCode: '43215',
      zipPlus4: '1234',
    },
    latitude: 39.9612,
    longitude: -82.9988,
    rawResponse: { mock: true },
    ...overrides,
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    streetAddress: '123 Main St',
    aptUnit: '',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
    emailOptIn: true,
    turnstileToken: 'valid-turnstile-token',
    website: '',
    ref: '',
    ...overrides,
  };
}

function makeJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://confluenceohio.org/api/petition/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.42',
    },
    body: JSON.stringify(body),
  });
}

function makeFormRequest(fields: Record<string, string>): NextRequest {
  const params = new URLSearchParams(fields);
  return new NextRequest('https://confluenceohio.org/api/petition/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-forwarded-for': '203.0.113.42',
    },
    body: params.toString(),
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock = buildFromMock();

  // Default: Turnstile passes
  mockTurnstileFetch.mockResolvedValue(
    new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  // Intercept fetch calls — route Turnstile calls to mock, others to original
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('challenges.cloudflare.com')) {
      return mockTurnstileFetch(input, init);
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  // Default: Smarty returns valid Ohio address
  mockVerifySmartyAddress.mockResolvedValue(validSmartyResult());

  // Default: rate limit query returns 0 recent submissions
  const sigChain = supabaseMock.from('signatures');
  sigChain.select.mockReturnValue(sigChain);
  sigChain.eq.mockReturnValue(sigChain);
  sigChain.is.mockReturnValue(sigChain);
  sigChain.gte.mockReturnValue({ count: 0, error: null });

  // Default: no duplicates
  sigChain.maybeSingle.mockResolvedValue({ data: null });

  // Default: RPC returns a signature
  mockRpc.mockResolvedValue({
    data: [{ id: 'sig-uuid-1', signature_number: 42, referral_code: 'CONF-TEST' }],
    error: null,
  });

  // Default: token insert succeeds
  mockInsert.mockResolvedValue({ error: null });

  // Default: signature update succeeds
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  // Default: Inngest send succeeds
  mockInngestSend.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/petition/sign', () => {
  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------

  it('processes a valid Ohio signature and returns success', async () => {
    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      success: true,
      signature_number: 42,
      referral_code: 'CONF-TEST',
      redirect: '/sign/thank-you?n=42&ref=CONF-TEST',
    });

    // Verify Smarty was called with correct address
    expect(mockVerifySmartyAddress).toHaveBeenCalledWith(
      '123 Main St',
      '',
      'Columbus',
      'OH',
      '43215',
    );

    // Verify RPC was called
    expect(mockRpc).toHaveBeenCalledWith(
      'insert_signature',
      expect.objectContaining({
        p_first_name: 'Jane',
        p_last_name: 'Doe',
        p_email: 'jane@example.com',
        p_verification_status: 'verified',
        p_turnstile_token_valid: true,
        p_referral_code: 'CONF-TEST',
      }),
    );

    // Verify Inngest event fired
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'petition/signature.created',
        data: expect.objectContaining({
          signatureId: 'sig-uuid-1',
          signatureNumber: 42,
          email: 'jane@example.com',
          firstName: 'Jane',
          verificationStatus: 'verified',
        }),
      }),
    );
  });

  // -----------------------------------------------------------------------
  // Turnstile
  // -----------------------------------------------------------------------

  it('rejects expired Turnstile token', async () => {
    mockTurnstileFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('TURNSTILE_EXPIRED');
  });

  it('rejects invalid Turnstile token', async () => {
    mockTurnstileFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('TURNSTILE_FAILED');
  });

  it('proceeds with stricter rate limit when Turnstile token is missing', async () => {
    // No turnstile token — should proceed but with 1/hr limit
    const body = validBody({ turnstileToken: undefined });
    const req = makeJsonRequest(body);
    const res = await POST(req);

    // Should succeed (0 recent submissions < 1 limit)
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Honeypot
  // -----------------------------------------------------------------------

  it('returns fake success when honeypot is filled', async () => {
    const body = validBody({ website: 'http://spam.bot' });
    const req = makeJsonRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.referral_code).toBe('FAKE-CODE');

    // Verify nothing was actually processed
    expect(mockVerifySmartyAddress).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------

  it('returns 429 when rate limit exceeded with Turnstile (3/hr)', async () => {
    const sigChain = supabaseMock.from('signatures');
    sigChain.gte.mockReturnValue({ count: 3, error: null });

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe('RATE_LIMITED');
  });

  it('returns 429 when rate limit exceeded without Turnstile (1/hr)', async () => {
    const sigChain = supabaseMock.from('signatures');
    sigChain.gte.mockReturnValue({ count: 1, error: null });

    const body = validBody({ turnstileToken: undefined });
    const req = makeJsonRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe('RATE_LIMITED');
  });

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  it('returns 422 with field errors for invalid input', async () => {
    const body = {
      firstName: '',
      lastName: '',
      email: 'not-an-email',
      streetAddress: '12',
      city: '',
      state: 'NY',
      zipCode: '1234',
    };

    const req = makeJsonRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.fields).toBeDefined();
    expect(json.fields.firstName).toBeDefined();
    expect(json.fields.email).toBeDefined();
    expect(json.fields.state).toBeDefined();
    expect(json.fields.zipCode).toBeDefined();
  });

  it('lowercases email in output', async () => {
    const body = validBody({ email: 'Jane.Doe@Example.COM' });
    const req = makeJsonRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith(
      'insert_signature',
      expect.objectContaining({ p_email: 'jane.doe@example.com' }),
    );
  });

  // -----------------------------------------------------------------------
  // Address verification
  // -----------------------------------------------------------------------

  it('rejects invalid address (Smarty returns no candidates)', async () => {
    mockVerifySmartyAddress.mockResolvedValue(
      validSmartyResult({ isValid: false, dpvMatchCode: null }),
    );

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe('ADDRESS_INVALID');
  });

  it('rejects non-Ohio address', async () => {
    mockVerifySmartyAddress.mockResolvedValue(
      validSmartyResult({ isValid: true, isOhio: false }),
    );

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe('ADDRESS_NOT_OHIO');
  });

  it('flags CMRA address as flagged but accepts it', async () => {
    mockVerifySmartyAddress.mockResolvedValue(
      validSmartyResult({ isCMRA: true }),
    );

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith(
      'insert_signature',
      expect.objectContaining({ p_verification_status: 'flagged' }),
    );
  });

  it('flags vacant address as flagged but accepts it', async () => {
    mockVerifySmartyAddress.mockResolvedValue(
      validSmartyResult({ isVacant: true }),
    );

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith(
      'insert_signature',
      expect.objectContaining({ p_verification_status: 'flagged' }),
    );
  });

  it('flags commercial (non-residential) address as flagged but accepts it', async () => {
    mockVerifySmartyAddress.mockResolvedValue(
      validSmartyResult({ isResidential: false }),
    );

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith(
      'insert_signature',
      expect.objectContaining({ p_verification_status: 'flagged' }),
    );
  });

  it('flags DPV match code D (missing unit) as flagged but accepts it', async () => {
    mockVerifySmartyAddress.mockResolvedValue(
      validSmartyResult({ dpvMatchCode: 'D' }),
    );

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith(
      'insert_signature',
      expect.objectContaining({ p_verification_status: 'flagged' }),
    );
  });

  it('returns 503 when Smarty API is unreachable', async () => {
    const { SmartyApiError } = await import('@confluenceohio/verification/smarty');
    mockVerifySmartyAddress.mockRejectedValue(
      new SmartyApiError('Network error', 500),
    );

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe('SMARTY_API_ERROR');
  });

  // -----------------------------------------------------------------------
  // Duplicates
  // -----------------------------------------------------------------------

  it('returns 409 for duplicate email', async () => {
    // Override the maybeSingle for the email duplicate check
    // The route runs two parallel queries — we need the email one to return a match
    const sigChain = supabaseMock.from('signatures');
    sigChain.maybeSingle
      .mockResolvedValueOnce({ data: null }) // address check
      .mockResolvedValueOnce({ data: { id: 'existing-id', first_name: 'Jane', signature_number: 10 } }); // email check

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe('DUPLICATE_EMAIL');
    expect(json.error).toContain('#10');
  });

  it('returns 409 for duplicate address', async () => {
    const sigChain = supabaseMock.from('signatures');
    sigChain.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'existing-id', first_name: 'John', signature_number: 5 } }) // address
      .mockResolvedValueOnce({ data: null }); // email

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe('DUPLICATE_ADDRESS');
  });

  // -----------------------------------------------------------------------
  // Database errors
  // -----------------------------------------------------------------------

  it('returns 500 when insert_signature RPC fails', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe('DATABASE_ERROR');
  });

  // -----------------------------------------------------------------------
  // Inngest resilience
  // -----------------------------------------------------------------------

  it('returns success even when Inngest send fails', async () => {
    mockInngestSend.mockRejectedValue(new Error('Inngest down'));

    const req = makeJsonRequest(validBody());
    const res = await POST(req);

    // Signature was saved — success despite Inngest failure
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Progressive enhancement (form POST)
  // -----------------------------------------------------------------------

  it('redirects to thank-you page on form-urlencoded success', async () => {
    const req = makeFormRequest({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      streetAddress: '123 Main St',
      aptUnit: '',
      city: 'Columbus',
      state: 'OH',
      zipCode: '43215',
      emailOptIn: 'true',
      website: '',
    });

    const res = await POST(req);

    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toContain('/sign/thank-you');
    expect(location).toContain('n=42');
    expect(location).toContain('ref=CONF-TEST');
  });

  it('redirects to /sign with error param on form-urlencoded validation error', async () => {
    const req = makeFormRequest({
      firstName: '',
      lastName: '',
      email: 'bad',
      streetAddress: '',
      city: '',
      state: 'NY',
      zipCode: '',
    });

    const res = await POST(req);

    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toContain('/sign?error=VALIDATION_ERROR');
  });

  // -----------------------------------------------------------------------
  // Referral tracking
  // -----------------------------------------------------------------------

  it('passes referral code through to insert_signature RPC', async () => {
    const body = validBody({ ref: 'CONF-ABCD' });
    const req = makeJsonRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith(
      'insert_signature',
      expect.objectContaining({ p_referred_by_code: 'CONF-ABCD' }),
    );
  });

  // -----------------------------------------------------------------------
  // Email verification token
  // -----------------------------------------------------------------------

  it('creates email verification token after successful signature', async () => {
    const req = makeJsonRequest(validBody());
    await POST(req);

    // Verify token was inserted into email_verification_tokens
    expect(mockInsert).toHaveBeenCalled();
  });

  it('includes verification URL in Inngest event', async () => {
    const req = makeJsonRequest(validBody());
    await POST(req);

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationUrl: 'https://confluenceohio.org/sign/verify?token=raw-test-token-hex',
        }),
      }),
    );
  });
});
