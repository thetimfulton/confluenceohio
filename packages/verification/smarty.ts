// ---------------------------------------------------------------------------
// Smarty US Street Address API — Verification Adapter
// ---------------------------------------------------------------------------
// Hexagonal architecture: this adapter implements SmartyVerificationPort.
// Domain logic in packages/core depends on the port interface, not this file.
// See Artifact 06 §3.6 for the full specification.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Smarty-normalized canonical address fields. */
export interface SmartyCanonicalAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zipCode: string;
  zipPlus4: string | null;
}

/**
 * DPV (Delivery Point Validation) match codes returned by Smarty.
 *
 * - `Y` — Confirmed: primary + secondary match
 * - `S` — Primary confirmed, secondary present but unconfirmed
 * - `D` — Primary confirmed, secondary missing but expected
 * - `N` — Not confirmed
 * - `null` — No candidates returned
 */
export type DpvMatchCode = 'Y' | 'S' | 'D' | 'N' | null;

/** Structured result from Smarty US Street Address API verification. */
export interface SmartyVerificationResult {
  /** Whether the address is a confirmed delivery point (DPV Y or S). */
  isValid: boolean;
  /** Whether the address is in Ohio. */
  isOhio: boolean;
  /** Whether the address is residential (vs. commercial). */
  isResidential: boolean;
  /** Whether the address is a Commercial Mail Receiving Agency (e.g., UPS Store). */
  isCMRA: boolean;
  /** Whether the address is flagged as vacant. */
  isVacant: boolean;
  /** DPV match code from Smarty analysis. */
  dpvMatchCode: DpvMatchCode;
  /** Smarty-normalized canonical address. */
  canonicalAddress: SmartyCanonicalAddress;
  /** Latitude from Smarty metadata, or null if unavailable. */
  latitude: number | null;
  /** Longitude from Smarty metadata, or null if unavailable. */
  longitude: number | null;
  /** Full Smarty API response for debugging/audit. */
  rawResponse: unknown;
}

// ---------------------------------------------------------------------------
// Port (interface for dependency injection / hexagonal architecture)
// ---------------------------------------------------------------------------

/**
 * Port interface for address verification.
 *
 * Domain logic in packages/core depends on this interface.
 * The live Smarty adapter and the mock adapter both implement it.
 */
export interface SmartyVerificationPort {
  verifyAddress(
    street: string,
    secondary: string,
    city: string,
    state: string,
    zipCode: string,
  ): Promise<SmartyVerificationResult>;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

/** Custom error for Smarty API failures (network errors, non-2xx responses). */
export class SmartyApiError extends Error {
  public readonly statusCode: number | undefined;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'SmartyApiError';
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Live adapter
// ---------------------------------------------------------------------------

const SMARTY_US_STREET_URL = 'https://us-street.api.smarty.com/street-address';

/**
 * Build a "no candidates" result for when Smarty returns an empty array.
 * Preserves the user-supplied address as-is since there's no normalized form.
 */
function buildNoCandidatesResult(
  street: string,
  secondary: string,
  city: string,
  state: string,
  zipCode: string,
): SmartyVerificationResult {
  return {
    isValid: false,
    isOhio: false,
    isResidential: false,
    isCMRA: false,
    isVacant: false,
    dpvMatchCode: null,
    canonicalAddress: {
      line1: street,
      line2: secondary || null,
      city,
      state,
      zipCode,
      zipPlus4: null,
    },
    latitude: null,
    longitude: null,
    rawResponse: { candidates: [] },
  };
}

/**
 * Verify a US street address against the Smarty US Street API.
 *
 * Requires `SMARTY_AUTH_ID` and `SMARTY_AUTH_TOKEN` environment variables.
 * These are **secret** server-side credentials — never expose them to the client.
 *
 * @throws {SmartyApiError} on network errors or non-2xx responses
 */
export async function verifySmartyAddress(
  street: string,
  secondary: string,
  city: string,
  state: string,
  zipCode: string,
): Promise<SmartyVerificationResult> {
  const authId = process.env.SMARTY_AUTH_ID;
  const authToken = process.env.SMARTY_AUTH_TOKEN;

  if (!authId || !authToken) {
    throw new SmartyApiError(
      'Missing SMARTY_AUTH_ID or SMARTY_AUTH_TOKEN environment variables',
    );
  }

  const params = new URLSearchParams({
    'auth-id': authId,
    'auth-token': authToken,
    street,
    secondary,
    city,
    state,
    zipcode: zipCode,
    candidates: '1',
    match: 'strict',
  });

  let response: Response;
  try {
    response = await fetch(`${SMARTY_US_STREET_URL}?${params}`, {
      method: 'GET',
    });
  } catch (error) {
    throw new SmartyApiError(
      `Smarty API network error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new SmartyApiError(
      `Smarty API returned ${response.status}: ${response.statusText}`,
      response.status,
    );
  }

  const candidates: unknown[] = await response.json();

  if (candidates.length === 0) {
    return buildNoCandidatesResult(street, secondary, city, state, zipCode);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Smarty API response shape
  const candidate = candidates[0] as any;
  const { components, metadata, analysis } = candidate;

  const dpvMatchCode: DpvMatchCode = analysis.dpv_match_code ?? null;

  return {
    isValid: dpvMatchCode === 'Y' || dpvMatchCode === 'S',
    isOhio: components.state_abbreviation === 'OH',
    isResidential: metadata.rdi === 'Residential',
    isCMRA: analysis.dpv_cmra === 'Y',
    isVacant: analysis.dpv_vacant === 'Y',
    dpvMatchCode,
    canonicalAddress: {
      line1: candidate.delivery_line_1,
      line2: candidate.delivery_line_2 || null,
      city: components.city_name,
      state: components.state_abbreviation,
      zipCode: components.zipcode,
      zipPlus4: components.plus4_code || null,
    },
    latitude: metadata.latitude ?? null,
    longitude: metadata.longitude ?? null,
    rawResponse: candidate,
  };
}

// ---------------------------------------------------------------------------
// Mock adapter (for testing)
// ---------------------------------------------------------------------------

/**
 * Mock implementation of SmartyVerificationPort.
 *
 * Returns configurable results for testing without hitting the Smarty API.
 * By default returns a valid, residential Ohio address.
 *
 * @example
 * ```ts
 * const mock = new MockSmartyAdapter();
 * const result = await mock.verifyAddress('123 Main St', '', 'Columbus', 'OH', '43215');
 * assert(result.isValid === true);
 *
 * // Override for a specific test
 * mock.setResult({ isValid: false, dpvMatchCode: 'N' });
 * ```
 */
export class MockSmartyAdapter implements SmartyVerificationPort {
  private result: SmartyVerificationResult;

  constructor(overrides?: Partial<SmartyVerificationResult>) {
    this.result = {
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

  /** Replace the result returned by all future calls. */
  setResult(overrides: Partial<SmartyVerificationResult>): void {
    this.result = { ...this.result, ...overrides };
  }

  async verifyAddress(
    _street: string,
    _secondary: string,
    _city: string,
    _state: string,
    _zipCode: string,
  ): Promise<SmartyVerificationResult> {
    return { ...this.result };
  }
}
