'use client';

/**
 * Social sharing buttons component (Artifact 11 §2.1–2.7).
 *
 * Reusable across three contexts:
 *   - post-signature  (thank-you page, highest engagement moment)
 *   - petition-page   (below-fold reinforcement)
 *   - voice-story     (individual community voice pages)
 *
 * Features:
 *   - Platform buttons: Facebook, X, WhatsApp, Email, LinkedIn, Copy Link
 *   - Web Share API: native share sheet on supporting devices (§2.4)
 *   - PostHog analytics: share_button_click events (§2.6)
 *   - Referral code pass-through in all URLs (§1.2)
 *   - Full a11y: role="group", aria-labels, focus-visible styles (§2.7)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  buildShareUrl,
  type SharePlatform,
} from '@confluenceohio/core/sharing/build-share-url';
import {
  getShareMessages,
  getNativeShareText,
  getNativeShareTitle,
  type ShareContext,
  type ShareMessageOptions,
} from '@confluenceohio/core/sharing/share-messages';
import {
  trackShareEvent,
  trackShareLinkCopied,
  trackShareNativeCompleted,
  trackShareNativeCancelled,
} from '@confluenceohio/core/sharing/track-share-event';
import { CopyLinkButton } from './copy-link-button';

// ---------------------------------------------------------------------------
// Platform icons (inline SVG — no icon library dependency)
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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShareButtonsProps {
  /** The URL to share (should include ?ref= if referral code is available) */
  shareUrl: string;
  /** Context for message customization */
  context: ShareContext;
  /** Voice story title (for voice-story context) */
  storyTitle?: string;
  /** Referral code (for analytics metadata) */
  referralCode?: string;
  /** Signer number (for post-signature analytics) */
  signerNumber?: number;
  /** Layout: horizontal row or vertical stack */
  layout?: 'horizontal' | 'vertical';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ---------------------------------------------------------------------------
// Individual platform button
// ---------------------------------------------------------------------------

interface PlatformButtonProps {
  platform: SharePlatform;
  href: string;
  label: string;
  ariaLabel: string;
  icon: React.ReactNode;
  size: 'sm' | 'md' | 'lg';
  onClick: () => void;
}

function PlatformButton({
  href,
  label,
  ariaLabel,
  icon,
  size,
  onClick,
}: PlatformButtonProps) {
  const textSize =
    size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const padding =
    size === 'sm' ? 'px-3 py-2' : size === 'lg' ? 'px-5 py-3.5' : 'px-4 py-3';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300',
        'bg-white font-medium text-gray-700 shadow-sm transition',
        'hover:bg-gray-50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        textSize,
        padding,
      ].join(' ')}
    >
      {icon}
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ShareButtons({
  shareUrl,
  context,
  storyTitle,
  referralCode,
  signerNumber,
  layout = 'horizontal',
  size = 'md',
}: ShareButtonsProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Feature-detect Web Share API (only available in secure contexts)
  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function',
    );
  }, []);

  const messageOptions: ShareMessageOptions = { storyTitle };
  const messages = getShareMessages(context, messageOptions);
  const metadata = { referralCode, signerNumber };

  // Build platform URLs
  const iconSize =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  const facebookUrl = buildShareUrl({
    platform: 'facebook',
    pageUrl: shareUrl,
  });

  const twitterUrl = buildShareUrl({
    platform: 'twitter',
    pageUrl: shareUrl,
    text: messages.twitter.text,
    hashtags: messages.twitter.hashtags,
    via: messages.twitter.via,
  });

  const whatsappUrl = buildShareUrl({
    platform: 'whatsapp',
    pageUrl: shareUrl,
    text: messages.whatsapp.text,
  });

  const emailUrl = buildShareUrl({
    platform: 'email',
    pageUrl: shareUrl,
    subject: messages.email.subject,
    body: messages.email.body,
  });

  const linkedinUrl = buildShareUrl({
    platform: 'linkedin',
    pageUrl: shareUrl,
  });

  // Track share click helper
  const handleClick = useCallback(
    (platform: SharePlatform) => {
      trackShareEvent(platform, context, metadata);
    },
    [context, metadata],
  );

  // Native share handler (§2.4)
  const handleNativeShare = useCallback(async () => {
    const shareData = {
      title: getNativeShareTitle(context),
      text: getNativeShareText(context),
      url: shareUrl,
    };

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        trackShareEvent('native', context, metadata);
        trackShareNativeCompleted(context);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // User cancelled the share dialog (§3.2.8)
          trackShareNativeCancelled(context);
        } else {
          console.error('Native share failed:', err);
        }
      }
    }
  }, [shareUrl, context, metadata]);

  // Copy link URL (with UTM params for the copy platform)
  const copyUrl = buildShareUrl({
    platform: 'copy',
    pageUrl: shareUrl,
  });

  const handleCopyDone = useCallback(() => {
    trackShareEvent('copy', context, metadata);
    trackShareLinkCopied(referralCode);
  }, [context, metadata, referralCode]);

  const isVertical = layout === 'vertical';

  return (
    <div className={isVertical ? 'flex flex-col gap-3' : 'flex flex-col gap-3'}>
      {/* Native share — shown when Web Share API is available */}
      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className={[
            'inline-flex items-center justify-center gap-2 rounded-lg',
            'bg-blue-600 font-semibold text-white shadow-sm transition',
            'hover:bg-blue-700',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
            size === 'sm'
              ? 'px-3 py-2 text-xs'
              : size === 'lg'
                ? 'px-5 py-3.5 text-base'
                : 'px-4 py-3 text-sm',
          ].join(' ')}
          aria-label="Share via your device's share menu"
        >
          <ShareIcon className={iconSize} />
          Share
        </button>
      )}

      {/* Platform-specific buttons */}
      <div
        className={[
          isVertical ? 'flex flex-col gap-3' : 'grid gap-3',
          !isVertical &&
            (size === 'sm'
              ? 'grid-cols-2 sm:grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-3'),
        ]
          .filter(Boolean)
          .join(' ')}
        role="group"
        aria-label="Share on social media"
      >
        <PlatformButton
          platform="facebook"
          href={facebookUrl}
          label="Facebook"
          ariaLabel="Share on Facebook"
          icon={<FacebookIcon className={`${iconSize} text-[#1877F2]`} />}
          size={size}
          onClick={() => handleClick('facebook')}
        />

        <PlatformButton
          platform="twitter"
          href={twitterUrl}
          label="X"
          ariaLabel="Share on X (Twitter)"
          icon={<XIcon className={iconSize} />}
          size={size}
          onClick={() => handleClick('twitter')}
        />

        <PlatformButton
          platform="whatsapp"
          href={whatsappUrl}
          label="WhatsApp"
          ariaLabel="Share on WhatsApp"
          icon={<WhatsAppIcon className={`${iconSize} text-[#25D366]`} />}
          size={size}
          onClick={() => handleClick('whatsapp')}
        />

        <PlatformButton
          platform="email"
          href={emailUrl}
          label="Email"
          ariaLabel="Share via Email"
          icon={<EmailIcon className={`${iconSize} text-gray-500`} />}
          size={size}
          onClick={() => handleClick('email')}
        />

        <PlatformButton
          platform="linkedin"
          href={linkedinUrl}
          label="LinkedIn"
          ariaLabel="Share on LinkedIn"
          icon={<LinkedInIcon className={`${iconSize} text-[#0A66C2]`} />}
          size={size}
          onClick={() => handleClick('linkedin')}
        />

        <CopyLinkButton
          url={copyUrl}
          size={size}
          onCopy={handleCopyDone}
        />
      </div>
    </div>
  );
}
