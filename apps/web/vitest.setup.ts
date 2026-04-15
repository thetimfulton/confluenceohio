import { expect } from 'vitest';
import { toHaveNoViolations } from 'vitest-axe/matchers';

expect.extend({ toHaveNoViolations });

// Mock window.matchMedia for useReducedMotion and other media query hooks.
// jsdom does not implement matchMedia.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
