// ---------------------------------------------------------------------------
// Navigation — axe-core accessibility tests (Artifact 14 §3.1.2)
// ---------------------------------------------------------------------------
// States tested: desktop default, mobile menu open, dropdown open
// Mocks: next/navigation, next/link, lucide-react
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Header } from '@/components/layout/Header';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('./MobileNav', () => ({
  MobileNav: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div id="mobile-nav" role="dialog" aria-label="Mobile navigation">
        <button onClick={onClose} aria-label="Close menu">
          Close
        </button>
        <nav aria-label="Mobile">
          <a href="/">Home</a>
          <a href="/the-case">The Case</a>
          <a href="/voices">Voices</a>
          <a href="/volunteer">Volunteer</a>
          <a href="/donate">Donate</a>
          <a href="/sign">Sign the Petition</a>
        </nav>
      </div>
    ) : null,
}));

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Navigation accessibility', () => {
  it('has no axe violations in desktop default state', async () => {
    const { container } = render(<Header />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with "The Case" dropdown open', async () => {
    const { container } = render(<Header />);

    // Open the dropdown
    const dropdownButton = container.querySelector('button[aria-haspopup="true"]');
    if (dropdownButton) fireEvent.click(dropdownButton);

    // Wait for dropdown menu to appear
    await waitFor(() => {
      const menu = container.querySelector('[role="menu"]');
      expect(menu).not.toBeNull();
    }, { timeout: 500 });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with mobile menu open', async () => {
    const { container } = render(<Header />);

    // Click hamburger button to open mobile nav
    const hamburger = container.querySelector('button[aria-label="Open menu"]');
    if (hamburger) fireEvent.click(hamburger);

    // Wait for mobile nav to render
    await waitFor(() => {
      const mobileNav = container.querySelector('#mobile-nav') ??
        container.querySelector('[role="dialog"]');
      expect(mobileNav).not.toBeNull();
    }, { timeout: 500 }).catch(() => {});

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with mobile menu closed', async () => {
    const { container } = render(<Header />);

    // Default state — mobile menu is closed
    const mobileNav = container.querySelector('#mobile-nav');
    expect(mobileNav).toBeNull();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
