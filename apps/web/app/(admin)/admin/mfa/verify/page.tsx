'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function MFAVerifyPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    let cancelled = false;

    async function getFactors() {
      const { data, error: factorError } =
        await supabase.auth.mfa.listFactors();

      if (cancelled) return;

      if (factorError || !data.totp.length) {
        // No TOTP factor enrolled — redirect to enrollment
        router.push('/admin/mfa/enroll');
        return;
      }

      setFactorId(data.totp[0].id);
    }

    getFactors();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      setError('Invalid code. Please try again.');
      setCode('');
      setLoading(false);
      return;
    }

    const redirect = searchParams.get('redirect') ?? '/admin';
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900">
          Two-Factor Authentication
        </h1>
        <p className="mb-8 text-center text-sm text-gray-600">
          Enter the 6-digit code from your authenticator app.
        </p>

        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700"
              >
                Authentication code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
                required
                autoFocus
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-widest shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying\u2026' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
