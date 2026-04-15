'use client';

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Politeness = 'polite' | 'assertive';

interface AnnouncerContextValue {
  /** Announce a message to screen readers. Use 'assertive' for errors, 'polite' for status. */
  announce: (message: string, politeness?: Politeness) => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

/**
 * Provides a centralized way to announce messages to screen readers.
 *
 * Renders twin aria-live regions (polite + assertive) that are always in the DOM
 * but visually hidden. Messages are injected into the appropriate region,
 * triggering screen reader announcements without visual UI changes.
 *
 * Wrap the entire app in layout.tsx:
 *   <AnnouncerProvider>{children}</AnnouncerProvider>
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const announce = useCallback(
    (message: string, politeness: Politeness = 'polite') => {
      // Clear any pending timeout
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }

      const setter =
        politeness === 'assertive' ? setAssertiveMessage : setPoliteMessage;

      // Clear first, then set on next tick to trigger re-announcement
      // of identical messages
      setter('');
      clearTimeoutRef.current = setTimeout(() => {
        setter(message);
      }, 50);
    },
    [],
  );

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {politeMessage}
      </div>
      <div
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

/**
 * Access the announcer to send messages to screen readers.
 * Must be used within an <AnnouncerProvider>.
 */
export function useAnnouncer(): AnnouncerContextValue {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncer must be used within an <AnnouncerProvider>');
  }
  return context;
}
