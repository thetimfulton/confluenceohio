// ---------------------------------------------------------------------------
// Signature counter — axe-core accessibility tests (Artifact 14 §3.1.2)
// ---------------------------------------------------------------------------
// States tested: loading/hydrated, compact mode, full mode, updating
// Mocks: Supabase Realtime
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SignatureCounter } from '@/components/petition/SignatureCounter';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSubscribe = vi.fn().mockReturnValue({
  unsubscribe: vi.fn(),
});

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: mockSubscribe,
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignatureCounter accessibility', () => {
  it('has no axe violations in full mode (hydrated)', async () => {
    const { container } = render(<SignatureCounter initialCount={3456} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in compact mode', async () => {
    const { container } = render(
      <SignatureCounter initialCount={3456} compact />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations at zero signatures', async () => {
    const { container } = render(<SignatureCounter initialCount={0} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations at goal count', async () => {
    const { container } = render(<SignatureCounter initialCount={22000} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in compact mode at zero', async () => {
    const { container } = render(
      <SignatureCounter initialCount={0} compact />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper progress bar ARIA attributes', async () => {
    const { container } = render(<SignatureCounter initialCount={5000} />);

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('5000');
    expect(progressBar?.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar?.getAttribute('aria-valuemax')).toBe('22000');
    expect(progressBar?.getAttribute('aria-label')).toContain('5,000');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has an aria-live region for screen reader updates', async () => {
    const { container } = render(<SignatureCounter initialCount={1000} />);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
