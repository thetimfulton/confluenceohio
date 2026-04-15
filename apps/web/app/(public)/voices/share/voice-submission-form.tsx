'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useAnnouncer } from '@confluenceohio/ui/a11y';
import { POSITION_CONFIG } from '@confluenceohio/core/voices/types';
import type { VoicePosition } from '@confluenceohio/core/voices/types';

const BODY_MIN = 50;
const BODY_MAX = 2500;

interface VoiceSubmissionFormProps {
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  validation: 'Please check the highlighted fields and try again.',
  rate_limited:
    "You've already submitted a perspective today. Please try again tomorrow.",
  server: 'Something went wrong. Please try again.',
};

export function VoiceSubmissionForm({ error }: VoiceSubmissionFormProps) {
  const { announce } = useAnnouncer();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(
    error ? ERROR_MESSAGES[error] || error : null,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [bodyLength, setBodyLength] = useState(0);
  const [formLoadedAt] = useState(() => Date.now());
  const errorRef = useRef<HTMLDivElement>(null);

  // Focus error region when an error appears
  useEffect(() => {
    if (submitError && errorRef.current) {
      errorRef.current.focus();
    }
  }, [submitError]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('form_loaded_at', String(formLoadedAt));

    try {
      const response = await fetch('/api/voices/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        if (result.fields) {
          setFieldErrors(result.fields);
        }
        const errorMsg = result.error || 'Something went wrong.';
        setSubmitError(errorMsg);
        announce(errorMsg, 'assertive');
        setSubmitting(false);
        return;
      }

      // Success — redirect to confirmation page
      window.location.href = '/voices/share/confirmed';
    } catch {
      const networkMsg = 'Network error. Please check your connection and try again.';
      setSubmitError(networkMsg);
      announce(networkMsg, 'assertive');
      setSubmitting(false);
    }
  }

  return (
    <form
      method="POST"
      action="/api/voices/submit"
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
    >
      {/* Error display */}
      {submitError && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {submitError}
        </div>
      )}

      {/* Display Name */}
      <div>
        <label
          htmlFor="author_name"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Display Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="author_name"
          name="author_name"
          required
          minLength={2}
          maxLength={60}
          placeholder="Your first name, full name, or 'Anonymous'"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-invalid={!!fieldErrors.author_name}
          aria-describedby={fieldErrors.author_name ? 'author_name-error' : undefined}
        />
        {fieldErrors.author_name && (
          <p id="author_name-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.author_name[0]}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="author_email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="author_email"
          name="author_email"
          required
          maxLength={254}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-invalid={!!fieldErrors.author_email}
          aria-describedby="author_email-help"
        />
        <p id="author_email-help" className="mt-1 text-xs text-gray-500">
          Never displayed. Used to verify your submission and notify you of
          approval.
        </p>
        {fieldErrors.author_email && (
          <p className="mt-1 text-sm text-red-600">
            {fieldErrors.author_email[0]}
          </p>
        )}
      </div>

      {/* Neighborhood / Connection */}
      <div>
        <label
          htmlFor="author_neighborhood"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Neighborhood / Connection
        </label>
        <input
          type="text"
          id="author_neighborhood"
          name="author_neighborhood"
          maxLength={100}
          placeholder="e.g., Clintonville, OSU student, grew up in Hilliard"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Position (radio group) */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700">
          Your Position <span className="text-red-500">*</span>
        </legend>
        <div className="space-y-2">
          {(Object.entries(POSITION_CONFIG) as [VoicePosition, typeof POSITION_CONFIG.support][]).map(
            ([value, config]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"
              >
                <input
                  type="radio"
                  name="position"
                  value={value}
                  required
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-sm text-gray-900">{config.radioLabel}</span>
              </label>
            ),
          )}
        </div>
        {fieldErrors.position && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.position[0]}</p>
        )}
      </fieldset>

      {/* Title (optional) */}
      <div>
        <label
          htmlFor="title"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          maxLength={100}
          placeholder="Give your perspective a headline (optional)"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Body (textarea with character count) */}
      <div>
        <label
          htmlFor="body"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Your Perspective <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          required
          minLength={BODY_MIN}
          maxLength={BODY_MAX}
          rows={8}
          placeholder="What does the name of this city mean to you? Whether you support the change, have concerns, or are still thinking it through — tell us why."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-describedby="body-count"
          aria-invalid={!!fieldErrors.body}
          onChange={(e) => setBodyLength(e.target.value.length)}
        />
        <div className="mt-1 flex items-center justify-between">
          {fieldErrors.body ? (
            <p className="text-sm text-red-600">{fieldErrors.body[0]}</p>
          ) : (
            <span />
          )}
          <p
            id="body-count"
            className={`text-xs ${
              bodyLength > BODY_MAX
                ? 'text-red-600'
                : bodyLength >= BODY_MIN
                  ? 'text-green-600'
                  : 'text-gray-400'
            }`}
          >
            {bodyLength}/{BODY_MAX}
          </p>
        </div>
      </div>

      {/* Community Guidelines checkbox */}
      <div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="guidelines_accepted"
            value="true"
            required
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
          />
          <span className="text-sm text-gray-600">
            I&apos;ve read the community guidelines and my submission is
            respectful, on-topic, and my own words.
          </span>
        </label>
        {fieldErrors.guidelines_accepted && (
          <p className="mt-1 text-sm text-red-600">
            {fieldErrors.guidelines_accepted[0]}
          </p>
        )}
      </div>

      {/* Honeypot (hidden) — Artifact 10 §1.4 Layer 2 */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* form_loaded_at (hidden timestamp) — Artifact 10 §1.4 Layer 3 */}
      <input type="hidden" name="form_loaded_at" value={formLoadedAt} />

      {/* Turnstile widget placeholder — invisible mode */}
      <div
        className="cf-turnstile"
        data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
        data-callback="onTurnstileCallback"
        data-appearance="interaction-only"
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Your Perspective'}
      </button>

      <p className="text-center text-xs text-gray-500">
        After submitting, you&apos;ll receive an email to verify your
        submission. Your perspective will be reviewed within 48 hours after
        verification.
      </p>
    </form>
  );
}
