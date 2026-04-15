import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from '@testing-library/react';
import { SkipLink } from '../SkipLink';
import { VisuallyHidden } from '../VisuallyHidden';
import { FocusTrap } from '../FocusTrap';
import { useReducedMotion } from '../ReducedMotion';
import { AnnouncerProvider, useAnnouncer } from '../ErrorAnnouncer';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// SkipLink
// ---------------------------------------------------------------------------

describe('SkipLink', () => {
  it('renders with default text and href', () => {
    const { container } = render(<SkipLink />);
    const link = container.querySelector('a')!;
    expect(link).not.toBeNull();
    expect(link.textContent).toBe('Skip to content');
    expect(link.getAttribute('href')).toBe('#main-content');
  });

  it('renders with custom target and text', () => {
    const { container } = render(
      <SkipLink targetId="petition-form">Skip to form</SkipLink>,
    );
    const link = container.querySelector('a')!;
    expect(link.textContent).toBe('Skip to form');
    expect(link.getAttribute('href')).toBe('#petition-form');
  });

  it('has sr-only class for visual hiding', () => {
    const { container } = render(<SkipLink />);
    const link = container.querySelector('a')!;
    expect(link.className).toContain('sr-only');
  });

  it('is focusable', () => {
    const { container } = render(<SkipLink />);
    const link = container.querySelector('a')!;
    link.focus();
    expect(document.activeElement).toBe(link);
  });

  it('moves focus to target on click', () => {
    const target = document.createElement('main');
    target.id = 'main-content';
    document.body.appendChild(target);

    const { container } = render(<SkipLink />);
    const link = container.querySelector('a')!;

    fireEvent.click(link);

    expect(target.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(target);

    // Verify tabindex removed on blur
    fireEvent.blur(target);
    expect(target.getAttribute('tabindex')).toBeNull();

    document.body.removeChild(target);
  });

  it('moves focus to target on Enter (click handler)', () => {
    const target = document.createElement('main');
    target.id = 'main-content';
    document.body.appendChild(target);

    const { container } = render(<SkipLink />);
    const link = container.querySelector('a')!;

    fireEvent.click(link);
    expect(document.activeElement).toBe(target);

    document.body.removeChild(target);
  });
});

// ---------------------------------------------------------------------------
// VisuallyHidden
// ---------------------------------------------------------------------------

describe('VisuallyHidden', () => {
  it('renders with sr-only class', () => {
    const { container } = render(
      <VisuallyHidden>Hidden text</VisuallyHidden>,
    );
    const el = container.firstElementChild!;
    expect(el.className).toBe('sr-only');
    expect(el.textContent).toBe('Hidden text');
  });

  it('renders as span by default', () => {
    const { container } = render(
      <VisuallyHidden>Hidden text</VisuallyHidden>,
    );
    expect(container.firstElementChild!.tagName).toBe('SPAN');
  });

  it('supports the as prop for h2', () => {
    const { container } = render(
      <VisuallyHidden as="h2">Hidden heading</VisuallyHidden>,
    );
    const el = container.firstElementChild!;
    expect(el.tagName).toBe('H2');
    expect(el.className).toBe('sr-only');
  });

  it('supports the as prop for div', () => {
    const { container } = render(
      <VisuallyHidden as="div">Hidden div</VisuallyHidden>,
    );
    expect(container.firstElementChild!.tagName).toBe('DIV');
  });
});

// ---------------------------------------------------------------------------
// FocusTrap
// ---------------------------------------------------------------------------

describe('FocusTrap', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    const { container } = render(
      <FocusTrap active={false}>
        <button>Click me</button>
      </FocusTrap>,
    );
    expect(container.querySelector('button')!.textContent).toBe('Click me');
  });

  it('auto-focuses the first focusable element when active', async () => {
    const { container } = render(
      <FocusTrap active={true}>
        <button>First</button>
        <button>Second</button>
      </FocusTrap>,
    );

    await vi.advanceTimersByTimeAsync(16);

    const buttons = container.querySelectorAll('button');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('does not auto-focus when autoFocus is false', async () => {
    const { container } = render(
      <FocusTrap active={true} autoFocus={false}>
        <button>First</button>
      </FocusTrap>,
    );

    await vi.advanceTimersByTimeAsync(16);

    const btn = container.querySelector('button')!;
    expect(document.activeElement).not.toBe(btn);
  });

  it('wraps Tab from last to first element', async () => {
    const { container } = render(
      <FocusTrap active={true}>
        <button>First</button>
        <button>Second</button>
      </FocusTrap>,
    );

    await vi.advanceTimersByTimeAsync(16);

    const buttons = container.querySelectorAll('button');
    // Focus last button
    buttons[1].focus();
    expect(document.activeElement).toBe(buttons[1]);

    // Tab on last element should wrap to first
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('wraps Shift+Tab from first to last element', async () => {
    const { container } = render(
      <FocusTrap active={true}>
        <button>First</button>
        <button>Second</button>
      </FocusTrap>,
    );

    await vi.advanceTimersByTimeAsync(16);

    const buttons = container.querySelectorAll('button');
    // Should be on first
    expect(document.activeElement).toBe(buttons[0]);

    // Shift+Tab on first should wrap to last
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('calls onEscape when Escape is pressed', async () => {
    const onEscape = vi.fn();
    render(
      <FocusTrap active={true} onEscape={onEscape}>
        <button>Inside</button>
      </FocusTrap>,
    );

    await vi.advanceTimersByTimeAsync(16);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('returns focus to previously focused element on deactivation', async () => {
    const outerButton = document.createElement('button');
    outerButton.textContent = 'Outer';
    document.body.appendChild(outerButton);
    outerButton.focus();
    expect(document.activeElement).toBe(outerButton);

    const { container, rerender } = render(
      <FocusTrap active={true}>
        <button>Inner</button>
      </FocusTrap>,
    );

    await vi.advanceTimersByTimeAsync(16);

    const innerBtn = container.querySelector('button')!;
    expect(document.activeElement).toBe(innerBtn);

    // Deactivate the trap
    rerender(
      <FocusTrap active={false}>
        <button>Inner</button>
      </FocusTrap>,
    );

    expect(document.activeElement).toBe(outerButton);

    document.body.removeChild(outerButton);
  });

  it('does not trap focus when inactive', () => {
    render(
      <FocusTrap active={false}>
        <button>Inside</button>
      </FocusTrap>,
    );

    // No keydown handler should be registered when inactive,
    // so this is a no-op. Just verify no error.
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Tab' });
  });
});

// ---------------------------------------------------------------------------
// useReducedMotion
// ---------------------------------------------------------------------------

describe('useReducedMotion', () => {
  let listeners: Array<(e: { matches: boolean }) => void>;
  let matchesMock: boolean;

  beforeEach(() => {
    listeners = [];
    matchesMock = false;

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: matchesMock,
        media: query,
        addEventListener: (
          _event: string,
          handler: (e: { matches: boolean }) => void,
        ) => {
          listeners.push(handler);
        },
        removeEventListener: (
          _event: string,
          handler: (e: { matches: boolean }) => void,
        ) => {
          listeners = listeners.filter((l) => l !== handler);
        },
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function TestComponent() {
    const reduced = useReducedMotion();
    return <div data-testid="rm-result">{reduced ? 'true' : 'false'}</div>;
  }

  it('returns false by default', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('rm-result').textContent).toBe('false');
  });

  it('returns true when media query matches', () => {
    matchesMock = true;
    render(<TestComponent />);
    expect(screen.getByTestId('rm-result').textContent).toBe('true');
  });

  it('responds to media query changes', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('rm-result').textContent).toBe('false');

    act(() => {
      for (const listener of listeners) {
        listener({ matches: true });
      }
    });

    expect(screen.getByTestId('rm-result').textContent).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// ErrorAnnouncer
// ---------------------------------------------------------------------------

describe('ErrorAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestConsumer() {
    const { announce } = useAnnouncer();
    return (
      <div>
        <button onClick={() => announce('Status update', 'polite')}>
          Announce polite
        </button>
        <button onClick={() => announce('Error occurred', 'assertive')}>
          Announce assertive
        </button>
      </div>
    );
  }

  it('renders aria-live regions with correct roles', () => {
    const { container } = render(
      <AnnouncerProvider>
        <div>App</div>
      </AnnouncerProvider>,
    );

    const politeRegion = container.querySelector('[aria-live="polite"]');
    const assertiveRegion = container.querySelector('[aria-live="assertive"]');

    expect(politeRegion).not.toBeNull();
    expect(assertiveRegion).not.toBeNull();
    expect(politeRegion!.getAttribute('role')).toBe('status');
    expect(assertiveRegion!.getAttribute('role')).toBe('alert');
  });

  it('both regions have sr-only class', () => {
    const { container } = render(
      <AnnouncerProvider>
        <div>App</div>
      </AnnouncerProvider>,
    );

    const politeRegion = container.querySelector('[aria-live="polite"]');
    const assertiveRegion = container.querySelector('[aria-live="assertive"]');

    expect(politeRegion!.className).toContain('sr-only');
    expect(assertiveRegion!.className).toContain('sr-only');
  });

  it('announce() sets text in the polite region', async () => {
    const { container } = render(
      <AnnouncerProvider>
        <TestConsumer />
      </AnnouncerProvider>,
    );

    const btn = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(btn); // first button = polite

    // Advance past the 50ms setTimeout and flush React state updates
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const politeRegion = container.querySelector('[aria-live="polite"]');
    expect(politeRegion!.textContent).toBe('Status update');
  });

  it('announce() sets text in the assertive region', async () => {
    const { container } = render(
      <AnnouncerProvider>
        <TestConsumer />
      </AnnouncerProvider>,
    );

    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[1]); // second button = assertive

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const assertiveRegion = container.querySelector('[aria-live="assertive"]');
    expect(assertiveRegion!.textContent).toBe('Error occurred');
  });

  it('throws when useAnnouncer is used outside provider', () => {
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    function BadConsumer() {
      useAnnouncer();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useAnnouncer must be used within an <AnnouncerProvider>',
    );

    consoleSpy.mockRestore();
  });
});
