# Confluence Ohio — Social Sharing Mechanics and Referral Tracking

**Artifact 11 · Prompt 11 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 05 (Data Model — `referrals` table, `referral_platform` enum, `campaign_metrics`), Artifact 06 (Petition Signing Flow — referral code generation, thank-you page, share URLs)

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **Domain for share URLs.** ✅ Confirmed `confluenceohio.org` is canonical. All share URLs use `.org` throughout.

2. **Twitter/X account handle.** ✅ `@confluenceohio` is registered on X (`https://x.com/confluenceohio`). The `via=confluenceohio` parameter is enabled on all Twitter/X share intents.

3. **OG image design resources.** ✅ Claude Code will stub placeholder designs (brand colors + text) for all OG images. Tim will refine with final brand assets (logo SVG, fonts) later.

4. **Referral notification email frequency.** ✅ Batching threshold of 5+ conversions per hour → hourly digest confirmed. Below threshold → individual notification emails.

5. **Referral leaderboard privacy.** ✅ **Changed to first name + last initial** (not city). Rationale: almost all signers will be from Columbus/Franklin County, making city redundant as a differentiator. Last initial provides just enough distinction without compromising privacy.

---

## 1. Referral Code System

### 1.1 Code Generation

Referral codes are generated at signature insert time (Artifact 06, §3.9). Each signer receives exactly one code, stored in `signatures.referral_code` with a unique constraint.

**Format:** `CONF-XXXX` — branded prefix + 4 uppercase alphanumeric characters from a reduced alphabet that excludes visually ambiguous characters (0/O, 1/I/l).

```typescript
// packages/core/referral/generate-code.ts

import { customAlphabet } from 'nanoid';

const SUFFIX_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 30 chars
const generateSuffix = customAlphabet(SUFFIX_ALPHABET, 4);

export function generateReferralCode(): string {
  return `CONF-${generateSuffix()}`; // e.g., CONF-7KMN
}
```

**Collision space:** 30^4 = 810,000 possible codes. At 100K signatures (well beyond the 22K ballot threshold), collision probability per insert is ~12%. The `insert_signature` RPC function (Artifact 06) handles collisions by retrying with a new code (max 3 retries) inside the same transaction:

```sql
-- Inside insert_signature RPC (addition to Artifact 06, §3.9)
-- Retry loop for referral code collision
FOR i IN 1..3 LOOP
  BEGIN
    INSERT INTO signatures (..., referral_code, ...)
    VALUES (..., p_referral_code, ...)
    RETURNING signatures.id INTO v_id;
    EXIT; -- success, leave loop
  EXCEPTION WHEN unique_violation THEN
    IF i = 3 THEN RAISE; END IF;
    -- Generate new code in application layer before retry
    -- (passed as parameter; RPC caller handles retry with new code)
  END;
END LOOP;
```

**Application-layer retry:** The API route catches the unique violation, regenerates the code, and retries the RPC. This keeps code generation in TypeScript (where `nanoid` lives) and collision handling clean.

```typescript
// apps/web/app/api/petition/sign/route.ts — referral code collision retry

let referralCode = generateReferralCode();
let retries = 0;
const MAX_RETRIES = 3;

while (retries < MAX_RETRIES) {
  const { data, error } = await supabase.rpc('insert_signature', {
    ...signatureParams,
    p_referral_code: referralCode,
  });

  if (error?.code === '23505' && error.message.includes('unique_referral_code')) {
    referralCode = generateReferralCode();
    retries++;
    continue;
  }

  if (error) throw error;
  return data;
}

throw new Error('Failed to generate unique referral code after 3 attempts');
```

### 1.2 Referral URLs

The canonical referral URL format:

```
https://confluenceohio.org/sign?ref=CONF-XXXX
```

When a visitor arrives at `/sign` with a `ref` query parameter:

1. The `ref` value is captured and stored in a hidden form field (Artifact 06, §1.3).
2. The `ref` value is also stored in `sessionStorage` as a fallback — if the user navigates away and returns to `/sign`, the referral attribution is preserved for that browser session.
3. On form submission, the `ref` value is sent to the API and stored in `signatures.referred_by_code`.
4. The `insert_signature` RPC resolves `referred_by_code` → `referred_by_id` by looking up the referrer's signature (Artifact 06, §3.9).

### 1.3 Referral Attribution and Tracking

When a new signature is created with a non-null `referred_by_code`, the Inngest `petition/signature.created` event handler (Artifact 06, §3.11) triggers a referral tracking function:

```typescript
// packages/core/inngest/functions/track-referral-conversion.ts

import { inngest } from '@/lib/inngest';

export const trackReferralConversion = inngest.createFunction(
  { id: 'track-referral-conversion', name: 'Track Referral Conversion' },
  { event: 'petition/signature.created' },
  async ({ event, step }) => {
    const { referredByCode, signatureId } = event.data;
    if (!referredByCode) return; // No referral — skip

    // Step 1: Increment the referral conversion counter
    await step.run('increment-referral-conversion', async () => {
      // Find the referral row for this code (platform = 'other' as default
      // since we don't know which platform the link was shared from)
      // First, check if a platform-specific row exists from a prior click track
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id, platform')
        .eq('referral_code', referredByCode)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingReferral) {
        await supabase
          .from('referrals')
          .update({
            conversions: supabase.rpc('increment_counter', { row_id: existingReferral.id, column_name: 'conversions' }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReferral.id);
      }

      // Also increment the global metric
      await supabase
        .from('campaign_metrics')
        .update({
          value: supabase.rpc('increment_metric', { p_metric: 'referral_conversion_count' }),
          recorded_at: new Date().toISOString(),
        })
        .eq('metric', 'referral_conversion_count');
    });

    // Step 2: Notify the referrer (with batching logic)
    await step.run('notify-referrer', async () => {
      // Look up the referrer
      const { data: referrer } = await supabase
        .from('signatures')
        .select('id, email, first_name, referral_code, email_opt_in')
        .eq('referral_code', referredByCode)
        .is('deleted_at', null)
        .maybeSingle();

      if (!referrer || !referrer.email_opt_in) return;

      // Look up the new signer's first name for the notification
      const { data: newSigner } = await supabase
        .from('signatures')
        .select('first_name, city')
        .eq('id', signatureId)
        .single();

      // Check recent conversion volume for batching
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentConversions } = await supabase
        .from('signatures')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by_code', referredByCode)
        .gte('signed_at', oneHourAgo);

      if ((recentConversions ?? 0) >= 5) {
        // High volume — queue for hourly digest instead of individual email
        await inngest.send({
          name: 'referral/digest.queued',
          data: {
            referrerEmail: referrer.email,
            referrerFirstName: referrer.first_name,
            referralCode: referredByCode,
          },
        });
        return;
      }

      // Low volume — send individual notification
      await inngest.send({
        name: 'referral/conversion.notify',
        data: {
          referrerEmail: referrer.email,
          referrerFirstName: referrer.first_name,
          newSignerFirstName: newSigner?.first_name ?? 'Someone',
          newSignerCity: newSigner?.city ?? 'Ohio',
          totalReferrals: (recentConversions ?? 0) + 1,
        },
      });
    });
  }
);
```

### 1.4 Referral Click Tracking

Referral link clicks are tracked via a lightweight redirect middleware. This runs *before* the petition page renders, so the tracking is invisible to the user.

```typescript
// apps/web/middleware.ts — referral click tracking (addition to existing middleware)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Track referral clicks on /sign with ref parameter
  if (pathname === '/sign' && searchParams.has('ref')) {
    const refCode = searchParams.get('ref')!;

    // Fire-and-forget click tracking via edge-compatible fetch
    // (Don't block the page load — tracking is best-effort)
    const trackUrl = new URL('/api/referral/track-click', request.url);
    trackUrl.searchParams.set('ref', refCode);
    trackUrl.searchParams.set('platform', searchParams.get('utm_source') || 'other');

    // Use waitUntil if available (Vercel Edge), otherwise fire-and-forget
    try {
      fetch(trackUrl.toString(), { method: 'POST' });
    } catch {
      // Silently fail — click tracking is non-critical
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/sign',
};
```

**Click tracking API route:**

```typescript
// apps/web/app/api/referral/track-click/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref');
  const platform = request.nextUrl.searchParams.get('platform') || 'other';

  if (!ref || !/^CONF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(ref)) {
    return NextResponse.json({ error: 'Invalid ref code' }, { status: 400 });
  }

  const validPlatforms = ['facebook', 'twitter', 'whatsapp', 'email', 'copy', 'other'];
  const normalizedPlatform = validPlatforms.includes(platform) ? platform : 'other';

  const supabase = createClient();

  // Upsert: create referral row if it doesn't exist, increment clicks if it does
  const { error } = await supabase.rpc('track_referral_click', {
    p_referral_code: ref,
    p_platform: normalizedPlatform,
  });

  if (error) {
    console.error('Referral click tracking failed:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }

  // Increment global click metric
  await supabase.rpc('increment_metric', { p_metric: 'referral_click_count' });

  return NextResponse.json({ ok: true });
}
```

**Supporting RPC function:**

```sql
-- Track a referral link click — upsert per code+platform, increment clicks
CREATE OR REPLACE FUNCTION track_referral_click(
  p_referral_code text,
  p_platform referral_platform
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Look up the referrer's signature ID
  SELECT id INTO v_referrer_id
  FROM signatures
  WHERE referral_code = p_referral_code
  AND deleted_at IS NULL;

  IF v_referrer_id IS NULL THEN
    RETURN; -- Invalid code — silently ignore
  END IF;

  -- Upsert: create row if new code+platform combo, otherwise increment clicks
  INSERT INTO referrals (referrer_signature_id, referral_code, platform, clicks)
  VALUES (v_referrer_id, p_referral_code, p_platform, 1)
  ON CONFLICT (referral_code, platform)
  DO UPDATE SET
    clicks = referrals.clicks + 1,
    updated_at = now();
END;
$$;
```

**Metric increment helper** (referenced above and throughout):

```sql
-- Generic metric incrementer
CREATE OR REPLACE FUNCTION increment_metric(p_metric metric_type)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaign_metrics
  SET value = value + 1, recorded_at = now()
  WHERE metric = p_metric;
END;
$$;
```

### 1.5 UTM Parameter Integration

Share links include UTM parameters for analytics attribution. The `utm_source` parameter is also used to infer the referral platform for click tracking:

| Platform | UTM Parameters |
|---|---|
| Facebook | `utm_source=facebook&utm_medium=social&utm_campaign=referral` |
| Twitter/X | `utm_source=twitter&utm_medium=social&utm_campaign=referral` |
| WhatsApp | `utm_source=whatsapp&utm_medium=social&utm_campaign=referral` |
| Email | `utm_source=email&utm_medium=referral&utm_campaign=referral` |
| Copy Link | `utm_source=copy&utm_medium=social&utm_campaign=referral` |

Full referral URL example:
```
https://confluenceohio.org/sign?ref=CONF-7KMN&utm_source=twitter&utm_medium=social&utm_campaign=referral
```

---

## 2. Share Buttons

### 2.1 Share Button Component

A single reusable `<ShareButtons>` component is used in three locations:

1. **Thank-you page** (`/sign/thank-you`) — primary placement, highest engagement moment
2. **Petition page** (`/sign`) — below-fold reinforcement for visitors who haven't signed
3. **Voice submission pages** (`/voices/[slug]`) — share individual community perspectives

The component accepts context props to customize the share message:

```typescript
// packages/ui/components/share-buttons.tsx

interface ShareButtonsProps {
  /** The URL to share (includes ref code if available) */
  shareUrl: string;
  /** Context for message customization */
  context: 'post-signature' | 'petition-page' | 'voice-story';
  /** Signer number (for post-signature context) */
  signerNumber?: number;
  /** Voice story title (for voice-story context) */
  storyTitle?: string;
  /** Referral code (included in share URL) */
  referralCode?: string;
  /** Layout: horizontal row or vertical stack */
  layout?: 'horizontal' | 'vertical';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}
```

### 2.2 Platform-Specific Share Messages

Each platform gets a tailored message optimized for its conventions and character limits.

#### Post-Signature Context (Thank-You Page)

| Platform | URL / Parameters | Pre-populated Message |
|---|---|---|
| **Twitter/X** | `https://x.com/intent/tweet?text={text}&url={url}&hashtags=ConfluenceOhio&via=confluenceohio` | `"I just signed the petition to rename Columbus to Confluence, Ohio — a name that actually describes our city. Add your name:"` (178 chars + URL) |
| **Facebook** | `https://www.facebook.com/sharer/sharer.php?u={url}` | (No custom text — Facebook uses OG tags from the share URL. The share URL is the petition page, whose OG tags are optimized for this.) |
| **WhatsApp** | `https://wa.me/?text={text}` | `"Hey! I just signed the petition to rename Columbus to Confluence, Ohio. It's the actual geographic name for where the Scioto and Olentangy rivers meet — where the city was founded. Check it out and add your name: {url}"` |
| **Email** | `mailto:?subject={subject}&body={body}` | Subject: `"I signed — will you?"` Body: `"I just added my name to the Confluence Ohio petition. The idea is to rename Columbus after the confluence of the Scioto and Olentangy rivers — the geographic feature that made the city possible.\n\nIt takes 30 seconds to sign: {url}\n\n— Sent by a fellow Ohioan"` |
| **Copy Link** | Clipboard API (`navigator.clipboard.writeText`) | Copies the full referral URL. Button label changes to "Copied!" for 2 seconds. |

#### Petition Page Context (Pre-Signature)

| Platform | Pre-populated Message |
|---|---|
| **Twitter/X** | `"Should Columbus, Ohio become Confluence, Ohio? The rivers that made the city have a better story than the man it was named for. See the case:"` |
| **Facebook** | (OG tags) |
| **WhatsApp** | `"Have you seen this? There's a petition to rename Columbus to Confluence — after the rivers that made the city. I thought you'd find it interesting: {url}"` |
| **Email** | Subject: `"What do you think about this?"` Body: `"There's a campaign to rename Columbus to Confluence, Ohio — after the confluence of the Scioto and Olentangy rivers. Whether you're for or against, the case is worth reading: {url}"` |

#### Voice Story Context

| Platform | Pre-populated Message |
|---|---|
| **Twitter/X** | `"'{storyTitle}' — a perspective on renaming Columbus to Confluence, Ohio:"` |
| **Facebook** | (OG tags) |
| **WhatsApp** | `"Read this perspective on the Columbus → Confluence question: '{storyTitle}' {url}"` |
| **Email** | Subject: `"A perspective on the Columbus renaming question"` Body: `"I thought you'd find this interesting — it's one person's take on whether Columbus should become Confluence, Ohio:\n\n{storyTitle}\n{url}"` |

### 2.3 Share URL Construction

```typescript
// packages/core/sharing/build-share-url.ts

interface ShareUrlParams {
  platform: 'facebook' | 'twitter' | 'whatsapp' | 'email' | 'copy';
  pageUrl: string;
  text?: string;
  subject?: string;
  body?: string;
  hashtags?: string[];
  via?: string; // Twitter handle without @
}

export function buildShareUrl(params: ShareUrlParams): string {
  const { platform, pageUrl, text, subject, body, hashtags, via } = params;

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;

    case 'twitter': {
      const twitterParams = new URLSearchParams();
      if (text) twitterParams.set('text', text);
      twitterParams.set('url', pageUrl);
      if (hashtags?.length) twitterParams.set('hashtags', hashtags.join(','));
      if (via) twitterParams.set('via', via);
      return `https://x.com/intent/tweet?${twitterParams.toString()}`;
    }

    case 'whatsapp':
      // WhatsApp expects text + URL in a single 'text' param
      return `https://wa.me/?text=${encodeURIComponent(`${text} ${pageUrl}`)}`;

    case 'email': {
      const emailParams = new URLSearchParams();
      if (subject) emailParams.set('subject', subject);
      if (body) emailParams.set('body', body.replace('{url}', pageUrl));
      return `mailto:?${emailParams.toString()}`;
    }

    case 'copy':
      return pageUrl; // Handled by clipboard API, not a URL

    default:
      return pageUrl;
  }
}
```

### 2.4 Web Share API Integration

On mobile devices that support the Web Share API, offer a native share sheet as the *primary* share action, with individual platform buttons as fallback.

```typescript
// packages/ui/components/share-buttons.tsx — Web Share API logic

const [canNativeShare, setCanNativeShare] = useState(false);

useEffect(() => {
  // Feature detection — only available in secure contexts (HTTPS)
  setCanNativeShare(
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  );
}, []);

async function handleNativeShare() {
  const shareData = {
    title: 'Confluence Ohio — Sign the Petition',
    text: getShareText(context), // Context-appropriate message
    url: shareUrl,
  };

  // Verify the data is shareable before attempting
  if (navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      trackShareEvent('native', context);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // User cancelled — not an error. Log other errors.
        console.error('Native share failed:', err);
      }
    }
  }
}
```

**Rendering logic:**

```tsx
// Mobile: show native share button + individual buttons below
// Desktop: show individual buttons only (Web Share API has limited desktop support)

return (
  <div className={cn('share-buttons', layout === 'vertical' ? 'flex-col' : 'flex-row')}>
    {/* Native share — mobile only */}
    {canNativeShare && (
      <button
        onClick={handleNativeShare}
        className="share-btn share-btn--native"
        aria-label="Share via your device's share menu"
      >
        <ShareIcon /> Share
      </button>
    )}

    {/* Platform-specific buttons — always visible */}
    <div className="share-btn-group" role="group" aria-label="Share on social media">
      <ShareButton platform="facebook" url={facebookUrl} label="Share on Facebook" />
      <ShareButton platform="twitter" url={twitterUrl} label="Share on X (Twitter)" />
      <ShareButton platform="whatsapp" url={whatsappUrl} label="Share on WhatsApp" />
      <ShareButton platform="email" url={emailUrl} label="Share via Email" />
      <CopyLinkButton url={shareUrl} />
    </div>
  </div>
);
```

### 2.5 Copy Link Button

The copy button uses the Clipboard API with a fallback for older browsers:

```typescript
// packages/ui/components/copy-link-button.tsx

'use client';

import { useState, useCallback } from 'react';

interface CopyLinkButtonProps {
  url: string;
  className?: string;
}

export function CopyLinkButton({ url, className }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers or non-HTTPS (dev)
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      trackShareEvent('copy', 'button');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [url]);

  return (
    <button
      onClick={handleCopy}
      className={cn('share-btn share-btn--copy', className)}
      aria-label={copied ? 'Link copied to clipboard' : 'Copy share link'}
      aria-live="polite"
    >
      {copied ? (
        <>
          <CheckIcon aria-hidden="true" /> Copied!
        </>
      ) : (
        <>
          <LinkIcon aria-hidden="true" /> Copy Link
        </>
      )}
    </button>
  );
}
```

### 2.6 Share Event Tracking

Every share button click fires an analytics event for PostHog:

```typescript
// packages/core/sharing/track-share-event.ts

export function trackShareEvent(
  platform: 'facebook' | 'twitter' | 'whatsapp' | 'email' | 'copy' | 'native',
  context: 'post-signature' | 'petition-page' | 'voice-story',
  metadata?: { referralCode?: string; signerNumber?: number }
) {
  // PostHog event
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('share_button_click', {
      platform,
      context,
      referral_code: metadata?.referralCode,
      signer_number: metadata?.signerNumber,
      page_url: window.location.pathname,
    });
  }

  // Also fire the server-side referral click tracker if this is a share
  // with a referral code (to pre-populate the referrals table row)
  if (metadata?.referralCode) {
    fetch(`/api/referral/track-click?ref=${metadata.referralCode}&platform=${platform}`, {
      method: 'POST',
      keepalive: true, // Survives page navigation
    }).catch(() => {}); // Best-effort
  }
}
```

### 2.7 Accessibility Requirements

- All share buttons have descriptive `aria-label` attributes (e.g., "Share on Facebook").
- Button group is wrapped in `role="group"` with `aria-label="Share on social media"`.
- Copy link button uses `aria-live="polite"` to announce "Copied!" to screen readers.
- Focus styles are visible on all buttons (2px outline, offset from button edge).
- Share buttons are keyboard-navigable (Tab key cycles through, Enter/Space activates).
- Icons are decorative (`aria-hidden="true"`) — labels carry the meaning.
- Color contrast on all button states meets WCAG 2.1 AA (4.5:1 for text, 3:1 for large text/icons).

---

## 3. Open Graph Implementation

### 3.1 Default OG Tags (All Pages)

Every page includes base OG tags via a shared metadata utility. Next.js App Router's `generateMetadata` function handles this at the layout level.

```typescript
// apps/web/app/layout.tsx — base metadata

import type { Metadata } from 'next';

const BASE_URL = 'https://confluenceohio.org';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Confluence Ohio — Rename Columbus After Its Rivers',
    template: '%s | Confluence Ohio',
  },
  description:
    'Join the campaign to rename Columbus, Ohio to Confluence — the geographic name for where the Scioto and Olentangy rivers meet. Sign the petition.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Confluence Ohio',
    title: 'Confluence Ohio — Rename Columbus After Its Rivers',
    description:
      'Columbus sits at the confluence of the Scioto and Olentangy rivers. The rivers made the city. Now the city can take their name. Sign the petition.',
    images: [
      {
        url: '/og/default.png', // Static default OG image (1200×630)
        width: 1200,
        height: 630,
        alt: 'Confluence Ohio — where the Scioto and Olentangy rivers meet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@confluenceohio',
    title: 'Confluence Ohio — Rename Columbus After Its Rivers',
    description:
      'Columbus sits at the confluence of the Scioto and Olentangy rivers. Sign the petition to give the city a name that tells its real story.',
    images: ['/og/default.png'],
  },
};
```

### 3.2 Page-Specific OG Overrides

Each page's `generateMetadata` function overrides the defaults with page-specific content:

| Page | OG Title | OG Description | OG Image |
|---|---|---|---|
| `/` (Homepage) | Confluence Ohio — Rename Columbus After Its Rivers | Columbus sits at the confluence of the Scioto and Olentangy rivers. Sign the petition. | `/og/default.png` (static) |
| `/sign` | Sign the Petition — Confluence Ohio | Join [X] Ohioans who've signed. Help us reach [milestone]. | `/og/petition.png` (dynamic — shows count) |
| `/the-case` | Why Rename Columbus? | The rivers, the history, and the case for Confluence. | `/og/the-case.png` (static) |
| `/the-case/history` | How Columbus Got Its Name — And Why It's Time for a New One | In 1812, a tavern owner named Joseph Foos suggested naming Ohio's new capital after Christopher Columbus. | `/og/history.png` (static) |
| `/the-case/the-rivers` | The Confluence — Where the Scioto Meets the Olentangy | Two rivers made this city possible. Their meeting point deserves to be the city's name. | `/og/rivers.png` (static) |
| `/voices` | Community Voices — Confluence Ohio | Hear from supporters, opponents, and the undecided. Every perspective matters. | `/og/voices.png` (static) |
| `/voices/[slug]` | "{title}" — Confluence Ohio Voices | {First 150 chars of body}... | `/og/voice/[slug].png` (dynamic) |
| `/blog/[slug]` | {Post title} | {Post excerpt} | `/og/blog/[slug].png` (dynamic) |
| `/volunteer` | Volunteer — Confluence Ohio | Signature collectors, social amplifiers, neighborhood captains. Find your role. | `/og/volunteer.png` (static) |
| `/donate` | Support the Campaign — Confluence Ohio | Every dollar funds signature collection, legal review, and community outreach. | `/og/donate.png` (static) |
| `/faq` | FAQ — Confluence Ohio | Common questions about renaming Columbus to Confluence, answered. | `/og/faq.png` (static) |

### 3.3 Dynamic OG Image Generation

Dynamic OG images are generated server-side using Next.js `ImageResponse` (from `next/og`). They render JSX to a 1200×630 PNG at the edge.

**Petition page dynamic OG image** — shows the live signature count:

```typescript
// apps/web/app/og/petition.png/route.tsx

import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// Revalidate every 5 minutes — balance freshness vs. compute cost
export const revalidate = 300;

export async function GET() {
  const supabase = createClient();

  // Fetch current signature count from campaign_metrics
  const { data } = await supabase
    .from('campaign_metrics')
    .select('value')
    .eq('metric', 'signature_count')
    .single();

  const signatureCount = data?.value ?? 0;
  const formattedCount = signatureCount.toLocaleString('en-US');

  // Determine next milestone
  const milestones = [1000, 2500, 5000, 10000, 15000, 22000];
  const nextMilestone = milestones.find((m) => m > signatureCount) ?? 22000;
  const progress = Math.min((signatureCount / nextMilestone) * 100, 100);

  // Load custom font (subset for numbers + common chars)
  const fontBold = await fetch(
    new URL('../../assets/fonts/Inter-Bold.woff', import.meta.url)
  ).then((res) => res.arrayBuffer());

  const fontRegular = await fetch(
    new URL('../../assets/fonts/Inter-Regular.woff', import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 100%)',
          color: 'white',
          fontFamily: 'Inter',
          padding: '60px',
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            opacity: 0.8,
            marginBottom: 20,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Confluence Ohio
        </div>

        {/* Signature count */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          {formattedCount}
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            opacity: 0.9,
            marginBottom: 40,
          }}
        >
          Ohioans have signed the petition
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '80%',
            height: 16,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #60a5fa, #34d399)',
              borderRadius: 8,
            }}
          />
        </div>

        <div
          style={{
            fontSize: 24,
            marginTop: 16,
            opacity: 0.7,
          }}
        >
          Help us reach {nextMilestone.toLocaleString('en-US')}
        </div>

        {/* CTA */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginTop: 40,
            padding: '16px 48px',
            background: '#2563eb',
            borderRadius: 12,
          }}
        >
          Add Your Name →
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: fontBold, weight: 700, style: 'normal' },
        { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
      ],
    }
  );
}
```

**Voice story dynamic OG image:**

```typescript
// apps/web/app/og/voice/[slug]/route.tsx

import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createClient();

  const { data: voice } = await supabase
    .from('voice_submissions')
    .select('title, author_name, author_neighborhood, position')
    .eq('slug', slug)
    .eq('moderation_status', 'approved')
    .maybeSingle();

  if (!voice) {
    // Fallback to default OG image
    return new Response(null, { status: 302, headers: { Location: '/og/voices.png' } });
  }

  const positionLabel = {
    support: 'Supports renaming',
    oppose: 'Opposes renaming',
    undecided: 'Undecided',
  }[voice.position];

  const positionColor = {
    support: '#34d399',
    oppose: '#f87171',
    undecided: '#fbbf24',
  }[voice.position];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 100%)',
          color: 'white',
          fontFamily: 'Inter',
          padding: '60px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 24, opacity: 0.7, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Community Voices
          </div>
          <div
            style={{
              fontSize: 20,
              padding: '8px 20px',
              borderRadius: 20,
              background: positionColor,
              color: '#1e293b',
              fontWeight: 600,
            }}
          >
            {positionLabel}
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.2, maxWidth: '90%' }}>
          &ldquo;{voice.title}&rdquo;
        </div>

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 400 }}>
            {voice.author_name}
            {voice.author_neighborhood ? ` · ${voice.author_neighborhood}` : ''}
          </div>
        </div>

        {/* Brand footer */}
        <div style={{ fontSize: 22, opacity: 0.6 }}>confluenceohio.org/voices</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

### 3.4 Dynamic Metadata for Pages with OG Images

**Petition page metadata** (uses the dynamic OG image):

```typescript
// apps/web/app/sign/page.tsx — generateMetadata

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createClient();

  const { data } = await supabase
    .from('campaign_metrics')
    .select('value')
    .eq('metric', 'signature_count')
    .single();

  const count = data?.value ?? 0;
  const formatted = count.toLocaleString('en-US');

  // Next milestone for description
  const milestones = [1000, 2500, 5000, 10000, 15000, 22000];
  const next = milestones.find((m) => m > count) ?? 22000;

  return {
    title: 'Sign the Petition',
    description: `${formatted} Ohioans have signed. Help us reach ${next.toLocaleString('en-US')} to put the question on the ballot.`,
    openGraph: {
      title: `${formatted} Ohioans Have Signed — Add Your Name`,
      description: `Join ${formatted} people who want Columbus to become Confluence, Ohio. 22,000 signatures puts the question on the ballot.`,
      images: [
        {
          url: '/og/petition.png', // Dynamic route
          width: 1200,
          height: 630,
          alt: `${formatted} signatures on the Confluence Ohio petition`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${formatted} Ohioans Have Signed — Add Your Name`,
      description: `Join ${formatted} people who want Columbus to become Confluence, Ohio.`,
      images: ['/og/petition.png'],
    },
  };
}
```

**Voice story page metadata:**

```typescript
// apps/web/app/voices/[slug]/page.tsx — generateMetadata

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createClient();

  const { data: voice } = await supabase
    .from('voice_submissions')
    .select('title, body, author_name, position')
    .eq('slug', slug)
    .eq('moderation_status', 'approved')
    .maybeSingle();

  if (!voice) {
    return { title: 'Story Not Found' };
  }

  const excerpt = voice.body.slice(0, 155).replace(/\s+\S*$/, '') + '…';

  return {
    title: voice.title,
    description: excerpt,
    openGraph: {
      title: `"${voice.title}" — Confluence Ohio Voices`,
      description: excerpt,
      type: 'article',
      images: [
        {
          url: `/og/voice/${slug}`,
          width: 1200,
          height: 630,
          alt: `Community perspective: ${voice.title}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `"${voice.title}" — Confluence Ohio Voices`,
      description: excerpt,
      images: [`/og/voice/${slug}`],
    },
  };
}
```

### 3.5 OG Image Caching Strategy

| Image Type | Cache Strategy | Revalidation |
|---|---|---|
| Static pages (`/og/default.png`, `/og/the-case.png`, etc.) | Build-time generated, CDN-cached indefinitely | Manual rebuild on content change |
| Petition count (`/og/petition.png`) | Edge-cached with `revalidate: 300` (5 minutes) | Automatic — stale count is acceptable for social preview cards |
| Voice stories (`/og/voice/[slug]`) | Edge-cached with `revalidate: 3600` (1 hour) | Content doesn't change after approval |
| Blog posts (`/og/blog/[slug]`) | Edge-cached with `revalidate: 86400` (24 hours) | Blog content rarely changes after publish |

### 3.6 OG Validation Checklist

Before launch, validate all OG implementations using:

1. **Facebook Sharing Debugger** — `https://developers.facebook.com/tools/debug/` — scrape each URL, verify title/description/image render correctly.
2. **Twitter Card Validator** — `https://cards-dev.twitter.com/validator` — verify `summary_large_image` card renders.
3. **LinkedIn Post Inspector** — `https://www.linkedin.com/post-inspector/` — verify OG tags parse correctly.
4. **WhatsApp** — send a link in a private chat, verify preview image and text appear.
5. **Open Graph Preview** — `https://www.opengraph.xyz/` — quick visual preview across platforms.

**Automated check:** Add an integration test that fetches each page's HTML, parses `<meta>` tags, and asserts that `og:title`, `og:description`, `og:image`, `og:url`, and `twitter:card` are present and non-empty.

---

## 4. Referral Dashboard (Stretch Goal)

A lightweight dashboard visible to authenticated signers showing their referral impact. This is a Phase 1 stretch goal — implement only after core sharing mechanics are solid.

### 4.1 Signer Referral Stats Page

Route: `/sign/my-referrals?ref=CONF-XXXX`

This is an unauthenticated page — the referral code in the URL acts as a weak access token. Since the data shown is non-sensitive (count of referrals, not identities), this is acceptable. The URL is only known to the signer (from their confirmation email and share buttons).

**Content:**

```
Your Impact

You've referred [X] people who signed the petition.
[Progress bar: X / next milestone]

Your share link:
https://confluenceohio.org/sign?ref=CONF-XXXX
[Copy Link]

Share again to grow your impact:
[Share buttons]
```

**Milestones with encouragement:**

| Referrals | Message |
|---|---|
| 0 | "Share your link to get started. Every signature counts." |
| 1–2 | "You're making a difference! Keep sharing." |
| 3–4 | "You've brought [X] people into the movement." |
| 5–9 | "Amazing — you're one of our top referrers!" |
| 10+ | "You're a Confluence champion! [X] people signed because of you." |

### 4.2 API Route for Referral Stats

```typescript
// apps/web/app/api/referral/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref');

  if (!ref || !/^CONF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(ref)) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
  }

  const supabase = createClient();

  // Verify the referral code exists
  const { data: signer } = await supabase
    .from('signatures')
    .select('id, first_name, referral_code')
    .eq('referral_code', ref)
    .is('deleted_at', null)
    .maybeSingle();

  if (!signer) {
    return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
  }

  // Count total conversions
  const { count: totalReferrals } = await supabase
    .from('signatures')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by_code', ref)
    .is('deleted_at', null);

  // Count total clicks across platforms
  const { data: referralRows } = await supabase
    .from('referrals')
    .select('platform, clicks, conversions')
    .eq('referral_code', ref);

  const totalClicks = referralRows?.reduce((sum, r) => sum + r.clicks, 0) ?? 0;
  const platformBreakdown = referralRows?.map((r) => ({
    platform: r.platform,
    clicks: r.clicks,
    conversions: r.conversions,
  })) ?? [];

  return NextResponse.json({
    referralCode: ref,
    firstName: signer.first_name,
    totalReferrals: totalReferrals ?? 0,
    totalClicks,
    platformBreakdown,
    conversionRate: totalClicks > 0
      ? Math.round(((totalReferrals ?? 0) / totalClicks) * 100)
      : 0,
  });
}
```

### 4.3 Leaderboard (Opt-In Only)

A public leaderboard of top referrers, accessible at `/sign/leaderboard`. **Participation is opt-in** — signers must explicitly choose to appear. The leaderboard shows first name + last initial only (never full name, city, or address). City was considered but since nearly all signers will be from Columbus/Franklin County, it adds no differentiation.

**Database addition:**

```sql
-- Add opt-in column to signatures table
ALTER TABLE signatures
ADD COLUMN leaderboard_opt_in boolean NOT NULL DEFAULT false;
```

**Leaderboard query:**

```sql
-- Top 25 referrers who opted in
SELECT
  s.first_name,
  LEFT(s.last_name, 1) AS last_initial,
  COUNT(r.id) AS referral_count
FROM signatures s
JOIN signatures r ON r.referred_by_code = s.referral_code AND r.deleted_at IS NULL
WHERE s.leaderboard_opt_in = true
  AND s.deleted_at IS NULL
GROUP BY s.id, s.first_name, LEFT(s.last_name, 1)
ORDER BY referral_count DESC
LIMIT 25;
```

**Display:**

```
Top Referrers

1. Sarah M. — 47 referrals
2. Marcus T. — 31 referrals
3. Priya K. — 28 referrals
...
```

**Opt-in mechanism:** A checkbox on the thank-you page or the referral stats page: "Show me on the leaderboard (first name and last initial only)." Default: unchecked.

---

## 5. Referral Notification Emails

### 5.1 Individual Referral Notification

Triggered by `referral/conversion.notify` Inngest event (§1.3). Sent via Brevo transactional API.

**Template:**

```
Subject: [newSignerFirstName] just signed thanks to you!

Hi [referrerFirstName],

Great news — [newSignerFirstName] from [newSignerCity] just signed the Confluence Ohio petition because you shared your link.

That's [totalReferrals] people you've brought to the movement.

Keep the momentum going — share again:

[Share buttons / share URL]

— The Confluence Ohio Team

---
You're receiving this because you signed the Confluence Ohio petition and opted into campaign updates.
Unsubscribe: [link]
```

### 5.2 Hourly Digest (High Volume)

Triggered by `referral/digest.queued` Inngest event when a referrer has 5+ conversions in an hour (§1.3). Batched and sent once per hour.

```typescript
// packages/core/inngest/functions/send-referral-digest.ts

export const sendReferralDigest = inngest.createFunction(
  {
    id: 'send-referral-digest',
    name: 'Send Referral Digest',
    // Debounce: wait 60 minutes after first event, then send digest
    debounce: {
      key: 'event.data.referralCode',
      period: '60m',
    },
  },
  { event: 'referral/digest.queued' },
  async ({ event, step }) => {
    const { referrerEmail, referrerFirstName, referralCode } = event.data;

    const recentConversions = await step.run('count-recent', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('signatures')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by_code', referralCode)
        .gte('signed_at', oneHourAgo);
      return count ?? 0;
    });

    await step.run('send-digest-email', async () => {
      await brevoAdapter.sendTransactional({
        templateId: REFERRAL_DIGEST_TEMPLATE_ID,
        to: referrerEmail,
        params: {
          firstName: referrerFirstName,
          recentCount: recentConversions,
          shareUrl: `https://confluenceohio.org/sign?ref=${referralCode}`,
        },
      });
    });
  }
);
```

**Digest template:**

```
Subject: Your link is on fire — [recentCount] new signatures this hour!

Hi [firstName],

Your share link is spreading! [recentCount] people signed the Confluence Ohio petition
in the last hour because of you.

Keep the momentum going:

[Share URL]

— The Confluence Ohio Team
```

---

## 6. Implementation Architecture Summary

### 6.1 File Structure

```
apps/web/
├── app/
│   ├── api/
│   │   └── referral/
│   │       ├── track-click/route.ts    # Click tracking endpoint
│   │       └── stats/route.ts          # Referral stats endpoint
│   ├── og/
│   │   ├── petition.png/route.tsx      # Dynamic petition OG image
│   │   ├── voice/[slug]/route.tsx      # Dynamic voice OG image
│   │   └── blog/[slug]/route.tsx       # Dynamic blog OG image
│   ├── sign/
│   │   ├── my-referrals/page.tsx       # Referral stats page
│   │   ├── leaderboard/page.tsx        # Public leaderboard (stretch)
│   │   └── thank-you/page.tsx          # (Updated with share buttons)
│   └── middleware.ts                   # (Updated with referral click tracking)
│
packages/
├── core/
│   ├── referral/
│   │   ├── generate-code.ts            # CONF-XXXX generator (exists in Artifact 06)
│   │   └── types.ts                    # Referral-related type definitions
│   ├── sharing/
│   │   ├── build-share-url.ts          # Platform-specific URL builder
│   │   ├── share-messages.ts           # Pre-populated messages by context
│   │   └── track-share-event.ts        # PostHog event tracking
│   └── inngest/functions/
│       ├── track-referral-conversion.ts  # Referral conversion handler
│       └── send-referral-digest.ts       # Hourly digest batching
│
├── ui/components/
│   ├── share-buttons.tsx               # Reusable share button group
│   └── copy-link-button.tsx            # Copy-to-clipboard button
│
└── db/migrations/
    └── YYYYMMDDHHMMSS_add_referral_functions.sql  # RPC functions + leaderboard column
```

### 6.2 Data Flow Diagram

```
                 Signer shares link
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   Facebook          Twitter        WhatsApp
   sharer.php     x.com/intent     wa.me/?text
        │               │               │
        └───────────────┼───────────────┘
                        │
                        ▼
        confluenceohio.org/sign?ref=CONF-XXXX
                &utm_source=twitter (etc.)
                        │
                  ┌─────┴─────┐
                  ▼           ▼
            Middleware     Page renders
          (fire & forget)   /sign form
                  │           │
                  ▼           │
         POST /api/referral   │
          /track-click        │
                  │           │
                  ▼           ▼
          referrals.clicks   ref stored in
          incremented       hidden field
                              │
                              ▼
                     Visitor signs petition
                              │
                              ▼
                    POST /api/petition/sign
                    (referred_by_code = CONF-XXXX)
                              │
                              ▼
                    Inngest: petition/signature.created
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             Increment             Notify referrer
        referral conversions    (individual or digest)
          + global metric
```

---

## Claude Code Handoff

### Handoff Prompt 1: Share Button Component and URL Builder

```
You are implementing the social sharing system for the Confluence Ohio campaign site (confluenceohio.org). Read these artifacts for context:
- docs/11-social-sharing-referral-tracking.md (this artifact — full spec)
- docs/06-petition-signing-flow.md (thank-you page where share buttons appear)
- docs/05-data-model.md (referrals table, referral_platform enum)

Implement the following files:

1. `packages/core/sharing/build-share-url.ts` — URL builder per §2.3 of Artifact 11. Accepts platform, pageUrl, text, subject, body, hashtags, via. Returns the correct share URL for each platform (Facebook sharer.php, X intent/tweet, WhatsApp wa.me, mailto:, and raw URL for copy).

2. `packages/core/sharing/share-messages.ts` — Pre-populated share messages per §2.2. Export a function `getShareMessages(context, options)` that returns platform-specific messages for the three contexts: post-signature, petition-page, voice-story. Use the exact copy from the spec.

3. `packages/ui/components/share-buttons.tsx` — React component per §2.1 and §2.4. Implements Web Share API with feature detection on mobile, individual platform buttons always visible, proper aria-labels, keyboard navigation. Uses the URL builder and message functions.

4. `packages/ui/components/copy-link-button.tsx` — Copy-to-clipboard button per §2.5. Uses Clipboard API with textarea fallback. Shows "Copied!" state for 2 seconds with aria-live="polite".

5. `packages/core/sharing/track-share-event.ts` — PostHog event tracking per §2.6. Fires share_button_click event and optionally POSTs to /api/referral/track-click.

All components should be accessible per §2.7: aria-labels, role="group", keyboard navigable, color contrast AA. Use TypeScript strict mode. No external UI library dependencies — use Tailwind classes only.

Write comprehensive unit tests for build-share-url.ts and share-messages.ts in packages/core/sharing/__tests__/.
```

### Handoff Prompt 2: Referral Click Tracking and Attribution

```
You are implementing referral click tracking for the Confluence Ohio campaign. Read Artifact 11 (docs/11-social-sharing-referral-tracking.md) §1.3-§1.5 and Artifact 05 (docs/05-data-model.md) for the referrals table schema.

Implement:

1. `apps/web/app/api/referral/track-click/route.ts` — POST endpoint per §1.4. Validates CONF-XXXX format, normalizes platform, calls the track_referral_click RPC to upsert the referrals row and increment clicks. Also increments the global referral_click_count metric.

2. `apps/web/middleware.ts` — UPDATE the existing middleware to add referral click tracking per §1.4. When a request hits /sign with a ref parameter, fire-and-forget a POST to /api/referral/track-click. Extract utm_source for platform attribution. Do NOT block page rendering.

3. `packages/db/migrations/YYYYMMDDHHMMSS_add_referral_functions.sql` — SQL migration containing:
   - track_referral_click(p_referral_code, p_platform) RPC function per §1.4
   - increment_metric(p_metric) helper function per §1.4
   - ALTER TABLE signatures ADD COLUMN leaderboard_opt_in boolean NOT NULL DEFAULT false (for §4.3)

4. Client-side sessionStorage fallback per §1.2: update the /sign page to store the ref parameter in sessionStorage when present, and retrieve it if the user navigates away and returns.

Rate-limit the track-click endpoint to 10 requests per IP per minute to prevent abuse. Validate referral codes against the CONF-XXXX regex before any DB call.
```

### Handoff Prompt 3: Dynamic OG Image Generation

```
You are implementing dynamic Open Graph image generation for the Confluence Ohio site. Read Artifact 11 §3.1-§3.6 and the Next.js ImageResponse docs (next/og).

Implement:

1. `apps/web/app/layout.tsx` — UPDATE with base metadata per §3.1. Set metadataBase, default title template, description, openGraph, and twitter card metadata.

2. `apps/web/app/og/petition.png/route.tsx` — Dynamic OG image per §3.3. Uses edge runtime, fetches signature_count from campaign_metrics, renders a 1200×630 image showing the count, progress bar toward next milestone, and CTA. Revalidates every 5 minutes. Load Inter font files.

3. `apps/web/app/og/voice/[slug]/route.tsx` — Dynamic voice story OG image per §3.3. Fetches the voice submission by slug, renders title in large text with author name and position badge. Falls back to redirect to /og/voices.png if not found.

4. `apps/web/app/sign/page.tsx` — UPDATE generateMetadata per §3.4 to return dynamic OG metadata with the current signature count.

5. `apps/web/app/voices/[slug]/page.tsx` — UPDATE generateMetadata per §3.4 to return voice-specific OG metadata.

Use ONLY flexbox layout in ImageResponse JSX (no CSS grid). Font files should be loaded from apps/web/assets/fonts/. Ensure all images are 1200×630. Add integration tests that verify the OG routes return 200 with content-type image/png.
```

### Handoff Prompt 4: Referral Conversion Tracking (Inngest)

```
You are implementing the Inngest functions for referral conversion tracking and notification emails. Read Artifact 11 §1.3 and §5.1-§5.2, plus Artifact 07 (docs/07-email-automation.md) for the Brevo adapter pattern.

Implement:

1. `packages/core/inngest/functions/track-referral-conversion.ts` — Inngest function per §1.3. Listens for petition/signature.created events with a non-null referredByCode. Increments the referrals table conversion counter and the global metric. Then determines whether to send an individual notification or queue for hourly digest (threshold: 5+ conversions per hour).

2. `packages/core/inngest/functions/send-referral-digest.ts` — Inngest function per §5.2. Uses Inngest debounce with key=referralCode, period=60m. Counts recent conversions, sends a digest email via Brevo.

3. Brevo email templates (template specs only — provide the HTML/text content and variable mappings for Tim to create in Brevo):
   - Referral notification (individual): template per §5.1
   - Referral digest (batch): template per §5.2

4. Register both functions in the Inngest client configuration (apps/web/app/api/inngest/route.ts).

Follow the existing Inngest patterns from Artifact 07. Use step.run() for each side effect. All Supabase calls should use the service_role key.
```

### Handoff Prompt 5: Referral Dashboard and Leaderboard (Stretch)

```
You are implementing the referral dashboard and leaderboard for the Confluence Ohio campaign. Read Artifact 11 §4.1-§4.3.

Implement:

1. `apps/web/app/api/referral/stats/route.ts` — GET endpoint per §4.2. Accepts ref query parameter, validates CONF-XXXX format, returns totalReferrals, totalClicks, platformBreakdown, and conversionRate. No authentication required (ref code acts as weak access token — data is non-sensitive).

2. `apps/web/app/sign/my-referrals/page.tsx` — Referral stats page per §4.1. Reads ref from query params, fetches /api/referral/stats, displays referral count with milestone messaging, share URL with copy button, and share buttons. Server-renders initial data, hydrates with client-side updates.

3. `apps/web/app/sign/leaderboard/page.tsx` — Public leaderboard per §4.3. Server-rendered page showing top 25 referrers (opt-in only) with first name, last initial, and referral count. Refreshes via ISR with revalidate: 300 (5 minutes).

4. Add the leaderboard opt-in checkbox to the thank-you page (/sign/thank-you): "Show me on the leaderboard (first name and last initial only)". Calls PATCH /api/referral/opt-in to update signatures.leaderboard_opt_in.

All pages must be mobile-first, accessible (WCAG 2.1 AA), and progressively enhanced (functional without JS). Use Tailwind for styling.
```

### Handoff Prompt 6: OG Validation Integration Tests

```
You are adding integration tests to validate Open Graph tags across the Confluence Ohio site. Read Artifact 11 §3.6.

Implement:

1. `apps/web/__tests__/og-validation.test.ts` — Integration test suite that:
   - Fetches HTML from every key page (/, /sign, /the-case, /the-case/history, /the-case/the-rivers, /the-case/columbus-legacy, /the-case/precedents, /the-case/the-process, /voices, /volunteer, /donate, /faq, /about, /press, /blog)
   - Parses <meta> tags from the HTML
   - Asserts og:title, og:description, og:image, og:url, og:type are present and non-empty
   - Asserts twitter:card is "summary_large_image"
   - Asserts twitter:title and twitter:image are present
   - Asserts og:image URLs return 200 with content-type image/png or image/jpeg
   - Asserts og:image dimensions are 1200×630 (via image metadata headers or downloading and checking)

2. `apps/web/__tests__/og-images.test.ts` — Tests for dynamic OG image routes:
   - GET /og/petition.png returns 200 with content-type image/png
   - GET /og/voice/[valid-slug] returns 200 with content-type image/png
   - GET /og/voice/[invalid-slug] returns 302 redirect to /og/voices.png

Use the project's existing test framework. Run against the dev server (or use Next.js test utilities). These tests should be included in CI.
```

---

## Technical Notes and Design Decisions

1. **Why fire-and-forget for click tracking:** Referral click tracking is best-effort analytics. It must never slow down the petition page load. A failed click track is invisible to the user and recoverable (we still capture the conversion via `referred_by_code`).

2. **Why sessionStorage for ref persistence:** The `ref` query parameter could be lost if the user navigates away from `/sign` before completing the form (e.g., reads `/the-case` first). Storing in `sessionStorage` preserves attribution for the browser session without cookies or server-side state. `sessionStorage` is intentionally chosen over `localStorage` — attribution should expire when the browser session ends.

3. **Why 5-minute revalidation for petition OG image:** Social platform crawlers cache OG images aggressively (Facebook caches for ~30 days unless you manually scrape via the Debugger). A 5-minute edge revalidation window means the image is fresh enough for organic sharing without generating an image on every request. For milestone moments (hitting 10K, 22K), Tim can manually flush the cache via the Facebook Sharing Debugger.

4. **Why no authentication on referral stats:** The referral code itself acts as a bearer token. The data revealed (referral count, click count) is non-sensitive. Adding auth would require signers to create accounts, which adds friction. The `CONF-XXXX` code space (810K possibilities) makes guessing impractical.

5. **Why Inngest debounce for digest emails:** Inngest's built-in debounce groups rapid-fire events by key, then fires once after the quiet period. This is more reliable than building custom batching logic and handles edge cases (crash recovery, exactly-once semantics) that a hand-rolled solution would miss.

6. **Twitter/X intent URL:** The spec uses `x.com/intent/tweet` (the current domain). Both `twitter.com/intent/tweet` and `x.com/intent/tweet` currently work and redirect to each other. Using `x.com` is future-proof; `twitter.com` may eventually stop redirecting.
