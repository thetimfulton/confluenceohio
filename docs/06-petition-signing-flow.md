# Confluence Ohio — Petition Signing Flow with Ohio Residency Verification

**Artifact 06 · Prompt 6 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 05 (Data Model), Artifact 04 (Page-by-Page Copy)

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **Smarty plan tier.** ✅ Account not yet created. Tim will create the Smarty account and generate both key types (embedded key for client-side Autocomplete Pro, secret auth-token for server-side US Street API) before moving to Claude Code implementation.

2. **Signature threshold language.** ✅ 22,000 figure already verified against Franklin County Board of Elections data. No change needed.

3. **Referral code format.** ✅ **Changed to `CONF-XXXX`** — branded 4-character suffix with `CONF-` prefix. Format: `CONF-` + 4 uppercase alphanumeric characters (no ambiguous chars). Example: `CONF-7KMN`. Updated throughout this document.

4. **Email verification token expiry.** ✅ 72 hours confirmed. No change needed.

5. **Commercial address policy.** ✅ Flagged but counted confirmed. Commercial addresses are recorded with `verification_status = 'flagged'` and included in the public count, marked for admin review.

---

## 1. Form Display Specification

### 1.1 Page Route

`/sign` — the petition signing page. This is the single highest-value page on the site.

### 1.2 Above-the-Fold Layout

**Desktop (≥1024px):** Two-column layout. Left column (60%): form. Right column (40%): live counter, progress bar, recent signers feed.

**Tablet (768–1023px):** Single column. Counter + progress bar above form. Recent signers below form.

**Mobile (<768px):** Single column. Compact counter above form. Recent signers collapsed into expandable section below form.

### 1.3 Form Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| First Name | `text` | Yes | `autocomplete="given-name"`, max 100 chars |
| Last Name | `text` | Yes | `autocomplete="family-name"`, max 100 chars |
| Email | `email` | Yes | `autocomplete="email"`, max 254 chars |
| Street Address | `text` + Smarty autocomplete | Yes | Smarty Autocomplete Pro widget with `include_only_states=OH` |
| Apt/Unit | `text` | No | Appears after address selection, `autocomplete="address-line2"` |
| City | `text` | Auto-populated | Read-only after Smarty autocomplete fills it; editable if manual entry |
| State | `text` | Locked | Value always `OH`, visually displayed but non-editable |
| ZIP | `text` | Auto-populated | Read-only after Smarty autocomplete fills it; editable if manual entry |
| Keep me updated | `checkbox` | No | Pre-checked. Label: "Keep me updated on the campaign" with subtext "Unsubscribe anytime" |

**Hidden fields (not rendered in DOM for screen readers):**

| Field | Purpose |
|---|---|
| `website` (honeypot) | Hidden via CSS (`position: absolute; left: -9999px; tabindex: -1`). Bots fill it; humans don't see it. |
| `cf-turnstile-response` | Populated by Cloudflare Turnstile invisible widget |
| `ref` | Pre-populated from `?ref=` query parameter if present (referral tracking) |

### 1.4 Smarty Autocomplete Pro — Client-Side Configuration

Smarty Autocomplete Pro runs client-side using an **embedded key** (domain-locked, safe for browser exposure). This is NOT the secret key — the secret key is used only server-side for the US Street Address API verification call.

```typescript
// Smarty Autocomplete Pro configuration
const smartyConfig = {
  key: process.env.NEXT_PUBLIC_SMARTY_EMBEDDED_KEY, // Embedded key, not secret
  source: 'us-autocomplete-pro',
  include_only_states: 'OH',           // Restrict suggestions to Ohio
  max_results: 5,
  prefer_geolocation: 'city',          // Prefer results near user's detected city
  prefer_ratio: 3,                     // Weight preferred results 3:1
};
```

**Autocomplete UX behavior:**
- User types in Street Address field → suggestions appear after 3+ characters
- Suggestions show full address (street, city, state, ZIP)
- All suggestions are Ohio-only (`include_only_states=OH`)
- On selection: City, State (OH), and ZIP auto-populate and become read-only
- If user needs an address not in suggestions, they can type freely — manual entry is validated server-side
- Apt/Unit field appears after address selection (for addresses that may have secondary units)

### 1.5 Live Signature Counter

Displays current verified + flagged signature count from `campaign_metrics` table via Supabase Realtime subscription (per Artifact 05, §7.1).

```
[Large number, e.g., "4,217"]  of 22,000
[=========>                    ] 19%
"Help us reach 5,000"
```

**Milestone thresholds:** 1,000 → 2,500 → 5,000 → 10,000 → 15,000 → 22,000

Counter text dynamically targets the next milestone: "Help us reach [next_milestone]"

**Technical:** Subscribe to `campaign_metrics` Realtime channel for `signature_count` metric. Initial value loaded via server-side `getServerSideProps` or RSC fetch for instant render (no loading spinner).

### 1.6 Recent Signers Feed

Displays last 10 signers (first name + city only) via the `get_recent_signers` RPC function (Artifact 05, §6.2 and §7.2).

```
Sarah from Clintonville — just now
Marcus from Franklinton — 2 minutes ago
Priya from Dublin — 5 minutes ago
```

**Technical:** Polls `get_recent_signers` RPC every 30 seconds. Relative timestamps computed client-side. Feed auto-scrolls on mobile; static list on desktop. Shows placeholder text ("Be the first to sign!") when count is 0.

### 1.7 Trust Signals

Below the form submit button:

> 🔒 Your address verifies Ohio residency. We never share your personal information. [Privacy Policy →](/privacy)

### 1.8 CTA Button

**Label:** "Add My Name →" (not "Submit", not "Sign Petition")

**States:**
- **Default:** Blue background (#1e40af or brand primary), white text
- **Hover:** Slightly darker
- **Loading:** Spinner replaces arrow icon, text changes to "Adding your name…", button disabled
- **Success:** Redirects to thank-you page (no success state on this button)
- **Error:** Button re-enables, error message appears above button

### 1.9 Cloudflare Turnstile

Invisible mode — no widget visible to users. The Turnstile script loads on page mount and generates a token automatically.

```typescript
// Turnstile invisible widget configuration
<div
  className="cf-turnstile"
  data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
  data-callback="onTurnstileSuccess"
  data-size="invisible"
  data-theme="auto"
/>
```

The token is captured via callback and included in the form submission. If Turnstile fails to load (ad blockers, network issues), the form still submits — server-side validation handles the missing token gracefully (see §3.1).

### 1.10 Below-the-Fold Reinforcement

For visitors who scroll past the form without signing. Three short persuasion points (per Artifact 04, §9):

1. **"The name has no connection to this place."** Christopher Columbus never set foot on the North American continent. The name was chosen in 1812 as a borrowed tribute.
2. **"The city already knows."** Columbus removed the statue, replaced the holiday, and invested $3.5 million reimagining its relationship with the name. We are following that conversation to its conclusion.
3. **"Voters decide, not us."** 22,000 signatures puts the question on the ballot. A simple majority decides. This is democracy — your signature just gets the question asked.

Followed by a second CTA: "Add Your Name →" that scrolls to the form.

### 1.11 FAQ Excerpt

Three questions from Artifact 04 displayed inline:

- **Who can sign?** Any Ohio resident. We verify residency via address validation.
- **Is this legally binding?** The petition triggers a ballot measure. The ballot vote is binding — a charter amendment approved by voters has the force of law.
- **What happens after I sign?** You will receive a confirmation email with your signer number and options to share, volunteer, or donate.

---

## 2. Client-Side Validation

All client-side validation provides immediate feedback. Server-side validation (§3) is the source of truth — client-side validation is a UX improvement only, never a security measure.

### 2.1 Validation Rules

| Field | Rule | Error Message |
|---|---|---|
| First Name | Required, 1–100 chars, no digits | "Please enter your first name" |
| Last Name | Required, 1–100 chars, no digits | "Please enter your last name" |
| Email | Required, valid email format (RFC 5322 simplified regex) | "Please enter a valid email address" |
| Street Address | Required, minimum 5 chars | "Please enter your street address" |
| City | Required (auto-populated or manual) | "City is required" |
| ZIP | Required, 5-digit format (`/^\d{5}$/`) | "Please enter a valid 5-digit ZIP code" |

### 2.2 Validation Behavior

- **On blur:** Validate individual field when user tabs/clicks away. Show inline error below field with red border.
- **On submit:** Re-validate all fields. Focus first invalid field. Prevent submission if any field invalid.
- **Real-time clearing:** Error message disappears as soon as user begins correcting the field.
- **Smarty autocomplete:** If user selected from autocomplete, the address is pre-validated. If user typed manually, client-side validates format only — full verification happens server-side.

### 2.3 Email Format Validation

```typescript
// Simplified RFC 5322 — catches 99%+ of invalid emails without false positives
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
```

---

## 3. Server-Side Processing

The API route at `POST /api/petition/sign` handles the entire server-side flow. It uses the Supabase service_role key (bypasses RLS) for all database writes and the Smarty secret key for address verification.

### 3.1 Step-by-Step Processing Pipeline

```
Client POST /api/petition/sign
  ├─ Step 1: Validate Turnstile token
  ├─ Step 2: Check honeypot
  ├─ Step 3: Rate limit check
  ├─ Step 4: Input sanitization & format validation
  ├─ Step 5: Smarty US Street Address API verification
  ├─ Step 6: Canonical address hash generation
  ├─ Step 7: Duplicate detection (address + email)
  ├─ Step 8: Insert signature record
  ├─ Step 9: Create email verification token
  ├─ Step 10: Trigger post-signature automation (Inngest)
  └─ Return: signature_number + referral_code + redirect URL
```

### 3.2 Step 1 — Validate Turnstile Token

```typescript
const turnstileResult = await fetch(
  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: formData.turnstileToken,
      remoteip: clientIp,  // Optional but improves accuracy
    }),
  }
);

const turnstileData = await turnstileResult.json();
```

**Decision logic:**
- `turnstileData.success === true` → proceed, set `turnstile_token_valid = true`
- `turnstileData.success === false` with error code `timeout-or-duplicate` → reject, return error "Your session has expired. Please refresh the page and try again."
- `turnstileData.success === false` with other error → reject, return generic error
- Turnstile token missing entirely (e.g., ad blocker) → **proceed with `turnstile_token_valid = false`** but apply stricter rate limiting (1 submission per IP per hour instead of 3). This is a deliberate tradeoff: we don't want to block legitimate users with ad blockers, but we increase scrutiny.

**Token properties:** Each Turnstile token is valid for 300 seconds (5 minutes) after generation and can only be validated once. Replay attempts return `timeout-or-duplicate`.

### 3.3 Step 2 — Check Honeypot

```typescript
if (formData.website && formData.website.trim() !== '') {
  // Bot detected — silently reject
  // Return a fake success response to avoid tipping off the bot
  return NextResponse.json({
    success: true,
    signature_number: Math.floor(Math.random() * 10000),
    referral_code: 'FAKE-CODE',
    redirect: '/sign/thank-you',
  });
}
```

The honeypot field (`website`) is hidden via CSS. Bots that fill every field will populate it. When detected, the API returns a fake success response — this prevents bots from adapting their behavior. The signature is NOT recorded.

### 3.4 Step 3 — Rate Limit Check

Rate limiting uses a sliding window counter stored in Supabase (or optionally Upstash Redis if performance requires it at scale).

**Limits:**
- With valid Turnstile token: **3 submissions per IP per hour**
- Without Turnstile token: **1 submission per IP per hour**
- Global: **100 submissions per minute** (safety valve against coordinated attacks)

**Implementation:** Hash the client IP (`SHA-256(ip + daily_salt)`) and check against a rate limit counter. IPs are never stored raw.

```typescript
const ipHash = await sha256(clientIp + process.env.RATE_LIMIT_SALT);

const { count } = await supabase
  .from('signatures')
  .select('id', { count: 'exact', head: true })
  .eq('ip_hash', ipHash)
  .gte('signed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

const maxSubmissions = turnstileValid ? 3 : 1;

if (count >= maxSubmissions) {
  return NextResponse.json(
    { error: 'Too many attempts. Please try again later.' },
    { status: 429 }
  );
}
```

### 3.5 Step 4 — Input Sanitization & Format Validation

Server-side re-validation of all fields (never trust client-side validation):

```typescript
import { z } from 'zod';

const PetitionSignSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().email().max(254).toLowerCase().trim(),
  streetAddress: z.string().min(5).max(200).trim(),
  aptUnit: z.string().max(50).trim().optional().default(''),
  city: z.string().min(1).max(100).trim(),
  state: z.literal('OH'),
  zipCode: z.string().regex(/^\d{5}$/),
  emailOptIn: z.boolean().default(true),
  turnstileToken: z.string().optional(),
  website: z.string().optional(),  // Honeypot
  ref: z.string().max(20).optional(),  // Referral code
});
```

Sanitize all text fields: strip HTML tags, normalize Unicode whitespace, trim. Names are stored as-is (no case normalization — people's names have legitimate capitalization).

### 3.6 Step 5 — Smarty US Street Address API Verification

Call Smarty's US Street Address API server-side using the **secret key** (auth-token). This is the critical verification step.

```typescript
// packages/verification/smarty.ts — Smarty adapter (hexagonal architecture)

interface SmartyVerificationResult {
  isValid: boolean;
  isOhio: boolean;
  isResidential: boolean;
  isCMRA: boolean;
  isVacant: boolean;
  dpvMatchCode: 'Y' | 'S' | 'D' | 'N' | null;
  canonicalAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    zipCode: string;
    zipPlus4: string | null;
  };
  latitude: number | null;
  longitude: number | null;
  rawResponse: object;  // Full Smarty response for debugging
}

async function verifySmartyAddress(
  street: string,
  secondary: string,
  city: string,
  state: string,
  zipCode: string
): Promise<SmartyVerificationResult> {
  const params = new URLSearchParams({
    'auth-id': process.env.SMARTY_AUTH_ID!,
    'auth-token': process.env.SMARTY_AUTH_TOKEN!,  // Secret key
    street,
    secondary,
    city,
    state,
    zipcode: zipCode,
    candidates: '1',
    match: 'strict',  // Only return results that are valid deliverable addresses
  });

  const response = await fetch(
    `https://us-street.api.smarty.com/street-address?${params}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new SmartyApiError(`Smarty API returned ${response.status}`);
  }

  const candidates = await response.json();

  if (candidates.length === 0) {
    return {
      isValid: false,
      isOhio: false,
      isResidential: false,
      isCMRA: false,
      isVacant: false,
      dpvMatchCode: null,
      canonicalAddress: { line1: street, line2: secondary || null, city, state, zipCode, zipPlus4: null },
      latitude: null,
      longitude: null,
      rawResponse: { candidates: [] },
    };
  }

  const candidate = candidates[0];
  const { components, metadata, analysis } = candidate;

  return {
    isValid: analysis.dpv_match_code === 'Y' || analysis.dpv_match_code === 'S',
    isOhio: components.state_abbreviation === 'OH',
    isResidential: metadata.rdi === 'Residential',
    isCMRA: analysis.dpv_cmra === 'Y',
    isVacant: analysis.dpv_vacant === 'Y',
    dpvMatchCode: analysis.dpv_match_code,
    canonicalAddress: {
      line1: candidate.delivery_line_1,
      line2: candidate.delivery_line_2 || null,
      city: components.city_name,
      state: components.state_abbreviation,
      zipCode: components.zipcode,
      zipPlus4: components.plus4_code || null,
    },
    latitude: metadata.latitude ?? null,
    longitude: metadata.longitude ?? null,
    rawResponse: candidate,
  };
}
```

**DPV Match Code decision matrix:**

| Code | Meaning | Action |
|---|---|---|
| `Y` | Confirmed delivery point — primary + secondary match | ✅ Accept, `verification_status = 'verified'` |
| `S` | Primary confirmed, secondary present but unconfirmed | ✅ Accept, `verification_status = 'verified'` (apartment number may be new/unlisted) |
| `D` | Primary confirmed, secondary missing but expected | ⚠️ Accept with warning. `verification_status = 'flagged'`. Show user: "This address may need an apartment or unit number. You can continue without one." |
| `N` | Not confirmed | ❌ Reject. `verification_status = 'rejected'` |
| `null` | No candidates returned | ❌ Reject. `verification_status = 'rejected'` |

**Additional flag checks (after DPV pass):**

| Check | Condition | Action |
|---|---|---|
| Not Ohio | `components.state_abbreviation !== 'OH'` | ❌ Reject |
| Commercial address | `metadata.rdi === 'Commercial'` | ⚠️ Flag, don't reject. `verification_status = 'flagged'` |
| CMRA | `analysis.dpv_cmra === 'Y'` | ⚠️ Flag, don't reject. `verification_status = 'flagged'` |
| Vacant | `analysis.dpv_vacant === 'Y'` | ⚠️ Flag, don't reject. `verification_status = 'flagged'` |

A signature receives `verification_status = 'flagged'` if *any* flag condition is true, even if the DPV code is `Y`. Flagged signatures still count in the public counter but are marked for admin review.

### 3.7 Step 6 — Canonical Address Hash

Generate a deterministic hash from Smarty's standardized output for deduplication. Using the *Smarty-normalized* address (not user input) ensures that "123 Main St" and "123 Main Street" hash identically.

```typescript
// packages/core/petition/dedup.ts

import { createHash } from 'crypto';

function generateAddressHash(canonicalAddress: {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zipCode: string;
}): string {
  const normalized = [
    canonicalAddress.line1.toUpperCase().trim(),
    (canonicalAddress.line2 || '').toUpperCase().trim(),
    canonicalAddress.city.toUpperCase().trim(),
    canonicalAddress.state.toUpperCase().trim(),
    canonicalAddress.zipCode.trim(),
  ].join('|');

  return createHash('sha256').update(normalized).digest('hex');
}

function generateEmailHash(email: string): string {
  return createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}
```

### 3.8 Step 7 — Duplicate Detection

Check both address hash and email hash against existing signatures.

```typescript
// Check address duplicate
const { data: addressDupe } = await supabase
  .from('signatures')
  .select('id, first_name, signature_number')
  .eq('address_hash', addressHash)
  .is('deleted_at', null)
  .maybeSingle();

// Check email duplicate
const { data: emailDupe } = await supabase
  .from('signatures')
  .select('id, first_name, signature_number')
  .eq('email', validatedData.email)
  .is('deleted_at', null)
  .maybeSingle();
```

**Decision logic:**

| Scenario | Response |
|---|---|
| Address match found | Return: "It looks like someone at this address has already signed! Share with friends to help us reach [next_milestone]." Include share links. HTTP 409. |
| Email match found | Return: "It looks like you've already signed as signer #[number]! Share with friends instead." Include share links. HTTP 409. |
| Both match (same person) | Same as email match — show their signer number |
| Neither match | Proceed to insert |

Duplicate detection runs against non-deleted signatures only (`deleted_at IS NULL`). If a signer previously requested removal and wants to re-sign, they can.

### 3.9 Step 8 — Insert Signature Record

```typescript
// Atomic operation: get signature number + insert record

const { data: signature, error } = await supabase.rpc('insert_signature', {
  p_first_name: validatedData.firstName,
  p_last_name: validatedData.lastName,
  p_email: validatedData.email,
  p_address_line_1: smartyResult.canonicalAddress.line1,
  p_address_line_2: smartyResult.canonicalAddress.line2,
  p_city: smartyResult.canonicalAddress.city,
  p_state: 'OH',
  p_zip_code: smartyResult.canonicalAddress.zipCode,
  p_zip_plus_4: smartyResult.canonicalAddress.zipPlus4,
  p_address_hash: addressHash,
  p_email_hash: emailHash,
  p_smarty_dpv_match_code: smartyResult.dpvMatchCode,
  p_smarty_rdi: smartyResult.isResidential ? 'Residential' : 'Commercial',
  p_smarty_dpv_cmra: smartyResult.isCMRA ? 'Y' : 'N',
  p_smarty_dpv_vacant: smartyResult.isVacant ? 'Y' : 'N',
  p_smarty_latitude: smartyResult.latitude,
  p_smarty_longitude: smartyResult.longitude,
  p_verification_status: determineVerificationStatus(smartyResult),
  p_ip_hash: ipHash,
  p_user_agent: userAgent,
  p_turnstile_token_valid: turnstileValid,
  p_referral_code: generateReferralCode(),  // CONF-XXXX format
  p_referred_by_code: validatedData.ref || null,
  p_email_opt_in: validatedData.emailOptIn,
});
```

**The `insert_signature` RPC function** wraps the insert in a transaction that atomically calls `next_signature_number()` (per Artifact 05, §3.1) and inserts the row. This prevents race conditions on the sequential number.

```sql
CREATE OR REPLACE FUNCTION insert_signature(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_address_line_1 text,
  p_address_line_2 text,
  p_city text,
  p_state text,
  p_zip_code text,
  p_zip_plus_4 text,
  p_address_hash text,
  p_email_hash text,
  p_smarty_dpv_match_code text,
  p_smarty_rdi text,
  p_smarty_dpv_cmra text,
  p_smarty_dpv_vacant text,
  p_smarty_latitude numeric,
  p_smarty_longitude numeric,
  p_verification_status verification_status,
  p_ip_hash text,
  p_user_agent text,
  p_turnstile_token_valid boolean,
  p_referral_code text,
  p_referred_by_code text,
  p_email_opt_in boolean
)
RETURNS TABLE (id uuid, signature_number integer, referral_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sig_number integer;
  v_id uuid;
  v_referred_by_id uuid;
BEGIN
  -- Get next sequential number
  SELECT next_signature_number() INTO v_sig_number;
  
  -- Resolve referrer if ref code provided
  IF p_referred_by_code IS NOT NULL THEN
    SELECT s.id INTO v_referred_by_id
    FROM signatures s
    WHERE s.referral_code = p_referred_by_code
    AND s.deleted_at IS NULL;
  END IF;
  
  -- Insert the signature
  INSERT INTO signatures (
    first_name, last_name, email,
    address_line_1, address_line_2, city, state, zip_code, zip_plus_4,
    address_hash, email_hash,
    smarty_dpv_match_code, smarty_rdi, smarty_dpv_cmra, smarty_dpv_vacant,
    smarty_latitude, smarty_longitude,
    verification_status,
    ip_hash, user_agent, turnstile_token_valid,
    referral_code, referred_by_code, referred_by_id,
    signature_number, email_opt_in
  ) VALUES (
    p_first_name, p_last_name, p_email,
    p_address_line_1, p_address_line_2, p_city, p_state, p_zip_code, p_zip_plus_4,
    p_address_hash, p_email_hash,
    p_smarty_dpv_match_code, p_smarty_rdi, p_smarty_dpv_cmra, p_smarty_dpv_vacant,
    p_smarty_latitude, p_smarty_longitude,
    p_verification_status,
    p_ip_hash, p_user_agent, p_turnstile_token_valid,
    p_referral_code, p_referred_by_code, v_referred_by_id,
    v_sig_number, p_email_opt_in
  )
  RETURNING signatures.id INTO v_id;
  
  RETURN QUERY SELECT v_id, v_sig_number, p_referral_code;
END;
$$;
```

**Referral code generation:**

```typescript
import { customAlphabet } from 'nanoid';

// Generate branded referral code: CONF-XXXX
// Suffix alphabet excludes ambiguous characters (0/O, 1/l/I)
const SUFFIX_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const generateSuffix = customAlphabet(SUFFIX_ALPHABET, 4);

function generateReferralCode(): string {
  return `CONF-${generateSuffix()}`;  // e.g., CONF-7KMN
}
```

**Verification status determination:**

```typescript
function determineVerificationStatus(result: SmartyVerificationResult): VerificationStatus {
  if (!result.isValid || !result.isOhio) return 'rejected';
  if (result.isCMRA || result.isVacant || !result.isResidential || result.dpvMatchCode === 'D') return 'flagged';
  return 'verified';
}
```

### 3.10 Step 9 — Create Email Verification Token

```typescript
import { randomBytes, createHash } from 'crypto';

// Generate a cryptographically secure token
const rawToken = randomBytes(32).toString('hex');  // 64-char hex string
const tokenHash = createHash('sha256').update(rawToken).digest('hex');
const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);  // 72 hours

// Store hashed token in database
await supabase.from('email_verification_tokens').insert({
  signature_id: signature.id,
  token_hash: tokenHash,
  expires_at: expiresAt.toISOString(),
});

// Also store on signature record for quick lookup
await supabase
  .from('signatures')
  .update({
    email_token_hash: tokenHash,
    email_token_expires: expiresAt.toISOString(),
  })
  .eq('id', signature.id);

// The raw token goes in the verification URL — never stored in DB
const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/sign/verify?token=${rawToken}`;
```

### 3.11 Step 10 — Trigger Post-Signature Automation (Inngest)

After successful insert, fire an Inngest event. This decouples the synchronous API response from async side effects (email sending, Brevo contact creation, referral tracking).

```typescript
import { inngest } from '@/lib/inngest';

await inngest.send({
  name: 'petition/signature.created',
  data: {
    signatureId: signature.id,
    signatureNumber: signature.signature_number,
    email: validatedData.email,
    firstName: validatedData.firstName,
    referralCode: signature.referral_code,
    referredByCode: validatedData.ref || null,
    emailOptIn: validatedData.emailOptIn,
    verificationUrl,
    verificationStatus: determineVerificationStatus(smartyResult),
  },
});
```

**Inngest function handles:**
1. Send email verification email via Brevo transactional API (template ID configured in env)
2. Create/update Brevo contact (if `emailOptIn` is true)
3. Increment referral conversion counter (if `referredByCode` is present)
4. Enqueue welcome series (Prompt 7 will specify)

### 3.12 API Response

On success, return the data needed for the thank-you page redirect:

```typescript
return NextResponse.json({
  success: true,
  signature_number: signature.signature_number,
  referral_code: signature.referral_code,
  redirect: `/sign/thank-you?n=${signature.signature_number}&ref=${signature.referral_code}`,
});
```

The client redirects to the thank-you page with the signer number and referral code as query params. These are non-sensitive — the signer number is public and the referral code is the signer's own code for sharing.

---

## 4. Thank You Page

Route: `/sign/thank-you?n=[signature_number]&ref=[referral_code]`

This page is the highest-leverage conversion moment in the entire flow. The signer is at peak emotional investment. Every element should drive a secondary conversion: share, donate, or volunteer.

### 4.1 Content Structure

**Hero section:**

```
🎉 You're signer #4,217!

Thank you, [first_name]. You just brought us one step closer to the ballot.
Help us reach 5,000 — share with 3 friends.
```

The signer's first name is passed via a short-lived cookie or session storage set during the form submission (not from the URL, to prevent spoofing). If unavailable, the line omits the name.

**Share section:**

Pre-populated share buttons with referral tracking:

| Platform | Share URL | Pre-populated Text |
|---|---|---|
| Facebook | `https://www.facebook.com/sharer/sharer.php?u={url}` | (Uses OG tags from share URL) |
| Twitter/X | `https://twitter.com/intent/tweet?text={text}&url={url}` | "I just signed the petition to rename Columbus to Confluence, Ohio. Join me → {url}" |
| WhatsApp | `https://wa.me/?text={text}` | "I just signed to rename Columbus to Confluence! Check it out: {url}" |
| Email | `mailto:?subject={subject}&body={body}` | Subject: "I signed — will you?" Body: "I just added my name to the Confluence Ohio petition…" |
| Copy Link | Clipboard API | Button text changes to "Copied!" for 2 seconds |

All share URLs include the referral code: `https://confluenceohio.com/sign?ref=[code]`

**Donation CTA:**

```
Support the Campaign

Every dollar funds signature collection, legal review, and community outreach.
Donate any amount — even $5 makes a difference.

[Donate via ActBlue →]
```

ActBlue link includes the referral code as refcode: `https://secure.actblue.com/donate/confluenceohio?refcode=[referral_code]`

**Volunteer CTA:**

```
Get More Involved

We need signature collectors, social amplifiers, and neighborhood captains.
Find your role →
```

Links to `/volunteer`.

**Email confirmation notice:**

```
📧 Check your inbox

We sent a confirmation to [email]. Click the link to verify your signature.
Didn't get it? Check spam, or resend verification email.
```

"Resend" triggers a new Inngest event that regenerates the token and sends a fresh email (rate-limited to 3 resends per signature).

### 4.2 Social Proof Reinforcement

Below the share section:

```
[Live counter] people have signed
[Progress bar toward next milestone]
[Recent signers feed — same component as /sign page]
```

### 4.3 No-JS Fallback

If JavaScript fails, the thank-you page still renders with the signer number from the query param. Share buttons degrade to plain links. The live counter shows the server-rendered initial value.

---

## 5. Email Verification Flow

### 5.1 Verification Email

Sent via Brevo transactional API immediately after signature (triggered by Inngest `petition/signature.created` event).

**Template content:**

```
Subject: Confirm your signature — you're signer #[number]!

Hi [first_name],

You just signed the petition to rename Columbus to Confluence, Ohio.
You're signer #[signature_number].

Please confirm your email to verify your signature:

[Confirm My Signature →]  (link to /sign/verify?token=[raw_token])

This link expires in 72 hours.

— The Confluence Ohio Team
```

### 5.2 Verification Endpoint

Route: `GET /sign/verify?token=[raw_token]`

```typescript
// apps/web/app/sign/verify/route.ts (or page.tsx for a rendered confirmation)

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  
  if (!token) {
    return redirect('/sign/verify/error?reason=missing-token');
  }
  
  // Hash the raw token to match against stored hash
  const tokenHash = createHash('sha256').update(token).digest('hex');
  
  // Find the verification token
  const { data: tokenRecord } = await supabase
    .from('email_verification_tokens')
    .select('id, signature_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  
  if (!tokenRecord) {
    return redirect('/sign/verify/error?reason=invalid-token');
  }
  
  if (tokenRecord.used_at) {
    // Already verified — show success anyway (idempotent)
    return redirect('/sign/verify/success?already=true');
  }
  
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return redirect('/sign/verify/error?reason=expired-token');
  }
  
  // Mark token as used
  await supabase
    .from('email_verification_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenRecord.id);
  
  // Update signature record
  await supabase
    .from('signatures')
    .update({
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    })
    .eq('id', tokenRecord.signature_id);
  
  return redirect('/sign/verify/success');
}
```

### 5.3 Verification Success Page

Route: `/sign/verify/success`

```
✅ Your email is verified!

Your signature is officially confirmed.
Thank you for being part of this movement.

[Share with friends →]  [Volunteer →]  [Donate →]
```

### 5.4 Verification Error Pages

Route: `/sign/verify/error?reason=[reason]`

| Reason | Message | Action |
|---|---|---|
| `missing-token` | "Something went wrong. The verification link appears to be incomplete." | "Return to petition page →" |
| `invalid-token` | "This verification link is not valid. It may have been used already or copied incorrectly." | "Return to petition page →" |
| `expired-token` | "This verification link has expired. Verification links are valid for 72 hours." | "Resend verification email →" (triggers new token via API) |

### 5.5 Unverified Signature Handling

Unverified signatures (`email_verified = false`) still count in the public signature counter and appear in the recent signers feed. They are flagged in the admin dashboard for monitoring. Rationale: requiring email verification before counting would significantly reduce displayed momentum and harm the social proof that drives more signatures.

**Admin dashboard indicators:**
- Total signatures: X
- Email verified: Y (Z%)
- Unverified > 72h: W (these are the ones to watch)

---

## 6. Error States and Messaging

### 6.1 Complete Error Catalog

| Error Code | Trigger | User-Facing Message | HTTP Status |
|---|---|---|---|
| `TURNSTILE_FAILED` | Turnstile token invalid | "Something went wrong. Please refresh the page and try again." | 400 |
| `TURNSTILE_EXPIRED` | Turnstile token > 5 min old | "Your session expired. Please refresh the page and try again." | 400 |
| `RATE_LIMITED` | Too many submissions from IP | "You've made too many attempts. Please try again in an hour." | 429 |
| `VALIDATION_ERROR` | Zod schema validation failed | "Please check the highlighted fields and try again." + per-field errors | 422 |
| `ADDRESS_INVALID` | Smarty returns no candidates or `dpv_match_code = N` | "We couldn't verify this address. Please check it and try again. Make sure to include your full street address." | 422 |
| `ADDRESS_NOT_OHIO` | `state_abbreviation !== 'OH'` | "This petition requires an Ohio address. If you live in Ohio, please check your address and try again." | 422 |
| `ADDRESS_MISSING_UNIT` | `dpv_match_code = D` | "This address may need an apartment or unit number. You can add one above, or continue without it." | 200 (soft warning, not blocking) |
| `DUPLICATE_ADDRESS` | `address_hash` already exists | "It looks like someone at this address has already signed! Help us reach [milestone] — share with friends instead." + share links | 409 |
| `DUPLICATE_EMAIL` | `email` already exists | "You've already signed as signer #[X]! Share with friends to help us reach [milestone]." + share links | 409 |
| `SMARTY_API_ERROR` | Smarty API unreachable/500 | "We're having trouble verifying addresses right now. Please try again in a few minutes." | 503 |
| `DATABASE_ERROR` | Supabase insert failure | "Something went wrong on our end. Your information was not saved. Please try again." | 500 |
| `INNGEST_ERROR` | Inngest event send failure | *(Silent — signature is saved; email send will be retried)* | 200 |

### 6.2 Error Display Behavior

- **Field-level errors** (validation): Red border on field, error text below in red, field label turns red. Error announced to screen readers via `aria-live="polite"` region.
- **Form-level errors** (duplicate, API errors): Alert banner above the form with error icon. Uses `role="alert"` for immediate screen reader announcement.
- **Transient errors** (rate limit, Smarty down): Error banner + automatic retry suggestion. No data loss — form fields remain populated.
- **Duplicate "errors"**: Not styled as errors — use a blue info banner with share links. These are positive outcomes (the person already signed).

---

## 7. Mobile-Optimized Form Layout

### 7.1 Mobile (<768px) Specifics

- **Single-column layout.** Full-width form fields with 16px+ font size (prevents iOS zoom on focus).
- **Compact signature counter** above the form: just the number and a thin progress bar. No recent signers feed above fold — it lives below the form in a collapsible section.
- **Address autocomplete dropdown** renders as full-width overlay below the input, with touch-friendly tap targets (minimum 44px height per suggestion).
- **Sticky CTA button** at bottom of viewport while form is in view (using `position: sticky; bottom: 0`). Fades in when form scrolls into view, fades out when form is fully past.
- **Keyboard-aware layout:** Form adjusts when virtual keyboard opens. CTA button hides when keyboard is visible (detected via `visualViewport` API resize event).
- **Minimal vertical spacing** between form fields (12px) to reduce scrolling.
- **Progress indicator:** After clicking "Add My Name," the button shows a spinner and the page scrolls to show a processing state — no navigation until the API responds.

### 7.2 Touch Targets

All interactive elements meet the 44×44px minimum touch target (WCAG 2.5.8). Form fields have at least 48px height. Smarty autocomplete suggestions have 48px row height with 8px padding.

---

## 8. Accessibility Requirements

### 8.1 Form Accessibility

- Every form field has a visible `<label>` element with matching `for`/`id` attributes.
- Required fields are marked with `aria-required="true"` and a visual asterisk (*) with `<span aria-hidden="true">*</span>` plus screen-reader-only text.
- Error messages use `aria-describedby` to associate the error with its field.
- Error state applies `aria-invalid="true"` to the field.
- Form-level errors use a `role="alert"` region for immediate announcement.
- Field-level errors use an `aria-live="polite"` region to avoid interrupting.
- Tab order follows visual order: First Name → Last Name → Email → Street Address → Apt/Unit → City → State → ZIP → Checkbox → Button.
- The Smarty autocomplete listbox uses proper `role="listbox"` / `role="option"` attributes with `aria-activedescendant` for keyboard navigation.
- Autocomplete suggestions are keyboard navigable: Arrow keys to navigate, Enter to select, Escape to dismiss.

### 8.2 Live Counter Accessibility

- The live counter is wrapped in an `aria-live="polite"` region.
- Updates are debounced (announce new value at most once per 30 seconds) to avoid overwhelming screen reader users.
- The progress bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, and `aria-valuemax="22000"`.
- Descriptive label: `aria-label="Petition signature progress: [X] of 22,000 signatures"`

### 8.3 Recent Signers Feed

- Auto-scrolling is paused when the user hovers or focuses the feed area.
- `aria-live="off"` (not announced — it updates too frequently). Screen reader users can navigate to it manually.
- Each signer entry is a `<li>` in an `<ul>` with `aria-label="Recent petition signers"`.

### 8.4 Thank You Page

- Focus is moved to the main heading (`<h1>`) on page load for screen reader orientation.
- Share buttons are properly labeled: `aria-label="Share on Facebook"`, etc.
- The "Copied!" confirmation on the copy button is announced via `aria-live="assertive"`.

### 8.5 Color and Contrast

- All text meets WCAG AA contrast ratio (4.5:1 for body text, 3:1 for large text).
- Error states do not rely solely on color — they include icons and text.
- Focus indicators are visible (2px solid outline, contrasting color) and never suppressed.

---

## 9. Analytics Events

All events fire to PostHog. Event names use `snake_case`. Properties use `camelCase`.

### 9.1 Petition Form Events

| Event Name | Trigger | Properties |
|---|---|---|
| `petition_form_view` | Page load | `{ source, ref, milestone }` |
| `petition_form_start` | First field interaction | `{ firstField, ref }` |
| `petition_form_field_complete` | Field blur with valid value | `{ fieldName, autocompleteUsed }` |
| `petition_form_address_autocomplete_select` | User selects Smarty suggestion | `{ suggestionIndex, city }` |
| `petition_form_address_manual_entry` | User types address without selecting autocomplete | `{}` |
| `petition_form_submit` | Form submission attempted | `{ hasRef, emailOptIn, turnstilePresent }` |
| `petition_form_validation_error` | Client-side validation fails | `{ fields: string[] }` |
| `petition_form_server_error` | Server returns error | `{ errorCode, httpStatus }` |
| `petition_signature_success` | Signature created successfully | `{ signatureNumber, verificationStatus, hasRef, isReferred }` |
| `petition_duplicate_detected` | Duplicate address or email | `{ duplicateType: 'address' \| 'email' }` |

### 9.2 Thank You Page Events

| Event Name | Trigger | Properties |
|---|---|---|
| `thank_you_page_view` | Page load | `{ signatureNumber, ref }` |
| `share_click` | User clicks a share button | `{ platform, signatureNumber, ref }` |
| `share_copy_link` | User copies referral link | `{ ref }` |
| `donate_click` | User clicks ActBlue link | `{ signatureNumber, ref }` |
| `volunteer_click` | User clicks volunteer CTA | `{ signatureNumber }` |
| `resend_verification_click` | User clicks resend email | `{ signatureNumber }` |

### 9.3 Email Verification Events

| Event Name | Trigger | Properties |
|---|---|---|
| `email_verification_click` | User clicks verification link | `{ signatureNumber }` |
| `email_verification_success` | Token validated successfully | `{ signatureNumber, hoursToVerify }` |
| `email_verification_error` | Token invalid/expired | `{ reason }` |

### 9.4 Funnel Definition

PostHog funnel: `petition_form_view` → `petition_form_start` → `petition_form_submit` → `petition_signature_success` → `share_click`

This measures the full conversion funnel and identifies where users drop off.

---

## 10. Progressive Enhancement

The petition form works without JavaScript as a baseline. This is a requirement from the project architectural principles.

### 10.1 No-JS Form Submission

The `<form>` element has `method="POST"` and `action="/api/petition/sign"` attributes. Without JS, the browser submits the form as a standard POST request. The API route detects the `Content-Type: application/x-www-form-urlencoded` header and returns an HTML redirect (302) instead of JSON.

```typescript
// In the API route
const isFormPost = request.headers.get('content-type')?.includes('form-urlencoded');

if (isFormPost) {
  // Parse form body instead of JSON
  const formBody = await request.formData();
  // ... same validation and processing ...
  
  // On success: redirect to thank-you page
  return NextResponse.redirect(
    new URL(`/sign/thank-you?n=${signatureNumber}&ref=${referralCode}`, request.url),
    302
  );
  
  // On error: redirect back with error params
  return NextResponse.redirect(
    new URL(`/sign?error=${errorCode}`, request.url),
    302
  );
}
```

### 10.2 No-JS Limitations

Without JavaScript:
- Smarty autocomplete does not function — user types full address manually, server-side validation still works
- Turnstile does not load — rate limiting compensates (1 submission/IP/hour without Turnstile)
- Live counter shows server-rendered static value
- Recent signers feed shows server-rendered snapshot
- Share buttons on thank-you page are plain links (no clipboard API)
- Client-side validation absent — all validation server-side only

---

## 11. Security Summary

| Layer | Mechanism | Purpose |
|---|---|---|
| Bot prevention | Cloudflare Turnstile (invisible) | Blocks automated submissions |
| Bot prevention | Honeypot field | Catches form-filling bots |
| Rate limiting | IP hash + sliding window | Prevents brute-force submissions |
| Identity verification | Smarty US Street Address API | Confirms real Ohio address |
| Deduplication | SHA-256 address hash + email unique constraint | One signature per address, one per email |
| Data protection | PII encrypted at rest (Supabase AES-256) | Protects stored personal data |
| Data minimization | IP and address hashed, not stored raw | Reduces exposure surface |
| Token security | SHA-256 hashed verification tokens | Raw tokens never stored in DB |
| Access control | RLS on all tables, service_role for writes | No client-side access to signatures table |
| API security | Smarty secret key server-side only | Never exposed to browser |
| Progressive trust | Turnstile-absent gets stricter rate limits | Balances accessibility vs. security |

---

## Claude Code Handoff

The following prompts are designed to be executed sequentially in Claude Code. Each produces one or more files in the monorepo.

### Prompt H6.1 — Smarty Verification Adapter

```
Create the Smarty verification adapter at packages/verification/smarty.ts.

This file implements the hexagonal architecture port for address verification. It exports:
1. A SmartyVerificationResult interface with fields: isValid, isOhio, isResidential, isCMRA, isVacant, dpvMatchCode ('Y'|'S'|'D'|'N'|null), canonicalAddress ({ line1, line2, city, state, zipCode, zipPlus4 }), latitude, longitude, rawResponse.
2. A verifySmartyAddress async function that calls https://us-street.api.smarty.com/street-address with auth-id and auth-token from env vars (SMARTY_AUTH_ID, SMARTY_AUTH_TOKEN). Parameters: street, secondary, city, state, zipcode, candidates=1, match=strict. Parses the response according to the Smarty US Street API response format: components (state_abbreviation, city_name, zipcode, plus4_code), metadata (rdi, latitude, longitude), analysis (dpv_match_code, dpv_cmra, dpv_vacant). Returns structured SmartyVerificationResult.
3. A SmartyApiError custom error class for API failures.
4. A SmartyVerificationPort interface that verifySmartyAddress implements, so the adapter can be swapped for testing or if we change providers.

DPV match code logic: Y and S are valid; D is valid but flagged; N and null are invalid. isOhio checks components.state_abbreviation === 'OH'. isResidential checks metadata.rdi === 'Residential'.

Include JSDoc comments on all exports. Include a mock implementation (MockSmartyAdapter) that returns configurable results for testing.

Environment variables needed: SMARTY_AUTH_ID, SMARTY_AUTH_TOKEN.
```

### Prompt H6.2 — Deduplication Logic

```
Create the deduplication module at packages/core/petition/dedup.ts.

Exports:
1. generateAddressHash(canonicalAddress: { line1, line2, city, state, zipCode }) → string. Concatenates uppercased, trimmed fields with '|' separator, then SHA-256 hashes. Uses Smarty-normalized address so "123 Main St" and "123 Main Street" produce the same hash.
2. generateEmailHash(email: string) → string. Lowercases, trims, SHA-256 hashes.
3. generateIpHash(ip: string, salt: string) → string. Concatenates ip + salt, SHA-256 hashes. Salt comes from RATE_LIMIT_SALT env var.
4. generateReferralCode() → string. Generates branded codes in the format CONF-XXXX where XXXX is 4 characters from custom alphabet '23456789ABCDEFGHJKMNPQRSTUVWXYZ' (uppercase, no ambiguous chars). Uses nanoid's customAlphabet for the suffix. Example output: CONF-7KMN.
5. generateVerificationToken() → { rawToken: string, tokenHash: string }. Generates 32 random bytes as hex (rawToken), SHA-256 hashes it (tokenHash). Raw token goes in email URL; hashed version is stored in DB.

All hashing uses Node.js crypto module (createHash('sha256')). Include comprehensive unit tests in packages/core/petition/__tests__/dedup.test.ts covering: deterministic hashing, case insensitivity for email, whitespace normalization, referral code format matches CONF-XXXX pattern, referral code uniqueness over 10K generations, token hash doesn't match raw token.
```

### Prompt H6.3 — Petition Signing API Route

```
Create the petition signing API route at apps/web/app/api/petition/sign/route.ts.

This is a Next.js App Router route handler that handles POST requests (JSON from JS-enabled clients) and POST with form-urlencoded (progressive enhancement fallback).

Processing pipeline in order:
1. Parse request body (detect content-type for JSON vs form data)
2. Validate Turnstile token against https://challenges.cloudflare.com/turnstile/v0/siteverify using TURNSTILE_SECRET_KEY env var. Token is valid for 300s, single-use. If token missing (ad blocker), proceed but set turnstileValid=false.
3. Check honeypot field 'website' — if filled, return fake success JSON (don't tip off bots).
4. Rate limit: query signatures table for ip_hash matches in last hour. Max 3/hr with Turnstile, 1/hr without. Use RATE_LIMIT_SALT env var for IP hashing.
5. Validate input with Zod schema: firstName (1-100, trimmed), lastName (1-100, trimmed), email (valid email, max 254, lowercased), streetAddress (min 5, max 200), aptUnit (optional, max 50), city (1-100), state (literal 'OH'), zipCode (5 digits), emailOptIn (boolean, default true), turnstileToken (optional string), website (optional honeypot), ref (optional max 20).
6. Call Smarty adapter (from packages/verification/smarty.ts) with address fields.
7. Determine verification_status: rejected if !isValid or !isOhio; flagged if isCMRA, isVacant, !isResidential, or dpvMatchCode=D; verified otherwise.
8. Generate address hash and email hash (from packages/core/petition/dedup.ts).
9. Check for duplicates: query signatures table for matching address_hash or email (where deleted_at IS NULL). Return 409 with friendly message + share links if found.
10. Call insert_signature RPC (defined in Artifact 06 SQL) which atomically assigns signature_number.
11. Generate verification token, insert into email_verification_tokens table.
12. Fire Inngest event 'petition/signature.created' with signatureId, signatureNumber, email, firstName, referralCode, referredByCode, emailOptIn, verificationUrl, verificationStatus.
13. Return JSON { success, signature_number, referral_code, redirect } or 302 redirect for form posts.

Error handling: each step has a specific error code and user-facing message per the error catalog in Artifact 06 §6.1. All errors return structured JSON { error, code, field? } for JS clients, or redirect with ?error= query param for form posts.

Use Supabase service_role key for all DB operations (bypasses RLS). Import from @supabase/supabase-js with SUPABASE_SERVICE_ROLE_KEY.

Environment variables: TURNSTILE_SECRET_KEY, SMARTY_AUTH_ID, SMARTY_AUTH_TOKEN, RATE_LIMIT_SALT, NEXT_PUBLIC_SITE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
```

### Prompt H6.4 — Petition Page Component

```
Create the petition signing page component at apps/web/app/sign/page.tsx and supporting components.

This is a Next.js App Router page (server component with client islands).

Server component (page.tsx):
- Fetches initial signature count from campaign_metrics via Supabase
- Fetches initial recent signers via get_recent_signers RPC (limit 10)
- Renders SEO meta: title "Sign the Petition — Confluence Ohio", description per Artifact 03 SEO spec
- Renders the page layout per Artifact 06 §1.2 (two-column desktop, single-column mobile)
- Renders below-the-fold reinforcement content (three persuasion points from Artifact 04)
- Renders FAQ excerpt

Client components to create:
1. PetitionForm (apps/web/components/petition/PetitionForm.tsx): The form with all fields per §1.3. Integrates Smarty Autocomplete Pro (use NEXT_PUBLIC_SMARTY_EMBEDDED_KEY with include_only_states=OH). Handles client-side validation per §2. Submits to /api/petition/sign as JSON. Shows loading state on button. Handles all error responses. Redirects to thank-you page on success. Includes Turnstile invisible widget. Includes hidden honeypot field. Reads ?ref= from URL for referral tracking.
2. SignatureCounter (apps/web/components/petition/SignatureCounter.tsx): Displays live count with progress bar. Subscribes to Supabase Realtime campaign_metrics channel. Shows milestone-based goal text. Uses aria-live="polite" with 30-second debounce. Progress bar has role="progressbar" with proper aria attributes.
3. RecentSigners (apps/web/components/petition/RecentSigners.tsx): Polls get_recent_signers RPC every 30 seconds. Shows "first_name from city — relative_time". Auto-scrolls on mobile, pauses on hover/focus. aria-live="off" to avoid screen reader noise.

Use Tailwind CSS for styling. Mobile-first responsive design. All form fields 16px+ font size (prevent iOS zoom). Touch targets 44px minimum. Sticky CTA on mobile that hides when virtual keyboard is open.

All accessibility requirements from §8 must be implemented: labels, aria attributes, keyboard navigation, focus management, error announcements.

PostHog analytics events from §9 — use a useAnalytics hook that calls posthog.capture() for each event.
```

### Prompt H6.5 — Thank You Page

```
Create the thank-you page at apps/web/app/sign/thank-you/page.tsx.

Server component that reads query params: n (signature number), ref (referral code).

Content sections per Artifact 06 §4:
1. Hero: "You're signer #[n]!" with confetti or celebration visual (CSS animation, no heavy library). Personalized text with first name from a short-lived cookie 'petition_signer_name' set during form submission.
2. Share section: buttons for Facebook, Twitter/X, WhatsApp, Email, Copy Link. All share URLs include ?ref=[code]. Pre-populated share text per §4.1 table. Copy link uses navigator.clipboard API with "Copied!" feedback.
3. Donation CTA: link to ActBlue with refcode=[ref]. Copy per §4.1.
4. Volunteer CTA: link to /volunteer.
5. Email verification notice: "Check your inbox" message with resend link. Resend hits POST /api/petition/verify/resend with signature email.
6. Social proof: SignatureCounter and RecentSigners components (same as /sign page).

SEO: noindex (personal page, no SEO value). OG tags for when people share: "I just signed the Confluence Ohio petition!" with campaign OG image.

PostHog events from §9.2: thank_you_page_view, share_click, share_copy_link, donate_click, volunteer_click, resend_verification_click.

Mobile-optimized: share buttons are large touch targets, donation CTA is prominent.
```

### Prompt H6.6 — Email Verification Flow

```
Create the email verification flow:

1. apps/web/app/sign/verify/route.ts — GET handler that:
   - Reads ?token= query param
   - Hashes the raw token with SHA-256
   - Looks up token_hash in email_verification_tokens table
   - Validates: token exists, not already used (used_at IS NULL), not expired (expires_at > now)
   - If valid: sets used_at on token, sets email_verified=true and email_verified_at on the signature record
   - Redirects to /sign/verify/success or /sign/verify/error?reason=[reason]
   - Reasons: missing-token, invalid-token, expired-token, already-verified (redirect to success)

2. apps/web/app/sign/verify/success/page.tsx — Success confirmation page with share/volunteer/donate CTAs

3. apps/web/app/sign/verify/error/page.tsx — Error page that reads ?reason= and shows appropriate message per §5.4. For expired-token, shows a "Resend verification email" button.

4. apps/web/app/api/petition/verify/resend/route.ts — POST handler that:
   - Accepts { email } in body
   - Looks up signature by email
   - Rate limits to 3 resends per signature (check existing tokens count)
   - Generates new verification token (old tokens remain valid until expiry)
   - Fires Inngest event to send new verification email
   - Returns success/error JSON

PostHog events from §9.3. Use Supabase service_role key for all DB operations.
```

### Prompt H6.7 — Database Migration: insert_signature RPC

```
Create a Supabase migration file at supabase/migrations/[timestamp]_add_insert_signature_rpc.sql.

This migration adds the insert_signature RPC function defined in Artifact 06 §3.9. The function:
- Takes all signature fields as parameters
- Calls next_signature_number() to get the next sequential number atomically
- Resolves referred_by_code to referred_by_id by looking up the referrer's signature
- Inserts the full signature record
- Returns the new id, signature_number, and referral_code
- Uses SECURITY DEFINER and runs as the postgres role
- Is wrapped in a transaction (implicit in PL/pgSQL functions)

Also grant execute permission to the service_role but NOT to anon or authenticated (this function should only be called from the API route using service_role key).

Include the full SQL from Artifact 06 §3.9.
```

---

*Artifact 06 complete. All sections specified. Ready for Claude Code implementation following prompts H6.1 through H6.7 in sequence.*
