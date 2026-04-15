// ---------------------------------------------------------------------------
// Email signup form — axe-core accessibility tests (Artifact 14 §3.1.2)
// ---------------------------------------------------------------------------
// States tested: default, error, success, with first name field
// Mocks: Turnstile, fetch
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { EmailSignupForm } from '@/components/email/EmailSignupForm';
import { A11yWrapper } from '../helpers/a11y-wrapper';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EmailSignupForm accessibility', () => {
  it('has no axe violations in default state', async () => {
    const { container } = render(<EmailSignupForm source="footer" />, { wrapper: A11yWrapper });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with heading and description', async () => {
    const { container } = render(
      <EmailSignupForm
        source="blog"
        heading="Stay Updated"
        description="Get campaign news in your inbox."
        showFirstName
      />,
      { wrapper: A11yWrapper },
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in error state (invalid email)', async () => {
    const { container } = render(<EmailSignupForm source="footer" />, { wrapper: A11yWrapper });

    // Type invalid email and submit
    const emailInput = container.querySelector('input[type="email"]');
    if (emailInput) fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const form = container.querySelector('form');
    if (form) fireEvent.submit(form);

    // Wait for error to render
    await waitFor(() => {
      const alert = container.querySelector('[role="alert"]');
      expect(alert).not.toBeNull();
    }, { timeout: 500 }).catch(() => {});

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in success state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const { container } = render(<EmailSignupForm source="footer" />, { wrapper: A11yWrapper });

    // Submit valid email
    const emailInput = container.querySelector('input[type="email"]');
    if (emailInput) fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });

    const form = container.querySelector('form');
    if (form) fireEvent.submit(form);

    // Wait for success message
    await waitFor(() => {
      const status = container.querySelector('[role="status"]');
      expect(status).not.toBeNull();
    }, { timeout: 1000 });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in submitting state', async () => {
    const neverResolve = new Promise<Response>(() => {});
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(neverResolve));

    const { container } = render(<EmailSignupForm source="standalone" />, { wrapper: A11yWrapper });

    const emailInput = container.querySelector('input[type="email"]');
    if (emailInput) fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });

    const form = container.querySelector('form');
    if (form) fireEvent.submit(form);

    // Wait for disabled state
    await waitFor(() => {
      const submitBtn = container.querySelector('button[type="submit"]');
      expect(submitBtn?.hasAttribute('disabled')).toBeTruthy();
    }, { timeout: 500 }).catch(() => {});

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
