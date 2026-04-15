'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import { SharePrompt } from './components/share-prompt';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://confluenceohio.org';

// ---------------------------------------------------------------------------
// Confetti CSS animation (§4 — CSS-only, no heavy library)
// ---------------------------------------------------------------------------

/**
 * Generates confetti particles using CSS keyframe animations.
 * Each particle has a random horizontal offset, color, size, and timing.
 */
function ConfettiOverlay() {
  const particles = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 6 + Math.random() * 6,
      color: ['#1e40af', '#2563eb', '#7c3aed', '#f59e0b', '#10b981', '#ef4444'][
        i % 6
      ],
      rotation: Math.random() * 360,
    })),
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {particles.current.map((p) => (
        <span
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.size > 9 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}

      {/* Keyframe animation injected via style tag */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(80vh) rotate(720deg) scale(0.5);
          }
        }
        .animate-confetti-fall {
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-fill-mode: forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-confetti-fall {
            animation: none;
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Share button icons (inline SVG — no icon library dependency)
// ---------------------------------------------------------------------------

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.018a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ThankYouClientProps {
  signatureNumber: number | null;
  referralCode: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThankYouClient({
  signatureNumber,
  referralCode,
}: ThankYouClientProps) {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error' | 'limit'
  >('idle');
  const [signerEmail, setSignerEmail] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read personalization data from sessionStorage on mount
  useEffect(() => {
    try {
      const name = sessionStorage.getItem('petition_firstName');
      if (name) setFirstName(name);

      const email = sessionStorage.getItem('petition_email');
      if (email) setSignerEmail(email);
    } catch {
      // sessionStorage may not be available
    }
  }, []);

  // Track page view
  useEffect(() => {
    trackEvent('thank_you_page_view', {
      signatureNumber: signatureNumber ?? undefined,
      ref: referralCode ?? undefined,
    });
  }, [signatureNumber, referralCode]);

  // Cleanup copy timeout
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Share URL with referral code
  const shareUrl = referralCode
    ? `${SITE_URL}/sign?ref=${referralCode}`
    : `${SITE_URL}/sign`;

  // Pre-populated share text (§4.1)
  const twitterText =
    'I just signed the petition to rename Columbus to Confluence, Ohio. Join me \u2192';
  const whatsappText = `I just signed to rename Columbus to Confluence! Check it out: ${shareUrl}`;
  const emailSubject = 'I signed \u2014 will you?';
  const emailBody = `I just added my name to the Confluence Ohio petition to rename Columbus to a name that honors the land, the rivers, and everyone who calls this place home.\n\nAdd your name: ${shareUrl}`;

  // Share button click handler with analytics
  const handleShareClick = useCallback(
    (platform: string) => {
      trackEvent('share_click', {
        platform,
        signatureNumber: signatureNumber ?? undefined,
        ref: referralCode ?? undefined,
      });
    },
    [signatureNumber, referralCode],
  );

  // Copy link handler
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackEvent('share_copy_link', {
        ref: referralCode ?? undefined,
      });
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in a temporary input
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      trackEvent('share_copy_link', {
        ref: referralCode ?? undefined,
      });
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl, referralCode]);

  // Resend verification email
  const handleResend = useCallback(async () => {
    if (resendStatus === 'sending' || resendStatus === 'limit') return;

    // We need the signer's email. If not stored in sessionStorage,
    // the resend link won't work — they'll need to check spam.
    if (!signerEmail) {
      setResendStatus('error');
      return;
    }

    setResendStatus('sending');
    trackEvent('resend_verification_click', {
      signatureNumber: signatureNumber ?? undefined,
    });

    try {
      const response = await fetch('/api/petition/verify/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signerEmail }),
      });

      if (response.status === 429) {
        setResendStatus('limit');
        return;
      }

      const data = (await response.json()) as { success: boolean };
      setResendStatus(data.success ? 'sent' : 'error');
    } catch {
      setResendStatus('error');
    }
  }, [signerEmail, resendStatus, signatureNumber]);

  // Donation click handler
  const handleDonateClick = useCallback(() => {
    trackEvent('donate_click', {
      signatureNumber: signatureNumber ?? undefined,
      ref: referralCode ?? undefined,
    });
  }, [signatureNumber, referralCode]);

  // Volunteer click handler
  const handleVolunteerClick = useCallback(() => {
    trackEvent('volunteer_click', {
      signatureNumber: signatureNumber ?? undefined,
    });
  }, [signatureNumber]);

  const actBlueUrl = referralCode
    ? `https://secure.actblue.com/donate/confluenceohio?refcode=${referralCode}`
    : 'https://secure.actblue.com/donate/confluenceohio';

  return (
    <section className="relative mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Confetti animation */}
      <ConfettiOverlay />

      {/* ─── 1. Hero (§4.1) ─── */}
      <div className="relative text-center">
        {/* Celebration icon */}
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100"
          aria-hidden="true"
        >
          <span className="text-3xl" role="img" aria-label="Celebration">
            🎉
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {signatureNumber
            ? `You\u2019re signer #${signatureNumber.toLocaleString('en-US')}!`
            : 'Thank you for signing!'}
        </h1>

        <p className="mx-auto mt-3 max-w-md text-lg text-gray-600">
          {firstName ? `Thank you, ${firstName}. ` : ''}You just brought us one
          step closer to the ballot. Help us reach 22,000 — share with 3
          friends.
        </p>
      </div>

      {/* ─── 2. Share section (§4.1) ─── */}
      <div className="mt-10">
        {/* A/B tested share prompt (exp_thankyou_share_prompt, Artifact 13 §5.4) */}
        <SharePrompt />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleShareClick('facebook')}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300
              bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm
              transition hover:bg-gray-50
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <FacebookIcon className="h-5 w-5 text-[#1877F2]" />
            Facebook
          </a>

          {/* Twitter/X */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleShareClick('twitter')}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300
              bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm
              transition hover:bg-gray-50
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <XIcon className="h-5 w-5" />
            X
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleShareClick('whatsapp')}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300
              bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm
              transition hover:bg-gray-50
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
            WhatsApp
          </a>

          {/* Email */}
          <a
            href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
            onClick={() => handleShareClick('email')}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300
              bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm
              transition hover:bg-gray-50
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <EmailIcon className="h-5 w-5 text-gray-500" />
            Email
          </a>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-gray-300
              bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm
              transition hover:bg-gray-50 sm:col-span-1
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {copied ? (
              <>
                <CheckIcon className="h-5 w-5 text-green-600" />
                <span className="text-green-700">Copied!</span>
              </>
            ) : (
              <>
                <LinkIcon className="h-5 w-5 text-gray-500" />
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── 3. Donation CTA (§4.1) ─── */}
      <div className="mt-10 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Support the Campaign
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
          Every dollar funds signature collection, legal review, and community
          outreach. Donate any amount — even $5 makes a difference.
        </p>
        <a
          href={actBlueUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleDonateClick}
          className="mt-4 inline-block rounded-lg bg-[#1e40af] px-8 py-3.5 text-base
            font-semibold text-white shadow-sm transition-colors
            hover:bg-[#1e3a8a]
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Donate via ActBlue &rarr;
        </a>
      </div>

      {/* ─── 4. Volunteer CTA (§4.1) ─── */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Get More Involved
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
          We need signature collectors, social amplifiers, and neighborhood
          captains.
        </p>
        <Link
          href="/volunteer"
          onClick={handleVolunteerClick}
          className="mt-4 inline-block rounded-lg border border-gray-300 bg-white px-8 py-3
            text-base font-semibold text-gray-700 shadow-sm transition-colors
            hover:bg-gray-50
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
        >
          Find your role &rarr;
        </Link>
      </div>

      {/* ─── 5. Email verification notice (§4.1) ─── */}
      <div className="mt-10 rounded-xl border border-amber-100 bg-amber-50 p-6 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <span className="text-xl" role="img" aria-label="Email">
            📧
          </span>
        </div>
        <h2 className="text-base font-semibold text-gray-900">
          Check your inbox
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          We sent a confirmation email. Click the link to verify your signature.
        </p>
        <p className="mt-3 text-sm text-gray-500">
          Didn&apos;t get it? Check spam, or{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={
              resendStatus === 'sending' ||
              resendStatus === 'sent' ||
              resendStatus === 'limit'
            }
            className="font-medium text-blue-600 underline underline-offset-2
              hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
          >
            {resendStatus === 'idle' && 'resend verification email'}
            {resendStatus === 'sending' && 'sending\u2026'}
            {resendStatus === 'sent' && 'email sent!'}
            {resendStatus === 'error' && 'resend failed \u2014 try again'}
            {resendStatus === 'limit' && 'max resends reached'}
          </button>
          .
        </p>
      </div>
    </section>
  );
}
