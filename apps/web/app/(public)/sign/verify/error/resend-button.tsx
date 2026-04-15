'use client';

import { useState } from 'react';

type ResendState = 'idle' | 'form' | 'sending' | 'sent' | 'error';

/**
 * Client component for the "Resend verification email" flow on the
 * expired-token error page. Shows a form to enter the email, then
 * POSTs to /api/petition/verify/resend.
 */
export function ResendVerificationButton() {
  const [state, setState] = useState<ResendState>('idle');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/petition/verify/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setState('sent');
      } else {
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
        setState('error');
      }
    } catch {
      setErrorMessage('Unable to connect. Please try again.');
      setState('error');
    }
  }

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setState('form')}
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Resend verification email
      </button>
    );
  }

  if (state === 'sent') {
    return (
      <p className="rounded-lg border border-green-200 bg-green-50 px-6 py-3 text-sm font-medium text-green-800">
        Verification email sent! Check your inbox (and spam folder).
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="resend-email" className="sr-only">
        Email address
      </label>
      <input
        id="resend-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        disabled={state === 'sending'}
        aria-describedby={errorMessage ? 'resend-error' : undefined}
      />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending...' : 'Send'}
      </button>

      {errorMessage && (
        <p id="resend-error" className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
