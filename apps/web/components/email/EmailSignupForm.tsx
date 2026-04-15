// ---------------------------------------------------------------------------
// EmailSignupForm — apps/web/components/email/EmailSignupForm.tsx
// ---------------------------------------------------------------------------
// Reusable email subscription form for footer, blog sidebar, and standalone
// subscribe page. Posts to /api/email/subscribe with source attribution.
//
// Features:
//  - Email input (required) + optional first name
//  - Turnstile invisible widget for bot prevention
//  - Inline success/error states (no page redirect)
//  - Honeypot field for additional bot filtering
//  - Accessible: proper labels, aria attributes, focus management
//  - Mobile-first: 48px input height, full-width on mobile
//
// See Artifact 07 §4.1 for the component specification.
// ---------------------------------------------------------------------------

'use client';

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAnnouncer } from '@confluenceohio/ui/a11y';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailSignupSource = 'footer' | 'blog' | 'standalone' | 'event';

interface EmailSignupFormProps {
  /** Where this form is rendered — used for source attribution in analytics. */
  source: EmailSignupSource;
  /** Optional heading above the form. */
  heading?: string;
  /** Optional description text below the heading. */
  description?: string;
  /** Custom CTA button text. Defaults to "Subscribe". */
  buttonText?: string;
  /** Show the optional first name field. Defaults to false for compact layouts. */
  showFirstName?: boolean;
  /** Additional CSS classes for the outermost container. */
  className?: string;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Turnstile script loader
// ---------------------------------------------------------------------------

const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js';

function useTurnstile(containerRef: React.RefObject<HTMLDivElement | null>) {
  const tokenRef = useRef<string>('');
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !containerRef.current) return;

    // Load Turnstile script if not already present
    const existingScript = document.querySelector(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Render widget once the script is ready
    const interval = setInterval(() => {
      if (
        typeof window !== 'undefined' &&
        'turnstile' in window &&
        containerRef.current &&
        !widgetIdRef.current
      ) {
        const turnstile = (window as Record<string, unknown>).turnstile as {
          render: (
            el: HTMLElement,
            opts: Record<string, unknown>,
          ) => string;
          reset: (id: string) => void;
        };
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          size: 'invisible',
          callback: (token: string) => {
            tokenRef.current = token;
          },
        });
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [containerRef]);

  const getToken = useCallback(() => tokenRef.current, []);

  const reset = useCallback(() => {
    if (
      widgetIdRef.current &&
      typeof window !== 'undefined' &&
      'turnstile' in window
    ) {
      const turnstile = (window as Record<string, unknown>).turnstile as {
        reset: (id: string) => void;
      };
      turnstile.reset(widgetIdRef.current);
      tokenRef.current = '';
    }
  }, []);

  return { getToken, reset };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailSignupForm({
  source,
  heading,
  description,
  buttonText = 'Subscribe',
  showFirstName = false,
  className = '',
}: EmailSignupFormProps) {
  const { announce } = useAnnouncer();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const { getToken, reset: resetTurnstile } =
    useTurnstile(turnstileContainerRef);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side email validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address.');
      announce('Please enter a valid email address.', 'assertive');
      emailInputRef.current?.focus();
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/email/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          firstName: firstName.trim() || undefined,
          source,
          turnstileToken: getToken(),
          website: '', // Honeypot — always empty for real users
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        const serverMsg = data.error || 'Something went wrong. Please try again.';
        setStatus('error');
        setErrorMessage(serverMsg);
        announce(serverMsg, 'assertive');
        resetTurnstile();
        return;
      }

      setStatus('success');
      setEmail('');
      setFirstName('');

      // Announce success to screen readers
      announce('Thanks! Check your inbox for a welcome message.', 'polite');
      statusRef.current?.focus();
    } catch {
      const networkMsg = 'Unable to connect. Please check your internet connection and try again.';
      setStatus('error');
      setErrorMessage(networkMsg);
      announce(networkMsg, 'assertive');
      resetTurnstile();
    }
  };

  if (status === 'success') {
    return (
      <div className={`email-signup ${className}`} role="status">
        <div
          ref={statusRef}
          tabIndex={-1}
          className="rounded-lg bg-green-50 p-4 text-center"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-green-800">
            Thanks! Check your inbox for a welcome message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`email-signup ${className}`}>
      {heading && (
        <h3 className="mb-1 text-lg font-semibold text-gray-900">{heading}</h3>
      )}
      {description && (
        <p className="mb-3 text-sm text-gray-600">{description}</p>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2"
      >
        {showFirstName && (
          <div className="flex-shrink-0 sm:w-36">
            <label
              htmlFor={`signup-first-name-${source}`}
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              First name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id={`signup-first-name-${source}`}
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              maxLength={100}
              autoComplete="given-name"
              disabled={status === 'submitting'}
              className="h-12 w-full rounded-md border border-gray-300 px-3 text-sm
                placeholder:text-gray-400
                focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <label
            htmlFor={`signup-email-${source}`}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Email address
          </label>
          <input
            ref={emailInputRef}
            id={`signup-email-${source}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            required
            autoComplete="email"
            disabled={status === 'submitting'}
            aria-describedby={
              status === 'error' ? `signup-error-${source}` : undefined
            }
            aria-invalid={status === 'error' ? 'true' : undefined}
            className="h-12 w-full rounded-md border border-gray-300 px-3 text-sm
              placeholder:text-gray-400
              focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
              disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="h-12 flex-shrink-0 rounded-md bg-[#1e40af] px-5 text-sm font-medium
            text-white transition-colors
            hover:bg-[#1e3a8a]
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-60
            sm:w-auto"
        >
          {status === 'submitting' ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Subscribing...
            </span>
          ) : (
            buttonText
          )}
        </button>

        {/* Honeypot — hidden from real users, filled by bots */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor={`signup-website-${source}`}>
            Do not fill this out
          </label>
          <input
            id={`signup-website-${source}`}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Turnstile invisible widget container */}
        <div ref={turnstileContainerRef} className="hidden" />
      </form>

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <div
          id={`signup-error-${source}`}
          role="alert"
          aria-live="polite"
          className="mt-2 text-sm text-red-600"
        >
          {errorMessage}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        We respect your privacy. Unsubscribe anytime.
      </p>
    </div>
  );
}
