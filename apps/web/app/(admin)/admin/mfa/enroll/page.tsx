'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function MFAEnrollPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    let cancelled = false;

    async function enroll() {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Confluence Ohio Admin',
      });

      if (cancelled) return;

      if (enrollError) {
        setError(enrollError.message);
        setEnrolling(false);
        return;
      }

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setEnrolling(false);
    }

    enroll();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

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
      code: verifyCode,
    });

    if (verifyError) {
      setError('Invalid code. Please try again.');
      setVerifyCode('');
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900">
          Set Up Two-Factor Authentication
        </h1>
        <p className="mb-8 text-center text-sm text-gray-600">
          Scan this QR code with your authenticator app (Google Authenticator,
          Authy, 1Password, etc.)
        </p>

        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {enrolling && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            </div>
          )}

          {qrCode && (
            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode}
                alt="Scan this QR code with your authenticator app"
                width={200}
                height={200}
                className="rounded-md"
              />
              <details className="w-full text-center">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Can&apos;t scan? Enter this code manually
                </summary>
                <code className="mt-2 block break-all rounded bg-gray-100 px-3 py-2 font-mono text-xs text-gray-800">
                  {secret}
                </code>
              </details>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {!enrolling && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Enter the 6-digit code from your app
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) =>
                    setVerifyCode(e.target.value.replace(/\D/g, ''))
                  }
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-widest shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verifying\u2026' : 'Verify and Continue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
