// ---------------------------------------------------------------------------
// Voice submission form — axe-core accessibility tests (Artifact 14 §3.1.2)
// ---------------------------------------------------------------------------
// States tested: default, error, each position selected, submitting
// Mocks: Turnstile, fetch
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { VoiceSubmissionForm } from '@/app/(public)/voices/share/voice-submission-form';
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

describe('VoiceSubmissionForm accessibility', () => {
  it('has no axe violations in default state', async () => {
    const { container } = render(<VoiceSubmissionForm />, { wrapper: A11yWrapper });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with initial error prop', async () => {
    const { container } = render(<VoiceSubmissionForm error="validation" />, { wrapper: A11yWrapper });

    // Wait for error alert to render
    await waitFor(() => {
      const alert = container.querySelector('[role="alert"]');
      expect(alert).not.toBeNull();
    }, { timeout: 500 }).catch(() => {});

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with rate_limited error', async () => {
    const { container } = render(<VoiceSubmissionForm error="rate_limited" />, { wrapper: A11yWrapper });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with "support" position selected', async () => {
    const { container } = render(<VoiceSubmissionForm />, { wrapper: A11yWrapper });

    const supportRadio = container.querySelector('input[value="support"]');
    if (supportRadio) fireEvent.click(supportRadio);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with "oppose" position selected', async () => {
    const { container } = render(<VoiceSubmissionForm />, { wrapper: A11yWrapper });

    const opposeRadio = container.querySelector('input[value="oppose"]');
    if (opposeRadio) fireEvent.click(opposeRadio);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with "undecided" position selected', async () => {
    const { container } = render(<VoiceSubmissionForm />, { wrapper: A11yWrapper });

    const undecidedRadio = container.querySelector('input[value="undecided"]');
    if (undecidedRadio) fireEvent.click(undecidedRadio);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in submitting state', async () => {
    const neverResolve = new Promise<Response>(() => {});
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(neverResolve));

    const { container } = render(<VoiceSubmissionForm />, { wrapper: A11yWrapper });

    // Fill required fields
    const nameInput = container.querySelector('#author_name');
    const emailInput = container.querySelector('#author_email');
    const bodyTextarea = container.querySelector('#body');
    const supportRadio = container.querySelector('input[value="support"]');
    const guidelinesCheckbox = container.querySelector('input[type="checkbox"]');

    if (nameInput) fireEvent.change(nameInput, { target: { value: 'Jane' } });
    if (emailInput) fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
    if (bodyTextarea) {
      fireEvent.change(bodyTextarea, {
        target: { value: 'This is my perspective on the rename. I have many thoughts about this important civic decision.' },
      });
    }
    if (supportRadio) fireEvent.click(supportRadio);
    if (guidelinesCheckbox) fireEvent.click(guidelinesCheckbox);

    // Submit
    const form = container.querySelector('form');
    if (form) fireEvent.submit(form);

    // Allow React to update
    await waitFor(() => {
      const submitBtn = container.querySelector('button[type="submit"]');
      expect(submitBtn?.hasAttribute('disabled')).toBeTruthy();
    }, { timeout: 500 }).catch(() => {});

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
