import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  generateAddressHash,
  generateEmailHash,
  generateIpHash,
  generateReferralCode,
  generateVerificationToken,
} from '../dedup.js';

// ---------------------------------------------------------------------------
// generateAddressHash
// ---------------------------------------------------------------------------

describe('generateAddressHash', () => {
  const baseAddress = {
    line1: '123 Main St',
    line2: null,
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
  };

  it('produces a deterministic SHA-256 hex string', () => {
    const hash1 = generateAddressHash(baseAddress);
    const hash2 = generateAddressHash(baseAddress);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is case insensitive', () => {
    const lower = generateAddressHash({
      ...baseAddress,
      line1: '123 main st',
      city: 'columbus',
      state: 'oh',
    });
    const upper = generateAddressHash({
      ...baseAddress,
      line1: '123 MAIN ST',
      city: 'COLUMBUS',
      state: 'OH',
    });
    expect(lower).toBe(upper);
  });

  it('normalizes whitespace', () => {
    const padded = generateAddressHash({
      ...baseAddress,
      line1: '  123 Main St  ',
      city: '  Columbus  ',
    });
    const trimmed = generateAddressHash(baseAddress);
    expect(padded).toBe(trimmed);
  });

  it('treats null and empty string line2 identically', () => {
    const withNull = generateAddressHash({ ...baseAddress, line2: null });
    const withEmpty = generateAddressHash({ ...baseAddress, line2: '' });
    expect(withNull).toBe(withEmpty);
  });

  it('produces different hashes for different addresses', () => {
    const other = generateAddressHash({
      ...baseAddress,
      line1: '456 Elm Ave',
    });
    expect(other).not.toBe(generateAddressHash(baseAddress));
  });

  it('produces different hashes when line2 differs', () => {
    const withApt = generateAddressHash({
      ...baseAddress,
      line2: 'Apt 4B',
    });
    expect(withApt).not.toBe(generateAddressHash(baseAddress));
  });
});

// ---------------------------------------------------------------------------
// generateEmailHash
// ---------------------------------------------------------------------------

describe('generateEmailHash', () => {
  it('produces a deterministic SHA-256 hex string', () => {
    const hash1 = generateEmailHash('voter@example.com');
    const hash2 = generateEmailHash('voter@example.com');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is case insensitive', () => {
    expect(generateEmailHash('Voter@Example.COM')).toBe(
      generateEmailHash('voter@example.com'),
    );
  });

  it('trims whitespace', () => {
    expect(generateEmailHash('  voter@example.com  ')).toBe(
      generateEmailHash('voter@example.com'),
    );
  });

  it('produces different hashes for different emails', () => {
    expect(generateEmailHash('a@example.com')).not.toBe(
      generateEmailHash('b@example.com'),
    );
  });
});

// ---------------------------------------------------------------------------
// generateIpHash
// ---------------------------------------------------------------------------

describe('generateIpHash', () => {
  it('produces a deterministic SHA-256 hex string', () => {
    const hash1 = generateIpHash('192.168.1.1', 'test-salt');
    const hash2 = generateIpHash('192.168.1.1', 'test-salt');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes with different salts', () => {
    expect(generateIpHash('192.168.1.1', 'salt-a')).not.toBe(
      generateIpHash('192.168.1.1', 'salt-b'),
    );
  });

  it('produces different hashes for different IPs', () => {
    expect(generateIpHash('10.0.0.1', 'salt')).not.toBe(
      generateIpHash('10.0.0.2', 'salt'),
    );
  });
});

// ---------------------------------------------------------------------------
// generateReferralCode
// ---------------------------------------------------------------------------

describe('generateReferralCode', () => {
  it('matches the CONF-XXXX pattern', () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^CONF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
  });

  it('never contains ambiguous characters (0, O, 1, I, L)', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateReferralCode();
      const suffix = code.slice(5);
      expect(suffix).not.toMatch(/[01OIL]/);
    }
  });

  it('generates unique codes over 10,000 iterations', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      codes.add(generateReferralCode());
    }
    // With a 30-char alphabet and 4-char suffix there are 810,000 combinations.
    // 10K draws should yield very few collisions — expect at least 9,900 unique.
    expect(codes.size).toBeGreaterThanOrEqual(9_900);
  });
});

// ---------------------------------------------------------------------------
// generateVerificationToken
// ---------------------------------------------------------------------------

describe('generateVerificationToken', () => {
  it('returns a rawToken and tokenHash', () => {
    const { rawToken, tokenHash } = generateVerificationToken();
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('tokenHash is the SHA-256 of rawToken', () => {
    const { rawToken, tokenHash } = generateVerificationToken();
    const expected = createHash('sha256').update(rawToken).digest('hex');
    expect(tokenHash).toBe(expected);
  });

  it('tokenHash does not equal rawToken', () => {
    const { rawToken, tokenHash } = generateVerificationToken();
    expect(tokenHash).not.toBe(rawToken);
  });

  it('generates unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateVerificationToken().rawToken);
    }
    expect(tokens.size).toBe(100);
  });
});
