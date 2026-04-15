'use client';

import { useEffect, useRef, useCallback } from 'react';

interface FocusTrapProps {
  /** Whether the trap is active. When false, focus is not trapped. */
  active: boolean;
  /** The content to trap focus within */
  children: React.ReactNode;
  /** Called when the user presses Escape. Parent should set active=false. */
  onEscape?: () => void;
  /** Element to return focus to when the trap deactivates. Default: the previously focused element. */
  returnFocusTo?: HTMLElement | null;
  /** Whether to auto-focus the first focusable element on activation. Default: true */
  autoFocus?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Traps keyboard focus within its children when active.
 *
 * Used for mobile nav menu and share popovers.
 * For modal dialogs, prefer the native <dialog> element.
 */
export function FocusTrap({
  active,
  children,
  onEscape,
  returnFocusTo,
  autoFocus = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
  }, []);

  // Store previous focus and auto-focus on activation
  useEffect(() => {
    if (active) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      if (autoFocus) {
        requestAnimationFrame(() => {
          const focusable = getFocusableElements();
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        });
      }
    } else if (previousFocusRef.current) {
      const target = returnFocusTo || previousFocusRef.current;
      target?.focus();
      previousFocusRef.current = null;
    }
  }, [active, autoFocus, getFocusableElements, returnFocusTo]);

  // Handle Tab wrapping and Escape
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, getFocusableElements, onEscape]);

  return (
    <div ref={containerRef} role="presentation">
      {children}
    </div>
  );
}
