'use client';

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAnnouncer } from '@confluenceohio/ui/a11y';
import { trackEvent } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormStatus = 'idle' | 'submitting' | 'error';

interface FieldErrors {
  [field: string]: string;
}

interface ApiSuccessResponse {
  success: true;
  signature_number: number;
  referral_code: string;
  redirect: string;
}

interface ApiErrorResponse {
  error: string;
  code: string;
  field?: string;
  fields?: Record<string, string>;
}

// Smarty Autocomplete suggestion shape
interface SmartySuggestion {
  street_line: string;
  secondary: string;
  city: string;
  state: string;
  zipcode: string;
  entries: number;
}

// ---------------------------------------------------------------------------
// Validation helpers (§2)
// ---------------------------------------------------------------------------

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function validateField(
  name: string,
  value: string,
): string | null {
  switch (name) {
    case 'firstName':
      if (!value.trim()) return 'Please enter your first name';
      if (value.length > 100) return 'First name must be 100 characters or less';
      if (/\d/.test(value)) return 'First name should not contain numbers';
      return null;
    case 'lastName':
      if (!value.trim()) return 'Please enter your last name';
      if (value.length > 100) return 'Last name must be 100 characters or less';
      if (/\d/.test(value)) return 'Last name should not contain numbers';
      return null;
    case 'email':
      if (!value.trim()) return 'Please enter a valid email address';
      if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address';
      return null;
    case 'streetAddress':
      if (!value.trim() || value.trim().length < 5)
        return 'Please enter your street address';
      return null;
    case 'city':
      if (!value.trim()) return 'City is required';
      return null;
    case 'zipCode':
      if (!/^\d{5}$/.test(value)) return 'Please enter a valid 5-digit ZIP code';
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Error code to user-facing message mapping (§6.1)
// ---------------------------------------------------------------------------

const ERROR_MESSAGES: Record<string, string> = {
  TURNSTILE_FAILED: 'Something went wrong. Please refresh the page and try again.',
  TURNSTILE_EXPIRED: 'Your session expired. Please refresh the page and try again.',
  RATE_LIMITED: "You've made too many attempts. Please try again in an hour.",
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  ADDRESS_INVALID:
    "We couldn't verify this address. Please check it and try again. Make sure to include your full street address.",
  ADDRESS_NOT_OHIO:
    'This petition requires an Ohio address. If you live in Ohio, please check your address and try again.',
  SMARTY_API_ERROR:
    "We're having trouble verifying addresses right now. Please try again in a few minutes.",
  DATABASE_ERROR:
    'Something went wrong on our end. Your information was not saved. Please try again.',
};

// Duplicate codes get info-style treatment (§6.2)
const DUPLICATE_CODES = new Set(['DUPLICATE_ADDRESS', 'DUPLICATE_EMAIL']);

// ---------------------------------------------------------------------------
// Turnstile hook (adapted from EmailSignupForm pattern)
// ---------------------------------------------------------------------------

const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js';

function useTurnstile(containerRef: React.RefObject<HTMLDivElement | null>) {
  const tokenRef = useRef<string>('');
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !containerRef.current) return;

    const existing = document.querySelector(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );
    if (!existing) {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const interval = setInterval(() => {
      if (
        typeof window !== 'undefined' &&
        'turnstile' in window &&
        containerRef.current &&
        !widgetIdRef.current
      ) {
        const turnstile = (window as Record<string, unknown>).turnstile as {
          render: (el: HTMLElement, opts: Record<string, unknown>) => string;
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
    if (widgetIdRef.current && typeof window !== 'undefined' && 'turnstile' in window) {
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
// Smarty Autocomplete hook (§1.4)
// ---------------------------------------------------------------------------

const SMARTY_AUTOCOMPLETE_URL =
  'https://us-autocomplete-pro.api.smarty.com/lookup';

function useSmartyAutocomplete() {
  const fetchSuggestions = useCallback(
    async (search: string): Promise<SmartySuggestion[]> => {
      const key = process.env.NEXT_PUBLIC_SMARTY_EMBEDDED_KEY;
      if (!key || search.length < 3) return [];

      try {
        const params = new URLSearchParams({
          key,
          search,
          include_only_states: 'OH',
          max_results: '5',
          prefer_geolocation: 'city',
          prefer_ratio: '3',
        });

        const response = await fetch(`${SMARTY_AUTOCOMPLETE_URL}?${params}`);
        if (!response.ok) return [];

        const data = (await response.json()) as { suggestions?: SmartySuggestion[] };
        return data.suggestions ?? [];
      } catch {
        return [];
      }
    },
    [],
  );

  return { fetchSuggestions };
}

// ---------------------------------------------------------------------------
// Sticky CTA visibility hook — hides when virtual keyboard is open (§7.1)
// ---------------------------------------------------------------------------

function useKeyboardVisible() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;
    const initialHeight = vv.height;

    const handler = () => {
      // If viewport shrank by >150px, keyboard is likely open
      setKeyboardVisible(vv.height < initialHeight - 150);
    };

    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  return keyboardVisible;
}

// ---------------------------------------------------------------------------
// PetitionForm Component
// ---------------------------------------------------------------------------

export function PetitionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') ?? '';
  const { announce } = useAnnouncer();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [aptUnit, setAptUnit] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(true);

  // Address fields locked after Smarty selection
  const [addressLocked, setAddressLocked] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<SmartySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Form status
  const [status, setStatus] = useState<FormStatus>('idle');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrorCode, setFormErrorCode] = useState<string | null>(null);

  // Analytics tracking
  const hasTrackedStart = useRef(false);

  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);

  const { getToken, reset: resetTurnstile } = useTurnstile(turnstileRef);
  const { fetchSuggestions } = useSmartyAutocomplete();
  const keyboardVisible = useKeyboardVisible();

  // Track page view on mount (§3.2.2)
  useEffect(() => {
    trackEvent('petition_page_viewed', {
      has_ref_code: !!refCode,
      ref_code: refCode || undefined,
      utm_source: new URLSearchParams(window.location.search).get('utm_source') ?? undefined,
    });
  }, [refCode]);

  // Track first field interaction
  const trackFormStart = useCallback(
    (firstField: string) => {
      if (hasTrackedStart.current) return;
      hasTrackedStart.current = true;
      trackEvent('petition_form_started', {
        first_field: firstField,
      });
    },
    [refCode],
  );

  // ---------------------------------------------------------------------------
  // Field validation on blur (§2.2)
  // ---------------------------------------------------------------------------

  const handleBlur = useCallback(
    (fieldName: string, value: string) => {
      const error = validateField(fieldName, value);
      setFieldErrors((prev) => {
        if (error) return { ...prev, [fieldName]: error };
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });

      // Track field completion on blur (§3.2.2)
      trackEvent('petition_field_completed', {
        field_name: fieldName,
        field_valid: !error,
      });
    },
    [addressLocked],
  );

  // Clear error on input change (§2.2)
  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => {
      if (!(fieldName in prev)) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    setFormError(null);
    setFormErrorCode(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Smarty Autocomplete handling (§1.4)
  // ---------------------------------------------------------------------------

  const handleAddressInput = useCallback(
    async (value: string) => {
      setStreetAddress(value);
      setAddressLocked(false);
      clearFieldError('streetAddress');

      if (value.length >= 3) {
        const results = await fetchSuggestions(value);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setActiveSuggestionIndex(-1);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [fetchSuggestions, clearFieldError],
  );

  const selectSuggestion = useCallback(
    (suggestion: SmartySuggestion, index: number) => {
      setStreetAddress(suggestion.street_line);
      setCity(suggestion.city);
      setZipCode(suggestion.zipcode);
      setAddressLocked(true);
      setSuggestions([]);
      setShowSuggestions(false);

      // Clear any address-related errors
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.streetAddress;
        delete next.city;
        delete next.zipCode;
        return next;
      });

      trackEvent('petition_address_autocomplete_selected', {
        suggestion_index: index + 1, // 1-based per taxonomy
      });

      // Focus apt/unit field after selection
      const aptInput = document.getElementById('petition-apt-unit');
      if (aptInput) aptInput.focus();
    },
    [],
  );

  // Keyboard navigation for autocomplete listbox (§8.1)
  const handleAddressKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (activeSuggestionIndex >= 0) {
            selectSuggestion(
              suggestions[activeSuggestionIndex],
              activeSuggestionIndex,
            );
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          setActiveSuggestionIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, activeSuggestionIndex, selectSuggestion],
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        streetInputRef.current &&
        !streetInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---------------------------------------------------------------------------
  // Form submission (§3)
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Validate all fields
      const fields = { firstName, lastName, email, streetAddress, city, zipCode };
      const errors: FieldErrors = {};
      for (const [name, value] of Object.entries(fields)) {
        const err = validateField(name, value);
        if (err) errors[name] = err;
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        const errorCount = Object.keys(errors).length;
        announce(
          `${errorCount} ${errorCount === 1 ? 'error' : 'errors'} found. Please check the highlighted fields.`,
          'assertive',
        );
        trackEvent('petition_verification_failed', {
          failure_reason: 'client_validation',
          fields: Object.keys(errors).join(','),
        });
        // Focus first invalid field
        const firstErrorField = Object.keys(errors)[0];
        const el = document.getElementById(`petition-${firstErrorField}`);
        if (el) el.focus();
        return;
      }

      setStatus('submitting');
      setFormError(null);
      setFormErrorCode(null);

      // Track address manual entry if autocomplete wasn't used (§3.2.2)
      if (!addressLocked) {
        trackEvent('petition_address_manual_entry');
      }

      trackEvent('petition_form_submitted', {
        has_ref_code: !!refCode,
        email_opt_in: emailOptIn,
        turnstile_present: !!getToken(),
      });

      try {
        const response = await fetch('/api/petition/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            streetAddress: streetAddress.trim(),
            aptUnit: aptUnit.trim(),
            city: city.trim(),
            state: 'OH',
            zipCode,
            emailOptIn,
            turnstileToken: getToken(),
            website: '', // Honeypot — always empty for real users
            ref: refCode || undefined,
          }),
        });

        const data = (await response.json()) as ApiSuccessResponse | ApiErrorResponse;

        if (!response.ok) {
          const errorData = data as ApiErrorResponse;
          const code = errorData.code || 'UNKNOWN';

          // Handle server field-level errors
          if (errorData.fields) {
            setFieldErrors(errorData.fields);
          }
          if (errorData.field) {
            setFieldErrors((prev) => ({
              ...prev,
              [errorData.field!]: errorData.error,
            }));
          }

          const errorMsg = errorData.error || ERROR_MESSAGES[code] || 'Something went wrong.';
          setFormError(errorMsg);
          setFormErrorCode(code);
          setStatus('error');
          resetTurnstile();
          announce(errorMsg, 'assertive');

          trackEvent('petition_verification_failed', {
            failure_reason: code.toLowerCase(),
          });
          return;
        }

        const successData = data as ApiSuccessResponse;

        trackEvent('petition_verification_success', {
          verification_status: 'verified',
          signature_number: successData.signature_number,
          is_referred: !!refCode,
        });

        // Store signer info for thank-you page personalization & resend
        try {
          sessionStorage.setItem('petition_firstName', firstName.trim());
          sessionStorage.setItem('petition_email', email.trim().toLowerCase());
        } catch {
          // sessionStorage may not be available
        }

        router.push(successData.redirect);
      } catch {
        const networkError = 'Unable to connect. Please check your internet connection and try again.';
        setFormError(networkError);
        setStatus('error');
        resetTurnstile();
        announce(networkError, 'assertive');
      }
    },
    [
      firstName, lastName, email, streetAddress, aptUnit, city, zipCode,
      emailOptIn, refCode, addressLocked, getToken, resetTurnstile, router, announce,
    ],
  );

  // ---------------------------------------------------------------------------
  // Shared input styles
  // ---------------------------------------------------------------------------

  const inputClasses = (fieldName: string, extra?: string) =>
    `block w-full rounded-lg border px-3 py-3 text-base shadow-sm
    placeholder:text-gray-400
    focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
    disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60
    ${fieldErrors[fieldName] ? 'border-red-400 text-red-900' : 'border-gray-300'}
    ${extra ?? ''}`;

  const isDuplicate = formErrorCode && DUPLICATE_CODES.has(formErrorCode);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Form-level error/info banner (§6.2) */}
      {formError && (
        <div
          role="alert"
          className={`mb-6 rounded-lg border p-4 text-sm ${
            isDuplicate
              ? 'border-blue-200 bg-blue-50 text-blue-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {isDuplicate ? (
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <p>{formError}</p>
          </div>
        </div>
      )}

      <form
        ref={formRef}
        method="POST"
        action="/api/petition/sign"
        onSubmit={handleSubmit}
        noValidate
        id="petition-form"
        className="space-y-4"
      >
        {/* First Name + Last Name (side by side on ≥sm) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="petition-firstName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              First name{' '}
              <span aria-hidden="true" className="text-red-500">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="petition-firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.firstName || undefined}
              aria-describedby={
                fieldErrors.firstName ? 'petition-firstName-error' : undefined
              }
              maxLength={100}
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                clearFieldError('firstName');
                trackFormStart('firstName');
              }}
              onBlur={() => handleBlur('firstName', firstName)}
              disabled={status === 'submitting'}
              className={inputClasses('firstName')}
            />
            {fieldErrors.firstName && (
              <p
                id="petition-firstName-error"
                aria-live="polite"
                className="mt-1 text-sm text-red-600"
              >
                {fieldErrors.firstName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="petition-lastName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Last name{' '}
              <span aria-hidden="true" className="text-red-500">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="petition-lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.lastName || undefined}
              aria-describedby={
                fieldErrors.lastName ? 'petition-lastName-error' : undefined
              }
              maxLength={100}
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                clearFieldError('lastName');
                trackFormStart('lastName');
              }}
              onBlur={() => handleBlur('lastName', lastName)}
              disabled={status === 'submitting'}
              className={inputClasses('lastName')}
            />
            {fieldErrors.lastName && (
              <p
                id="petition-lastName-error"
                aria-live="polite"
                className="mt-1 text-sm text-red-600"
              >
                {fieldErrors.lastName}
              </p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="petition-email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Email{' '}
            <span aria-hidden="true" className="text-red-500">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="petition-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.email || undefined}
            aria-describedby={
              fieldErrors.email ? 'petition-email-error' : undefined
            }
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError('email');
              trackFormStart('email');
            }}
            onBlur={() => handleBlur('email', email)}
            disabled={status === 'submitting'}
            className={inputClasses('email')}
          />
          {fieldErrors.email && (
            <p
              id="petition-email-error"
              aria-live="polite"
              className="mt-1 text-sm text-red-600"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Street Address with Smarty Autocomplete */}
        <div className="relative">
          <label
            htmlFor="petition-streetAddress"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Street address{' '}
            <span aria-hidden="true" className="text-red-500">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            ref={streetInputRef}
            id="petition-streetAddress"
            name="streetAddress"
            type="text"
            autoComplete="address-line1"
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.streetAddress || undefined}
            aria-describedby={
              fieldErrors.streetAddress
                ? 'petition-streetAddress-error'
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={showSuggestions ? 'petition-address-suggestions' : undefined}
            aria-activedescendant={
              activeSuggestionIndex >= 0
                ? `petition-suggestion-${activeSuggestionIndex}`
                : undefined
            }
            aria-expanded={showSuggestions}
            role="combobox"
            maxLength={200}
            value={streetAddress}
            onChange={(e) => handleAddressInput(e.target.value)}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => handleBlur('streetAddress', streetAddress), 200);
            }}
            onKeyDown={handleAddressKeyDown}
            disabled={status === 'submitting'}
            className={inputClasses('streetAddress')}
          />

          {/* Autocomplete suggestions listbox */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              id="petition-address-suggestions"
              role="listbox"
              className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border
                border-gray-200 bg-white shadow-lg"
            >
              {suggestions.map((s, i) => (
                <li
                  key={`${s.street_line}-${s.city}-${s.zipcode}`}
                  id={`petition-suggestion-${i}`}
                  role="option"
                  aria-selected={i === activeSuggestionIndex}
                  className={`cursor-pointer px-3 py-3 text-sm ${
                    i === activeSuggestionIndex
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur
                    selectSuggestion(s, i);
                  }}
                >
                  <span className="font-medium">{s.street_line}</span>
                  {s.secondary && (
                    <span className="text-gray-400"> {s.secondary}</span>
                  )}
                  <span className="text-gray-400">
                    {' '}
                    {s.city}, {s.state} {s.zipcode}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {fieldErrors.streetAddress && (
            <p
              id="petition-streetAddress-error"
              aria-live="polite"
              className="mt-1 text-sm text-red-600"
            >
              {fieldErrors.streetAddress}
            </p>
          )}
        </div>

        {/* Apt/Unit */}
        <div>
          <label
            htmlFor="petition-apt-unit"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Apt/Unit
          </label>
          <input
            id="petition-apt-unit"
            name="aptUnit"
            type="text"
            autoComplete="address-line2"
            maxLength={50}
            value={aptUnit}
            onChange={(e) => setAptUnit(e.target.value)}
            disabled={status === 'submitting'}
            className={inputClasses('aptUnit')}
          />
        </div>

        {/* City + State + ZIP */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="petition-city"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              City{' '}
              <span aria-hidden="true" className="text-red-500">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="petition-city"
              name="city"
              type="text"
              autoComplete="address-level2"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.city || undefined}
              aria-describedby={
                fieldErrors.city ? 'petition-city-error' : undefined
              }
              maxLength={100}
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                clearFieldError('city');
              }}
              onBlur={() => handleBlur('city', city)}
              readOnly={addressLocked}
              disabled={status === 'submitting'}
              className={inputClasses('city', addressLocked ? 'bg-gray-50' : '')}
            />
            {fieldErrors.city && (
              <p
                id="petition-city-error"
                aria-live="polite"
                className="mt-1 text-sm text-red-600"
              >
                {fieldErrors.city}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="petition-state"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              State
            </label>
            <input
              id="petition-state"
              name="state"
              type="text"
              value="OH"
              readOnly
              disabled
              aria-label="State: Ohio"
              className={inputClasses('state', 'bg-gray-100')}
            />
          </div>

          <div>
            <label
              htmlFor="petition-zipCode"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              ZIP{' '}
              <span aria-hidden="true" className="text-red-500">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="petition-zipCode"
              name="zipCode"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              required
              aria-required="true"
              aria-invalid={!!fieldErrors.zipCode || undefined}
              aria-describedby={
                fieldErrors.zipCode ? 'petition-zipCode-error' : undefined
              }
              maxLength={5}
              pattern="\d{5}"
              value={zipCode}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
                setZipCode(digits);
                clearFieldError('zipCode');
              }}
              onBlur={() => handleBlur('zipCode', zipCode)}
              readOnly={addressLocked}
              disabled={status === 'submitting'}
              className={inputClasses('zipCode', addressLocked ? 'bg-gray-50' : '')}
            />
            {fieldErrors.zipCode && (
              <p
                id="petition-zipCode-error"
                aria-live="polite"
                className="mt-1 text-sm text-red-600"
              >
                {fieldErrors.zipCode}
              </p>
            )}
          </div>
        </div>

        {/* Email opt-in checkbox */}
        <div className="flex items-start gap-3">
          <input
            id="petition-emailOptIn"
            name="emailOptIn"
            type="checkbox"
            checked={emailOptIn}
            onChange={(e) => setEmailOptIn(e.target.checked)}
            disabled={status === 'submitting'}
            value="true"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600
              focus:ring-2 focus:ring-blue-500/20"
          />
          <label
            htmlFor="petition-emailOptIn"
            className="text-sm text-gray-700"
          >
            Keep me updated on the campaign
            <span className="block text-xs text-gray-400">
              Unsubscribe anytime
            </span>
          </label>
        </div>

        {/* Honeypot — hidden from real users (§1.3) */}
        <div
          className="absolute -left-[9999px]"
          aria-hidden="true"
        >
          <label htmlFor="petition-website">Do not fill this out</label>
          <input
            id="petition-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Hidden ref field for progressive enhancement */}
        {refCode && (
          <input type="hidden" name="ref" value={refCode} />
        )}

        {/* Turnstile invisible widget container */}
        <div ref={turnstileRef} className="hidden" />

        {/* Submit button (§1.8) */}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-lg bg-[#1e40af] px-6 py-3.5 text-base font-semibold
            text-white shadow-sm transition-colors
            hover:bg-[#1e3a8a]
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting' ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-5 w-5 animate-spin"
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
              Adding your name&hellip;
            </span>
          ) : (
            <>Add My Name &rarr;</>
          )}
        </button>

        {/* Trust signal (§1.7) */}
        <p className="text-center text-xs text-gray-500">
          <svg
            className="mr-1 inline-block h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Your address verifies Ohio residency. We never share your personal
          information.{' '}
          <a href="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </a>
        </p>
      </form>

      {/* Sticky mobile CTA — hides when keyboard is open (§7.1) */}
      {!keyboardVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200
          bg-white/95 p-3 backdrop-blur-sm md:hidden"
        >
          <a
            href="#petition-form"
            className="block w-full rounded-lg bg-[#1e40af] py-3 text-center text-base
              font-semibold text-white shadow-sm transition-colors hover:bg-[#1e3a8a]"
          >
            Add My Name &rarr;
          </a>
        </div>
      )}
    </>
  );
}
