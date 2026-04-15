/**
 * Platform-specific share URL builders (Artifact 11 §2.3).
 *
 * Each function constructs a URL that opens the platform's share intent
 * with pre-populated text. The page URL always includes UTM parameters
 * for analytics attribution (§1.5).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SharePlatform =
  | 'facebook'
  | 'twitter'
  | 'whatsapp'
  | 'email'
  | 'linkedin'
  | 'copy';

export interface ShareUrlParams {
  /** Platform to build the share URL for */
  platform: SharePlatform;
  /** The page URL to share (referral code should already be appended) */
  pageUrl: string;
  /** Share text / tweet body (not used by Facebook — relies on OG tags) */
  text?: string;
  /** Email subject line */
  subject?: string;
  /** Email body text. `{url}` placeholder is replaced with pageUrl. */
  body?: string;
  /** Twitter/X hashtags (without #) */
  hashtags?: string[];
  /** Twitter/X via handle (without @) */
  via?: string;
}

// ---------------------------------------------------------------------------
// UTM helpers
// ---------------------------------------------------------------------------

const UTM_PARAMS: Record<SharePlatform, Record<string, string>> = {
  facebook: {
    utm_source: 'facebook',
    utm_medium: 'social',
    utm_campaign: 'referral',
  },
  twitter: {
    utm_source: 'twitter',
    utm_medium: 'social',
    utm_campaign: 'referral',
  },
  whatsapp: {
    utm_source: 'whatsapp',
    utm_medium: 'social',
    utm_campaign: 'referral',
  },
  email: {
    utm_source: 'email',
    utm_medium: 'referral',
    utm_campaign: 'referral',
  },
  linkedin: {
    utm_source: 'linkedin',
    utm_medium: 'social',
    utm_campaign: 'referral',
  },
  copy: {
    utm_source: 'copy',
    utm_medium: 'social',
    utm_campaign: 'referral',
  },
};

/**
 * Append UTM parameters to a URL for the given platform.
 * Preserves any existing query parameters (e.g. `?ref=CONF-XXXX`).
 */
export function appendUtmParams(
  url: string,
  platform: SharePlatform,
): string {
  const parsed = new URL(url);
  const utms = UTM_PARAMS[platform];
  for (const [key, value] of Object.entries(utms)) {
    parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

// ---------------------------------------------------------------------------
// Share URL builder
// ---------------------------------------------------------------------------

/**
 * Build a share URL for the given platform. The returned URL opens the
 * platform's share dialog with pre-populated text.
 *
 * For the `copy` platform, returns the raw pageUrl (with UTM params) —
 * the clipboard copy is handled by the UI component.
 */
export function buildShareUrl(params: ShareUrlParams): string {
  const { platform, pageUrl, text, subject, body, hashtags, via } = params;

  // Always add UTM params to the page URL that will be shared
  const urlWithUtm = appendUtmParams(pageUrl, platform);

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlWithUtm)}`;

    case 'twitter': {
      const twitterParams = new URLSearchParams();
      if (text) twitterParams.set('text', text);
      twitterParams.set('url', urlWithUtm);
      if (hashtags?.length) twitterParams.set('hashtags', hashtags.join(','));
      if (via) twitterParams.set('via', via);
      return `https://x.com/intent/tweet?${twitterParams.toString()}`;
    }

    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(`${text ?? ''} ${urlWithUtm}`.trim())}`;

    case 'email': {
      const emailParams = new URLSearchParams();
      if (subject) emailParams.set('subject', subject);
      if (body) {
        emailParams.set('body', body.replace('{url}', urlWithUtm));
      }
      return `mailto:?${emailParams.toString()}`;
    }

    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(urlWithUtm)}`;

    case 'copy':
      return urlWithUtm;

    default:
      return urlWithUtm;
  }
}
