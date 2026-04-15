import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifySmartyAddress,
  MockSmartyAdapter,
  SmartyApiError,
} from '../smarty.js';

// ---------------------------------------------------------------------------
// Helpers — build a realistic Smarty US Street API response
// ---------------------------------------------------------------------------

function buildSmartyCandidate(overrides?: {
  dpv_match_code?: string;
  state_abbreviation?: string;
  rdi?: string;
  dpv_cmra?: string;
  dpv_vacant?: string;
  delivery_line_1?: string;
  delivery_line_2?: string;
  city_name?: string;
  zipcode?: string;
  plus4_code?: string;
  latitude?: number;
  longitude?: number;
}) {
  return {
    delivery_line_1: overrides?.delivery_line_1 ?? '123 MAIN ST',
    delivery_line_2: overrides?.delivery_line_2 ?? '',
    components: {
      state_abbreviation: overrides?.state_abbreviation ?? 'OH',
      city_name: overrides?.city_name ?? 'COLUMBUS',
      zipcode: overrides?.zipcode ?? '43215',
      plus4_code: overrides?.plus4_code ?? '1234',
    },
    metadata: {
      rdi: overrides?.rdi ?? 'Residential',
      latitude: overrides?.latitude ?? 39.9612,
      longitude: overrides?.longitude ?? -82.9988,
    },
    analysis: {
      dpv_match_code: overrides?.dpv_match_code ?? 'Y',
      dpv_cmra: overrides?.dpv_cmra ?? 'N',
      dpv_vacant: overrides?.dpv_vacant ?? 'N',
    },
  };
}

function mockFetchResponse(candidates: unknown[], status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(candidates),
  });
}

// ---------------------------------------------------------------------------
// Tests — verifySmartyAddress (live adapter with mocked fetch)
// ---------------------------------------------------------------------------

describe('verifySmartyAddress', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv('SMARTY_AUTH_ID', 'test-auth-id');
    vi.stubEnv('SMARTY_AUTH_TOKEN', 'test-auth-token');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('returns a valid Ohio residential result for DPV Y', async () => {
    const candidate = buildSmartyCandidate({ dpv_match_code: 'Y' });
    globalThis.fetch = mockFetchResponse([candidate]);

    const result = await verifySmartyAddress(
      '123 Main St', '', 'Columbus', 'OH', '43215',
    );

    expect(result.isValid).toBe(true);
    expect(result.isOhio).toBe(true);
    expect(result.isResidential).toBe(true);
    expect(result.isCMRA).toBe(false);
    expect(result.isVacant).toBe(false);
    expect(result.dpvMatchCode).toBe('Y');
    expect(result.canonicalAddress).toEqual({
      line1: '123 MAIN ST',
      line2: null,
      city: 'COLUMBUS',
      state: 'OH',
      zipCode: '43215',
      zipPlus4: '1234',
    });
    expect(result.latitude).toBe(39.9612);
    expect(result.longitude).toBe(-82.9988);
  });

  it('returns valid for DPV S (secondary unconfirmed)', async () => {
    const candidate = buildSmartyCandidate({ dpv_match_code: 'S' });
    globalThis.fetch = mockFetchResponse([candidate]);

    const result = await verifySmartyAddress(
      '456 Elm St', 'Apt 2B', 'Columbus', 'OH', '43215',
    );

    expect(result.isValid).toBe(true);
    expect(result.dpvMatchCode).toBe('S');
  });

  it('returns valid=true but flags DPV D (secondary missing but expected)', async () => {
    const candidate = buildSmartyCandidate({ dpv_match_code: 'D' });
    globalThis.fetch = mockFetchResponse([candidate]);

    const result = await verifySmartyAddress(
      '789 Oak Ave', '', 'Columbus', 'OH', '43215',
    );

    // D is "valid but flagged" per artifact 06: isValid should reflect DPV
    // only Y and S are considered valid delivery points
    expect(result.isValid).toBe(false);
    expect(result.dpvMatchCode).toBe('D');
  });

  it('returns invalid for DPV N', async () => {
    const candidate = buildSmartyCandidate({ dpv_match_code: 'N' });
    globalThis.fetch = mockFetchResponse([candidate]);

    const result = await verifySmartyAddress(
      '999 Fake St', '', 'Columbus', 'OH', '43215',
    );

    expect(result.isValid).toBe(false);
    expect(result.dpvMatchCode).toBe('N');
  });

  it('returns invalid with null dpvMatchCode when no candidates', async () => {
    globalThis.fetch = mockFetchResponse([]);

    const result = await verifySmartyAddress(
      'Nowhere St', '', 'Columbus', 'OH', '43215',
    );

    expect(result.isValid).toBe(false);
    expect(result.isOhio).toBe(false);
    expect(result.dpvMatchCode).toBeNull();
    expect(result.canonicalAddress.line1).toBe('Nowhere St');
    expect(result.rawResponse).toEqual({ candidates: [] });
  });

  it('detects non-Ohio addresses', async () => {
    const candidate = buildSmartyCandidate({ state_abbreviation: 'CA' });
    globalThis.fetch = mockFetchResponse([candidate]);

    const result = await verifySmartyAddress(
      '100 Hollywood Blvd', '', 'Los Angeles', 'CA', '90028',
    );

    expect(result.isOhio).toBe(false);
    expect(result.canonicalAddress.state).toBe('CA');
  });

  it('detects commercial addresses', async () => {
    const candidate = buildSmartyCandidate({ rdi: 'Commercial' });
    globalThis.fetch = mockFetchResponse([candidate]);

    const result = await verifySmartyAddress(
      '100 Business Park Dr', '', 'Columbus', 'OH', '43215',
    );

    expect(result.isResidential).toBe(false);
  });

  it('detects CMRA addresses', async () => {
    const candidate = buildSmartyCandidate({ dpv_cmra: 'Y' });
    globalThis.fetch = mockFetchResponse([candidate]);

    const result = await verifySmartyAddress(
      '100 UPS Store', '', 'Columbus', 'OH', '43215',
    );

    expect(result.isCMRA).toBe(true);
  });

  it('detects vacant addresses', async () => {
    const candidate = buildSmartyCandidate({ dpv_vacant: 'Y' });
    globalThis.fetch = mockFetchResponse([candidate]);

    const result = await verifySmartyAddress(
      '100 Empty Lot Rd', '', 'Columbus', 'OH', '43215',
    );

    expect(result.isVacant).toBe(true);
  });

  it('includes delivery_line_2 in canonicalAddress when present', async () => {
    const candidate = buildSmartyCandidate({ delivery_line_2: 'APT 4C' });
    globalThis.fetch = mockFetchResponse([candidate]);

    const result = await verifySmartyAddress(
      '200 High St', 'Apt 4C', 'Columbus', 'OH', '43215',
    );

    expect(result.canonicalAddress.line2).toBe('APT 4C');
  });

  it('throws SmartyApiError on non-2xx response', async () => {
    globalThis.fetch = mockFetchResponse([], 401);

    await expect(
      verifySmartyAddress('123 Main St', '', 'Columbus', 'OH', '43215'),
    ).rejects.toThrow(SmartyApiError);
  });

  it('throws SmartyApiError with status code on API failure', async () => {
    globalThis.fetch = mockFetchResponse([], 429);

    try {
      await verifySmartyAddress('123 Main St', '', 'Columbus', 'OH', '43215');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SmartyApiError);
      expect((error as SmartyApiError).statusCode).toBe(429);
    }
  });

  it('throws SmartyApiError on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      verifySmartyAddress('123 Main St', '', 'Columbus', 'OH', '43215'),
    ).rejects.toThrow(SmartyApiError);
  });

  it('throws SmartyApiError when env vars are missing', async () => {
    vi.stubEnv('SMARTY_AUTH_ID', '');
    vi.stubEnv('SMARTY_AUTH_TOKEN', '');

    await expect(
      verifySmartyAddress('123 Main St', '', 'Columbus', 'OH', '43215'),
    ).rejects.toThrow('Missing SMARTY_AUTH_ID or SMARTY_AUTH_TOKEN');
  });

  it('passes correct query parameters to Smarty API', async () => {
    const fetchSpy = mockFetchResponse([buildSmartyCandidate()]);
    globalThis.fetch = fetchSpy;

    await verifySmartyAddress('123 Main St', 'Apt 2', 'Columbus', 'OH', '43215');

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const url = new URL(calledUrl);

    expect(url.origin + url.pathname).toBe(
      'https://us-street.api.smarty.com/street-address',
    );
    expect(url.searchParams.get('auth-id')).toBe('test-auth-id');
    expect(url.searchParams.get('auth-token')).toBe('test-auth-token');
    expect(url.searchParams.get('street')).toBe('123 Main St');
    expect(url.searchParams.get('secondary')).toBe('Apt 2');
    expect(url.searchParams.get('city')).toBe('Columbus');
    expect(url.searchParams.get('state')).toBe('OH');
    expect(url.searchParams.get('zipcode')).toBe('43215');
    expect(url.searchParams.get('candidates')).toBe('1');
    expect(url.searchParams.get('match')).toBe('strict');
  });
});

// ---------------------------------------------------------------------------
// Tests — MockSmartyAdapter
// ---------------------------------------------------------------------------

describe('MockSmartyAdapter', () => {
  it('returns default valid Ohio residential result', async () => {
    const mock = new MockSmartyAdapter();
    const result = await mock.verifyAddress(
      '123 Main St', '', 'Columbus', 'OH', '43215',
    );

    expect(result.isValid).toBe(true);
    expect(result.isOhio).toBe(true);
    expect(result.isResidential).toBe(true);
    expect(result.dpvMatchCode).toBe('Y');
  });

  it('accepts constructor overrides', async () => {
    const mock = new MockSmartyAdapter({
      isValid: false,
      dpvMatchCode: 'N',
      isOhio: false,
    });
    const result = await mock.verifyAddress(
      '123 Main St', '', 'Columbus', 'OH', '43215',
    );

    expect(result.isValid).toBe(false);
    expect(result.dpvMatchCode).toBe('N');
    expect(result.isOhio).toBe(false);
  });

  it('allows result override via setResult', async () => {
    const mock = new MockSmartyAdapter();

    mock.setResult({ isValid: false, dpvMatchCode: 'D' });
    const result = await mock.verifyAddress(
      '123 Main St', '', 'Columbus', 'OH', '43215',
    );

    expect(result.isValid).toBe(false);
    expect(result.dpvMatchCode).toBe('D');
  });

  it('returns a new object each call (no shared references)', async () => {
    const mock = new MockSmartyAdapter();
    const r1 = await mock.verifyAddress('a', '', 'b', 'OH', '43215');
    const r2 = await mock.verifyAddress('c', '', 'd', 'OH', '43215');

    expect(r1).not.toBe(r2);
    expect(r1).toEqual(r2);
  });
});
