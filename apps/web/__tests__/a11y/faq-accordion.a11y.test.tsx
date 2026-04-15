// ---------------------------------------------------------------------------
// FAQ accordion — axe-core accessibility tests (Artifact 14 §3.1.2)
// ---------------------------------------------------------------------------
// States tested: all collapsed, one expanded, all expanded
// No external dependencies to mock — pure React component
// ---------------------------------------------------------------------------

import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { FAQAccordion } from '@/components/shared/FAQAccordion';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const TEST_GROUPS = [
  {
    title: 'About the Campaign',
    items: [
      {
        question: 'Why rename Columbus?',
        answer:
          'The campaign proposes renaming the city to reflect its geographic and cultural identity at the confluence of two rivers.',
      },
      {
        question: 'How would a rename work legally?',
        answer:
          'Ohio law provides a charter amendment process that allows residents to vote on a city name change.',
      },
    ],
  },
  {
    title: 'Getting Involved',
    items: [
      {
        question: 'How can I volunteer?',
        answer:
          'Visit our volunteer page to sign up for roles including signature collecting, social amplification, and neighborhood captaincy.',
      },
    ],
  },
];

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FAQAccordion accessibility', () => {
  it('has no axe violations with all items collapsed', async () => {
    const { container } = render(<FAQAccordion groups={TEST_GROUPS} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with one item expanded', async () => {
    const { container } = render(<FAQAccordion groups={TEST_GROUPS} />);

    // Click the first question to expand it
    const firstButton = container.querySelector('button[aria-expanded]');
    if (firstButton) fireEvent.click(firstButton);

    // Verify it expanded
    expect(firstButton?.getAttribute('aria-expanded')).toBe('true');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with all items expanded', async () => {
    const { container } = render(<FAQAccordion groups={TEST_GROUPS} />);

    // Click all accordion buttons to expand
    const buttons = container.querySelectorAll('button[aria-expanded]');
    buttons.forEach((button) => fireEvent.click(button));

    // Verify all expanded
    buttons.forEach((button) => {
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with single group', async () => {
    const { container } = render(
      <FAQAccordion groups={[TEST_GROUPS[0]]} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations after toggling items open and closed', async () => {
    const { container } = render(<FAQAccordion groups={TEST_GROUPS} />);

    // Open first, then close it
    const firstButton = container.querySelector('button[aria-expanded]');
    if (firstButton) {
      fireEvent.click(firstButton); // open
      fireEvent.click(firstButton); // close
    }

    expect(firstButton?.getAttribute('aria-expanded')).toBe('false');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
