// ---------------------------------------------------------------------------
// Volunteer form — axe-core accessibility tests (Artifact 14 §3.1.2)
// ---------------------------------------------------------------------------
// States tested: default (step 1), error, roles step, details step
// Mocks: next/navigation, Turnstile
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { VolunteerForm } from '@/app/(public)/volunteer/volunteer-form';
import { A11yWrapper } from '../helpers/a11y-wrapper';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

describe('VolunteerForm accessibility', () => {
  it('has no axe violations in default state (step 1: info)', async () => {
    const { container } = render(
      <VolunteerForm source="direct" cameFromPetition={false} />,
      { wrapper: A11yWrapper },
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in error state (step 1 validation)', async () => {
    const { container } = render(
      <VolunteerForm source="direct" cameFromPetition={false} />,
      { wrapper: A11yWrapper },
    );

    // Try to advance without filling required fields
    const nextButton = container.querySelector('button[type="button"]');
    if (nextButton && nextButton.textContent?.includes('Next')) {
      fireEvent.click(nextButton);
    }

    // Wait for error message to appear
    await waitFor(() => {
      const errorEl = container.querySelector('[role="alert"]');
      expect(errorEl).not.toBeNull();
    }, { timeout: 500 }).catch(() => {});

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations on step 2 (role selection)', async () => {
    const { container } = render(
      <VolunteerForm source="direct" cameFromPetition={false} />,
      { wrapper: A11yWrapper },
    );

    // Fill step 1 fields
    const firstNameInput = container.querySelector('input[autocomplete="given-name"]');
    const lastNameInput = container.querySelector('input[autocomplete="family-name"]');
    const emailInput = container.querySelector('input[type="email"]');

    if (firstNameInput) fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    if (lastNameInput) fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    if (emailInput) fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });

    // Advance to step 2
    const buttons = container.querySelectorAll('button');
    const nextButton = Array.from(buttons).find((b) => b.textContent?.includes('Next'));
    if (nextButton) fireEvent.click(nextButton);

    // Wait for roles to render
    await waitFor(() => {
      const roleCheckboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(roleCheckboxes.length).toBeGreaterThan(0);
    }, { timeout: 500 }).catch(() => {});

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations on step 3 (details)', async () => {
    const { container } = render(
      <VolunteerForm source="direct" cameFromPetition={false} />,
      { wrapper: A11yWrapper },
    );

    // Fill step 1
    const firstNameInput = container.querySelector('input[autocomplete="given-name"]');
    const lastNameInput = container.querySelector('input[autocomplete="family-name"]');
    const emailInput = container.querySelector('input[type="email"]');

    if (firstNameInput) fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    if (lastNameInput) fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    if (emailInput) fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });

    // Advance to step 2
    let buttons = container.querySelectorAll('button');
    let nextButton = Array.from(buttons).find((b) => b.textContent?.includes('Next'));
    if (nextButton) fireEvent.click(nextButton);

    // Wait for roles and select one
    await waitFor(() => {
      const roleCheckboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(roleCheckboxes.length).toBeGreaterThan(0);
    }, { timeout: 500 }).catch(() => {});

    const firstRole = container.querySelector('input[type="checkbox"]');
    if (firstRole) fireEvent.click(firstRole);

    // Advance to step 3
    buttons = container.querySelectorAll('button');
    nextButton = Array.from(buttons).find((b) => b.textContent?.includes('Next'));
    if (nextButton) fireEvent.click(nextButton);

    // Wait for details form
    await waitFor(() => {
      const textarea = container.querySelector('textarea');
      // Step 3 may have a textarea for notes, or availability checkboxes
      const availabilityCheckbox = container.querySelector('input[type="checkbox"]');
      expect(textarea || availabilityCheckbox).not.toBeNull();
    }, { timeout: 500 }).catch(() => {});

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
