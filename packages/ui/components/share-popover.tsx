'use client';

/**
 * Share popover — dropdown variant of ShareButtons for inline use.
 *
 * Used on blog posts and voice cards where a full button row is too heavy.
 * Renders a trigger button that toggles a popover with the share options.
 * Focus is trapped inside when open; Escape or outside click closes it.
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { ShareButtons, type ShareButtonsProps } from './share-buttons';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SharePopoverProps extends Omit<ShareButtonsProps, 'layout'> {
  /** Custom trigger label (defaults to "Share") */
  triggerLabel?: ReactNode;
  /** Position of the popover relative to the trigger */
  position?: 'bottom-start' | 'bottom-end';
  /** Additional CSS classes for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Focus trap helper
// ---------------------------------------------------------------------------

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus first element on open
    first.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, active]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SharePopover({
  triggerLabel,
  position = 'bottom-start',
  className,
  ...shareProps
}: SharePopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(containerRef, open);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    // Delay to avoid the toggle click immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const iconSize =
    shareProps.size === 'sm'
      ? 'h-4 w-4'
      : shareProps.size === 'lg'
        ? 'h-6 w-6'
        : 'h-5 w-5';

  return (
    <div className={['relative inline-block', className].filter(Boolean).join(' ')}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        className={[
          'inline-flex items-center gap-2 rounded-lg border border-gray-300',
          'bg-white font-medium text-gray-700 shadow-sm transition',
          'hover:bg-gray-50',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
          shareProps.size === 'sm'
            ? 'px-3 py-2 text-xs'
            : shareProps.size === 'lg'
              ? 'px-5 py-3.5 text-base'
              : 'px-4 py-2.5 text-sm',
        ].join(' ')}
      >
        <ShareIcon className={iconSize} />
        {triggerLabel ?? 'Share'}
      </button>

      {open && (
        <div
          ref={containerRef}
          role="dialog"
          aria-label="Share options"
          className={[
            'absolute z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg',
            position === 'bottom-end' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          <ShareButtons {...shareProps} layout="vertical" size="sm" />
        </div>
      )}
    </div>
  );
}
