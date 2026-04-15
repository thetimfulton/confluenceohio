# Confluence Ohio — Claude Code Handoff Prompts

**Master execution guide for building the Confluence Ohio campaign website.**

This document compiles all handoff prompts from the 17 Cowork planning artifacts in correct execution order. Execute them sequentially in Claude Code — each prompt assumes the outputs of all prior prompts exist.

**How to use:** Copy each prompt into a new Claude Code session (one prompt per session). Verify the output before moving to the next prompt. The prompts are grouped into phases matching the dependency chain in CLAUDE.md.

> **Prerequisites:** Before starting, move the 17 numbered artifact files into `docs/`:
> ```bash
> mkdir -p docs
> mv 01-messaging-framework.md 02-site-architecture.md 03-content-strategy-seo.md \
>    04-page-by-page-copy.md 05-data-model.md 06-petition-signing-flow.md \
>    07-email-automation.md 08-volunteer-signup.md 09-actblue-donation-integration.md \
>    10-community-voices.md 11-social-sharing-referral-tracking.md 12-seo-structured-data.md \
>    13-analytics-conversion-tracking.md 14-accessibility-performance.md 15-admin-dashboard.md \
>    16-deployment-dns-launch-checklist.md 17-post-launch-iteration-plan.md docs/
> ```
> Claude Code reads these artifacts directly — no need to create derivative copies.

> **Rewrite notes:** Where prompts have been updated from their source artifacts, the change is noted inline. The most significant rewrite is in Phase 1 Prompt 2 (turbo.json) where `ACTBLUE_WEBHOOK_SECRET` was corrected to `ACTBLUE_WEBHOOK_USERNAME` / `ACTBLUE_WEBHOOK_PASSWORD` per Artifact 09.

---

## Table of Contents

- [Phase 1: Repo Scaffolding (Artifact 16)](#phase-1-repo-scaffolding)
- [Phase 2: Database (Artifact 05)](#phase-2-database)
- [Phase 3: Core Domain Logic (Artifact 06)](#phase-3-core-domain-logic)
- [Phase 4: Adapters (Artifacts 06, 07, 09)](#phase-4-adapters)
- [Phase 5: API Routes (Artifacts 06, 08, 09, 10)](#phase-5-api-routes)
- [Phase 6: Inngest Workflows (Artifact 07)](#phase-6-inngest-workflows)
- [Phase 7: Frontend Pages (Artifacts 02, 04, 06)](#phase-7-frontend-pages)
- [Phase 8: Social Sharing & Referrals (Artifact 11)](#phase-8-social-sharing--referrals)
- [Phase 9: SEO & Structured Data (Artifact 12)](#phase-9-seo--structured-data)
- [Phase 10: Analytics (Artifact 13)](#phase-10-analytics)
- [Phase 11: Accessibility & Performance (Artifact 14)](#phase-11-accessibility--performance)
- [Phase 12: Admin Dashboard (Artifact 15)](#phase-12-admin-dashboard)
- [Phase 13: Deployment (Artifact 16)](#phase-13-deployment)
- [Phase 14: Post-Launch (Artifact 17)](#phase-14-post-launch)

---

## Phase 1: Repo Scaffolding

These prompts set up the monorepo structure, build tooling, and configuration files.

### Prompt 1.1 — Vercel Configuration and Security Headers (Source: Artifact 16, Handoff 1)

```
Read docs/16-deployment-dns-launch-checklist.md sections 1.1–1.4.

Generate the following files:

1. `/vercel.json` — Vercel configuration with:
   - buildCommand using Turborepo filter for web app
   - installCommand at monorepo root
   - ignoreCommand using turbo-ignore
   - Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
   - Cache-Control headers for API routes (no-store) and static assets (immutable)
   - Rewrites for sitemap.xml and robots.txt

2. `apps/web/next.config.ts` — Next.js configuration with:
   - transpilePackages for all workspace packages (@confluenceohio/core, db, email, verification, ui)
   - Content-Security-Policy header allowing: Cloudflare Turnstile (challenges.cloudflare.com), PostHog, GA4 (googletagmanager.com), ActBlue embed (secure.actblue.com), Smarty API (api.smarty.com), Supabase (*.supabase.co including WSS for Realtime)
   - Strict-Transport-Security with 2-year max-age, includeSubDomains, preload
   - Image optimization (AVIF + WebP, Supabase storage remote pattern)
   - optimizePackageImports for lucide-react and @confluenceohio/ui
   - www-to-apex redirect via host header matching
   - frame-ancestors 'none' and form-action restricted to self + ActBlue

3. `.env.example` — Complete environment variable template with:
   - All variables from Artifact 16 §2.3
   - Grouped by service with comments
   - Local development defaults (Supabase local Docker, Turnstile test keys)
   - Instructions for generating EMAIL_VERIFICATION_SECRET

Ensure CSP policy allows all third-party integrations specified in Artifacts 06 (Smarty), 09 (ActBlue), 11 (social sharing OG), 13 (PostHog, GA4, Vercel Analytics). Do NOT include 'unsafe-eval' unless session replay is confirmed enabled (it is per Artifact 13).
```

### Prompt 1.2 — Turborepo Configuration (Source: Artifact 16, Handoff 2)

> **Rewrite note:** Updated from source artifact to use `ACTBLUE_WEBHOOK_USERNAME` / `ACTBLUE_WEBHOOK_PASSWORD` instead of `ACTBLUE_WEBHOOK_SECRET`, per Artifact 09 spec. Source artifact (16) has been corrected.

```
Read docs/16-deployment-dns-launch-checklist.md section 1.2.

Generate `/turbo.json` with:
- globalDependencies: .env.*local files
- globalEnv: all NEXT_PUBLIC_* variables (Supabase URL, anon key, Turnstile site key, PostHog key/host, GA4 measurement ID, Smarty embedded key, ActBlue embed token, site URL)
- Task definitions:
  - build: depends on ^build, outputs .next/** excluding cache, env includes all server-only secrets (SUPABASE_SERVICE_ROLE_KEY, SMARTY_AUTH_ID, SMARTY_AUTH_TOKEN, BREVO_API_KEY, ACTBLUE_WEBHOOK_USERNAME, ACTBLUE_WEBHOOK_PASSWORD, TURNSTILE_SECRET_KEY, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY, EMAIL_VERIFICATION_SECRET, POSTHOG_API_KEY)
  - lint: depends on ^build, no outputs
  - type-check: depends on ^build, no outputs
  - test: depends on ^build, no outputs
  - dev: no cache, persistent

Cross-reference the environment variable list against Artifacts 06 (SMARTY_AUTH_ID, SMARTY_AUTH_TOKEN), 07 (BREVO_API_KEY), 09 (ACTBLUE_WEBHOOK_USERNAME, ACTBLUE_WEBHOOK_PASSWORD — NOT ACTBLUE_WEBHOOK_SECRET), 13 (PostHog and GA4 keys), and 15 (admin email allowlist) to ensure no variable is missing.
```

### Prompt 1.3 — Environment Variable Validation (Source: Artifact 16, Handoff 6)

```
Read docs/16-deployment-dns-launch-checklist.md section 2.

Generate `scripts/validate-env.ts` — a TypeScript script (runnable via tsx) that:
1. Reads .env.local (or process.env in CI)
2. Validates that every required environment variable is present and non-empty
3. Validates format where possible (e.g., NEXT_PUBLIC_SUPABASE_URL starts with https://, NEXT_PUBLIC_GA4_MEASUREMENT_ID matches G-XXXXXXX pattern, NEXT_PUBLIC_TURNSTILE_SITE_KEY is not a test key in production)
4. Warns about test keys in production (Turnstile test keys, placeholder values)
5. Exits with code 1 if any required variable is missing
6. Prints a summary table of all variables with status (✅ present / ❌ missing / ⚠️ test value)

Also generate `packages/core/env.ts` — a Zod schema for runtime environment variable validation, imported by apps/web. Server-only variables should be validated in a separate schema from client-side NEXT_PUBLIC_* variables. Export typed env objects for use across the app.

Add the validate-env script to the turbo.json build pipeline as a pre-build step.
```

---

## Phase 2: Database

### Prompt 2.1 — Migration Files (Source: Artifact 05, Handoff 1)

```
Create Supabase migration files in `packages/db/migrations/` with the following structure:

packages/db/migrations/
├── 00001_create_enums.sql
├── 00002_create_tables.sql
├── 00003_create_indexes.sql
├── 00004_create_triggers.sql
├── 00005_create_rls_policies.sql
├── 00006_create_functions.sql
└── 00007_enable_realtime.sql

Copy the exact SQL from docs/05-data-model.md:

- 00001_create_enums.sql: All CREATE TYPE statements from Section 2
- 00002_create_tables.sql: All CREATE TABLE statements from Section 3 (10 tables + signature_counter singleton — no blog_posts table), including the signature_counter INSERT
- 00003_create_indexes.sql: All CREATE INDEX statements from Section 5
- 00004_create_triggers.sql: All trigger functions and CREATE TRIGGER statements from Section 4
- 00005_create_rls_policies.sql: All ALTER TABLE ENABLE ROW LEVEL SECURITY + CREATE POLICY statements from Section 6
- 00006_create_functions.sql: next_signature_number() from Section 3.1, get_recent_signers() from Section 6.2, and campaign_metrics seed INSERT from Section 3.9
- 00007_enable_realtime.sql: ALTER PUBLICATION from Section 7

Each migration file should be idempotent where possible (use IF NOT EXISTS). Include a comment header in each file with the migration number and description.

Do not modify any SQL. This is the approved schema.
```

### Prompt 2.2 — TypeScript Types (Source: Artifact 05, Handoff 2)

```
Create the file `packages/db/types.ts` with the complete TypeScript type definitions from docs/05-data-model.md Section 8. Include all enum types, table interfaces, and public-facing types exactly as written.

Also create `packages/db/index.ts` that re-exports all types:
export * from './types';
```

### Prompt 2.3 — Seed Data (Source: Artifact 05, Handoff 3)

```
Create the file `packages/db/seed.ts` with the seed script from docs/05-data-model.md Section 9. Include the sha256 helper function, all sample signatures (10), and sample voice submissions (3). No blog post seed — blog content is MDX-only.

Also create a `packages/db/package.json` with a "seed" script:
{
  "name": "@confluence/db",
  "scripts": {
    "seed": "tsx seed.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2"
  },
  "devDependencies": {
    "tsx": "^4"
  }
}
```

### Prompt 2.4 — Database Verification Checkpoint (Source: Artifact 05, Handoff 4)

```
Read the migration files in `packages/db/migrations/`, `packages/db/types.ts`, and `packages/db/seed.ts`. Confirm:
1. All 10 tables are created (no blog_posts — blog content is MDX-only)
2. All enum types exist
3. All indexes are in place
4. All RLS policies are applied
5. Real-time is enabled on campaign_metrics only
6. TypeScript types match the SQL schema

These are required before proceeding to Phase 3.
```

---

## Phase 3: Core Domain Logic

### Prompt 3.1 — Deduplication Logic (Source: Artifact 06, Handoff 2)

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

### Prompt 3.2 — insert_signature RPC (Source: Artifact 06, Handoff 7)

```
Create a Supabase migration file at packages/db/migrations/00008_add_insert_signature_rpc.sql.

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

## Phase 4: Adapters

### Prompt 4.1 — Smarty Verification Adapter (Source: Artifact 06, Handoff 1)

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

### Prompt 4.2 — Brevo Email Adapter (Source: Artifact 07, Handoff A)

```
Create the Brevo email adapter following the hexagonal architecture pattern.

Files to generate:
1. `packages/email/types.ts` — Email port interface (EmailPort) with methods:
   createOrUpdateContact, addContactToLists, removeContactFromList,
   sendTransactional, updateContactAttribute, sendCampaign.
   Include Contact, TransactionalEmail, CampaignEmail, and ListId types.

2. `packages/email/brevo.ts` — BrevoAdapter class implementing EmailPort.
   Uses Brevo API v3 (https://api.brevo.com/v3). Methods:
   - createOrUpdateContact: POST /contacts with updateEnabled=true
   - addContactToLists: POST /contacts/lists/:id/contacts/add
   - removeContactFromList: POST /contacts/lists/:id/contacts/remove
   - sendTransactional: POST /smtp/email with templateId + params
   - updateContactAttribute: PUT /contacts/:identifier
   - sendCampaign: POST /emailCampaigns + POST /emailCampaigns/:id/sendNow
   All methods include error handling with BrevoApiError class.
   API key from process.env.BREVO_API_KEY.

3. `packages/email/templates.ts` — Template ID registry mapping template
   names to environment variable names. getTemplateId() function that
   reads the env var and returns the numeric Brevo template ID.

4. `packages/email/index.ts` — Factory function getBrevoAdapter() that
   returns a singleton BrevoAdapter instance.

5. `packages/email/brevo-setup.ts` — One-time setup script to create
   custom contact attributes and lists in Brevo via API. Run via
   `npx ts-node packages/email/brevo-setup.ts`. Creates 14 custom
   attributes and 8 lists per the spec in Artifact 07, §1.2 and §1.3.

Reference Artifact 07 §1 for complete API specs, attribute names, list names, and template IDs.
```

### Prompt 4.3 — ActBlue Webhook Handler (Source: Artifact 09, Handoff A)

```
Create the ActBlue integration adapter and webhook handler.

Files to generate:
1. `packages/core/donations/types.ts` — TypeScript types for ActBlue webhook payloads
   (Contribution, Refund, Cancellation) and internal Donation type.

2. `packages/core/donations/parse-webhook.ts` — Pure function to parse and validate
   ActBlue webhook payloads. Extracts: amount, email, name, refcode, recurring status,
   timestamp. Validates required fields. Returns typed DonationEvent | RefundEvent | null.

3. `apps/web/app/api/webhooks/actblue/route.ts` — POST handler:
   - HTTP Basic Auth using ACTBLUE_WEBHOOK_USERNAME and ACTBLUE_WEBHOOK_PASSWORD env vars
   - Parse webhook body with parse-webhook
   - Upsert donation record in Supabase donations table
   - Update campaign_metrics.donation_total_cents and donation_count
   - Resolve refcode to referral_code for attribution
   - Fire Inngest event 'donation/received' with donation details
   - Return 200 on success, 401 on auth failure, 400 on parse failure
   - Idempotent: use actblue_order_id as unique key to prevent double-processing

4. `apps/web/app/api/webhooks/actblue/__tests__/route.test.ts` — Tests covering:
   - Valid contribution webhook processing
   - Refund handling
   - Auth failure (wrong credentials)
   - Duplicate webhook (idempotent)
   - Malformed payload
   - Refcode attribution

IMPORTANT: Use HTTP Basic Auth (username + password), NOT HMAC signature verification.
Environment variables: ACTBLUE_WEBHOOK_USERNAME, ACTBLUE_WEBHOOK_PASSWORD.
```

---

## Phase 5: API Routes

### Prompt 5.1 — Petition Signing API (Source: Artifact 06, Handoff 3)

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

### Prompt 5.2 — Email Verification Flow (Source: Artifact 06, Handoff 6)

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

### Prompt 5.3 — Volunteer Signup API (Source: Artifact 08, Handoff A)

```
Create the volunteer signup flow per Artifact 08.

Files to generate:

1. `apps/web/app/api/volunteer/route.ts` — POST handler:
   - Validate Turnstile token
   - Validate with Zod: firstName, lastName, email, phone (optional),
     neighborhood (optional), roles (array of VolunteerRole enum values,
     min 1), availability (weekdays/weekends/evenings, multi-select),
     skills (optional text), referralSource (optional), emailOptIn (default true)
   - Check for duplicate email in volunteers table
   - Insert volunteer record
   - Create/update Brevo contact with VOLUNTEER=true attribute, add to
     Volunteer list
   - Fire Inngest event 'volunteer/signup' with volunteer details
   - Return JSON { success, message }

2. `apps/web/app/volunteer/page.tsx` — Volunteer signup page with:
   - Hero: "Join the Movement" with volunteer count
   - Role descriptions (7 roles from Artifact 08 §1): Event Organizer,
     Digital Ambassador, Neighborhood Captain, Research & Writing,
     Canvassing, Phone Banking, General Support
   - Multi-step form: personal info → role selection → availability → submit
   - Each role has a card with title, description, time commitment, and
     checkbox
   - Success state: confirmation message with next steps

3. `apps/web/app/volunteer/thank-you/page.tsx` — Thank-you page with:
   - Role-specific next steps
   - Share CTAs
   - Link back to petition if they haven't signed

Reference Artifact 08 for the complete role definitions, form fields,
and admin interface specifications.
```

### Prompt 5.4 — Volunteer Admin Interface (Source: Artifact 08, Handoff B)

```
Create the volunteer admin components per Artifact 08.

This builds on the admin dashboard from Artifact 15. Files:

1. `apps/web/app/(admin)/admin/volunteers/page.tsx` — Volunteer management:
   - DataTable with columns: Name, Email, Roles, Status, Signed up,
     Last contact
   - Filters: role, status (active/inactive/pending), date range
   - Bulk actions: export CSV, send email
   - Click-through to volunteer detail

2. `apps/web/app/(admin)/admin/volunteers/[id]/page.tsx` — Detail view:
   - Contact info, roles, availability, skills
   - Activity log (emails sent, events attended)
   - Notes field for admin comments
   - Status toggle (active/inactive)

3. `apps/web/app/api/admin/volunteers/route.ts` — GET with filters,
   PATCH for status updates, CSV export

Reference Artifact 08 §4 for the complete admin interface spec.
```

### Prompt 5.5 — Community Voices Submission API (Source: Artifact 10, Handoff A)

```
Create the community voices submission system per Artifact 10.

Files to generate:

1. `packages/core/voices/types.ts` — Types for voice submissions:
   VoiceSubmission, ModerationStatus, VoicePosition (support/oppose/
   undecided/complicated), AIModeration result types.

2. `packages/core/voices/validate.ts` — Validation logic:
   - Zod schema: displayName (2-100), neighborhood (optional, max 100),
     position (VoicePosition enum), title (5-200), body (50-5000),
     isAnonymous (boolean), email (required even if anonymous — for
     notification only), turnstileToken, website (honeypot)
   - Content validation: profanity check, minimum substance check,
     maximum link count (2)

3. `apps/web/app/api/voices/route.ts` — POST handler:
   - Validate Turnstile
   - Check honeypot
   - Rate limit: 1 submission per email per 24 hours
   - Validate input
   - Run AI moderation (call to moderation Inngest function or inline)
   - Insert into voice_submissions with moderation_status based on AI result
   - Fire Inngest event 'voice/submitted'
   - Return success with estimated review time

4. `apps/web/app/api/voices/route.ts` — GET handler:
   - Public endpoint returning approved voice submissions
   - Pagination, filtering by position
   - Exclude anonymous author details
   - Cache with 60s revalidation

5. `apps/web/app/voices/page.tsx` — Voices landing page:
   - Featured voices at top (featured=true, curated order)
   - Filter tabs: All, Support, Oppose, Undecided/Complicated
   - Voice cards: display name, neighborhood, position badge, excerpt
   - "Share Your Perspective" CTA button → opens submission form
   - Infinite scroll or "Load more" pagination

6. `apps/web/app/voices/share/page.tsx` — Submission form page:
   - Form per Zod schema above
   - Position selector (4 options with descriptions)
   - Rich text area with character count
   - Anonymous toggle with explanation of what it means
   - Preview before submit
   - Success page after submission

Reference Artifact 10 for the complete spec including AI moderation
pipeline, display rules, and admin moderation queue requirements.
```

### Prompt 5.6 — AI Moderation Pipeline (Source: Artifact 10, Handoff B)

```
Create the AI moderation pipeline for community voices per Artifact 10 §3.

Files to generate:

1. `packages/core/voices/moderate.ts` — AI moderation function:
   - Calls the configured AI moderation endpoint (Anthropic Claude API
     or OpenAI moderation endpoint — make this configurable via env var)
   - Evaluates submission against criteria:
     a. Toxicity/hate speech detection
     b. Spam/promotional content
     c. Personal attacks or doxxing
     d. Off-topic content (not related to Columbus/Confluence rename)
     e. Profanity level
   - Returns: { status: 'approved'|'needs_review'|'rejected',
     confidence: number, flags: string[], reasoning: string }
   - High confidence (>0.9) auto-approve or auto-reject
   - Medium confidence (0.5-0.9) → needs_review
   - Low confidence (<0.5) → needs_review

2. `apps/web/inngest/functions/moderate-voice.ts` — Inngest function:
   - Triggered by 'voice/submitted' event
   - Calls the moderation function
   - Updates voice_submissions with AI moderation results
   - If auto-approved: fires 'voice/approved' event (triggers
     notification email)
   - If needs_review: fires 'voice/needs-review' (triggers admin
     notification)
   - If auto-rejected: fires 'voice/rejected' (triggers submitter
     notification with appeal info)

3. `apps/web/inngest/functions/voice-notifications.ts` — Notification handlers:
   - voice/approved → send "Your voice has been published" email
   - voice/rejected → send "Submission update" email with reason and
     appeal instructions
   - voice/needs-review → send admin digest (batched, max 1 per hour)

4. `packages/core/voices/__tests__/moderate.test.ts` — Unit tests with
   mocked AI responses covering: clear approval, clear rejection, edge
   cases, API failure fallback (→ needs_review)

Reference Artifact 10 §3 for the complete moderation criteria, confidence
thresholds, and notification templates.
```

### Prompt 5.7 — Donation Page (Source: Artifact 09, Handoff B)

```
Create the donation page per Artifact 09.

Files to generate:

1. `apps/web/app/donate/page.tsx` — Donation page:
   - Hero with campaign-specific donation pitch
   - ActBlue embed iframe (using NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN)
   - Fallback: direct link to ActBlue contribution page with refcode
   - Below embed: transparency section (how funds are used, FEC disclaimer)
   - Sidebar: signature count + share buttons + "Not ready to donate?" CTA
     to /sign or /volunteer
   - SEO meta per Artifact 03

2. `apps/web/components/donate/ActBlueEmbed.tsx` — Client component:
   - Renders ActBlue embed iframe with proper sandbox attributes
   - Detects load failure and shows fallback link
   - Tracks analytics events: embed_loaded, donate_initiated
   - Reads ?refcode= from URL and passes to ActBlue

3. `apps/web/app/donate/thank-you/page.tsx` — Post-donation thank-you:
   - Triggered by ActBlue redirect-after-contribute URL
   - Share buttons with donation-specific messaging
   - Petition CTA if they haven't signed
   - Volunteer CTA

Reference Artifact 09 §2-3 for ActBlue embed configuration, URL parameters,
and redirect flow.
```

### Prompt 5.8 — Donation Tracking & Reporting (Source: Artifact 09, Handoff C-F)

```
Create the donation tracking infrastructure per Artifact 09 §4-6.

Files to generate:

1. `apps/web/inngest/functions/process-donation.ts` — Inngest function triggered
   by 'donation/received':
   - Updates Brevo contact with DONOR=true, LAST_DONATION_DATE, TOTAL_DONATED
   - Adds to Donor list
   - Sends thank-you email via Brevo transactional template
   - If recurring: adds to Recurring Donor list
   - If first-time: sends first-time donor welcome variant

2. `apps/web/inngest/functions/donation-milestones.ts` — Inngest function:
   - Checks campaign_metrics.donation_total_cents after each donation
   - At configured thresholds ($1K, $5K, $10K, $25K, $50K, $100K):
     fires milestone event for social sharing and admin notification

3. `apps/web/app/api/admin/donations/route.ts` — Admin API:
   - GET: list donations with filters (date range, amount, recurring, refcode)
   - Aggregate stats: total, count, average, recurring %, by-refcode breakdown
   - CSV export for admin role only
   - Viewer role: masked email

4. `apps/web/app/api/admin/donations/refcodes/route.ts` — Refcode performance:
   - GET: returns refcode attribution data (which refcodes generated donations)
   - Groups by refcode with count, total, average

Reference Artifact 09 §4-6 for the complete donation processing pipeline,
milestone thresholds, and admin reporting specs.
```

---

## Phase 6: Inngest Workflows

### Prompt 6.1 — Inngest Setup & Petition Email Workflows (Source: Artifact 07, Handoff B)

```
Set up Inngest and create the petition-related email automation workflows.

Files to generate:

1. `apps/web/inngest/client.ts` — Inngest client initialization with
   event types definition. Define all event schemas as TypeScript types:
   'petition/signature.created', 'petition/email.verified',
   'donation/received', 'volunteer/signup', 'voice/submitted',
   'voice/approved', 'voice/rejected', 'voice/needs-review',
   'email/verification.resend'.

2. `apps/web/app/api/inngest/route.ts` — Inngest serve endpoint for
   Next.js App Router.

3. `apps/web/inngest/functions/petition-welcome.ts` — Triggered by
   'petition/signature.created':
   - Step 1: Send verification email via Brevo (template: email-verification)
   - Step 2: Create/update Brevo contact with attributes (SIGNER=true,
     SIGNATURE_NUMBER, REFERRAL_CODE, VERIFICATION_STATUS)
   - Step 3: Add to Petition Signers list
   - Step 4: If emailOptIn, add to Newsletter list
   - Step 5: Wait 24 hours, check if email verified
   - Step 6: If not verified, send reminder email
   - Step 7: Wait 48 more hours, send final reminder if still unverified

4. `apps/web/inngest/functions/petition-verified.ts` — Triggered by
   'petition/email.verified':
   - Update Brevo contact: EMAIL_VERIFIED=true, EMAIL_VERIFIED_AT
   - Send "Welcome — you're verified!" email with share + volunteer CTAs
   - Begin post-signature nurture sequence (3-email drip over 7 days)

5. `apps/web/inngest/functions/referral-tracking.ts` — Triggered by
   'petition/signature.created' when referredByCode is present:
   - Look up referrer's signature
   - Increment referrer's referral_count
   - Update campaign_metrics.referral_conversion_count
   - Send "Someone signed because of you!" notification to referrer

Reference Artifact 07 §2-3 for complete workflow definitions, email
template specs, timing, and Brevo list/attribute mappings.
```

### Prompt 6.2 — Post-Signature Nurture Sequence (Source: Artifact 07, Handoff C)

```
Create the post-signature email nurture sequences per Artifact 07 §4.

Files to generate:

1. `apps/web/inngest/functions/nurture-post-signature.ts`:
   - Triggered after email verification
   - Day 1: "The Story Behind Confluence" — history + rivers argument
   - Day 3: "What Others Are Saying" — community voices highlights
   - Day 7: "How You Can Help" — volunteer + share + donate CTAs
   - Each step checks unsubscribe status before sending
   - Uses Brevo transactional templates with dynamic params

2. `apps/web/inngest/functions/nurture-subscriber.ts`:
   - For non-signer email subscribers (signed up via footer/newsletter)
   - Day 0: Welcome + "Why Confluence?" overview
   - Day 2: "The Case in 5 Minutes" — link to /the-case
   - Day 5: Petition CTA — "Ready to sign?"
   - Day 10: Community voices + share CTA
   - Each step checks if they've since signed (skip to signer sequence)

3. `apps/web/inngest/functions/nurture-volunteer.ts`:
   - Triggered by 'volunteer/signup'
   - Day 0: Role-specific welcome email
   - Day 3: "Getting Started" guide based on selected roles
   - Day 7: First task assignment or event invitation
   - Day 14: Check-in email

Reference Artifact 07 §4 and docs/02-site-architecture.md §4 §4.4 for
the complete nurture sequences, day-by-day content specs, and Brevo
template requirements.
```

### Prompt 6.3 — Email List Management Workflows (Source: Artifact 07, Handoff D)

```
Create the email list management workflows per Artifact 07 §5.

Files to generate:

1. `apps/web/app/api/email/subscribe/route.ts` — POST handler for
   footer/page email signups:
   - Validate email with Zod
   - Check Turnstile token
   - Check honeypot
   - Insert into email_subscribers table
   - Create/update Brevo contact, add to Newsletter list
   - Fire Inngest event 'email/subscribed'
   - Return success JSON

2. `apps/web/app/api/email/unsubscribe/route.ts` — GET handler for
   one-click unsubscribe:
   - Read ?token= and ?email= from query params
   - Validate HMAC token (signed with EMAIL_VERIFICATION_SECRET)
   - Update email_subscribers.unsubscribed_at
   - Remove from all Brevo lists
   - Update Brevo contact UNSUBSCRIBED=true
   - Show confirmation page

3. `apps/web/inngest/functions/email-subscriber-welcome.ts`:
   - Triggered by 'email/subscribed'
   - Send welcome email with campaign overview
   - Begin subscriber nurture sequence

4. `apps/web/components/email/EmailSignupForm.tsx` — Reusable component:
   - Email input + submit button
   - Turnstile invisible widget
   - Success/error states
   - Used in footer, homepage, and blog sidebar

Reference Artifact 07 §5 for unsubscribe link generation (HMAC pattern),
list management rules, and CAN-SPAM compliance requirements.
```

### Prompt 6.4 — Email Template Specifications (Source: Artifact 07, Handoff E-F)

```
Create the email template specifications and Brevo template setup per Artifact 07 §6.

Files to generate:

1. `docs/email-templates.md` — Complete specification for all 17 email
   templates. For each template document:
   - Template name and Brevo template ID env var name
   - Subject line (with personalization tokens)
   - Preheader text
   - Body sections with copy
   - Dynamic parameters (Brevo {{ params.X }} syntax)
   - CTA buttons with URLs
   - Unsubscribe link placement

   Templates:
   1. Email Verification
   2. Verification Reminder (24h)
   3. Final Verification Reminder (72h)
   4. Welcome — Verified Signer
   5. Nurture: The Story Behind Confluence
   6. Nurture: What Others Are Saying
   7. Nurture: How You Can Help
   8. Subscriber Welcome
   9. Subscriber Nurture: The Case in 5 Minutes
   10. Subscriber Nurture: Ready to Sign?
   11. Subscriber Nurture: Community + Share
   12. Volunteer Welcome
   13. Volunteer Getting Started
   14. Volunteer First Task
   15. Volunteer Check-in
   16. Referral Notification
   17. Donation Thank You

2. `packages/email/template-ids.ts` — Mapping of template names to
   environment variable names for Brevo template IDs.

3. `scripts/create-brevo-templates.ts` — Script that creates placeholder
   templates in Brevo via API, outputs the template IDs to copy into
   .env.local. Uses Brevo API v3 POST /smtp/templates.

Reference Artifact 07 §6 for complete template copy, design specs, and
Brevo personalization token usage.
```

---

## Phase 7: Frontend Pages

### Prompt 7.0 — MDX Content Files (Source: Artifact 04, Handoff 1)

> **Note:** This prompt creates the content files that the page components below will consume. Run it first before building any frontend pages.

```
Create MDX content files for all site pages in the `content/pages/` directory. Each file should include YAML frontmatter and body copy.

File structure:
content/
├── pages/
│   ├── home.mdx
│   ├── the-case/
│   │   ├── index.mdx          (The Case parent)
│   │   ├── history.mdx
│   │   ├── the-rivers.mdx
│   │   ├── columbus-legacy.mdx
│   │   ├── precedents.mdx
│   │   └── the-process.mdx
│   ├── voices/
│   │   └── index.mdx          (Voices landing)
│   ├── sign.mdx
│   ├── volunteer.mdx
│   ├── donate.mdx
│   ├── about.mdx
│   ├── press.mdx
│   └── faq.mdx
└── blog/
    └── why-were-asking.mdx

Frontmatter schema for each file:
---
title: "Page Title"
description: "Meta description (120-155 chars)"
ogImage: "/images/og/page-name.png"
keywords: ["keyword1", "keyword2"]
---

Copy the exact body text from docs/04-page-by-page-copy.md for each page. Convert section headers to MDX-compatible markdown (## for H2, ### for H3). Preserve all formatting, CTAs, and form field specifications as HTML comments where they describe UI behavior rather than content (e.g., <!-- Live signature counter component --> or <!-- Smarty autocomplete form -->).

Do not modify copy. This is approved launch content. All historical claims verified in docs/01-messaging-framework.md.

Cross-reference docs/03-content-strategy-seo.md Section 6.2 for the specific title tags and meta descriptions to use in each file's frontmatter.
```

### Prompt 7.1 — Petition Page Component (Source: Artifact 06, Handoff 4)

```
Create the petition signing page component at apps/web/app/(public)/sign/page.tsx and supporting components.

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

### Prompt 7.2 — Thank You Page (Source: Artifact 06, Handoff 5)

```
Create the thank-you page at apps/web/app/(public)/sign/thank-you/page.tsx.

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

### Prompt 7.3 — Homepage and Static Pages (Source: Artifacts 02, 04)

```
Create the homepage and all static content pages using the approved copy from content/pages/*.mdx files and the page specifications from docs/02-site-architecture.md.

Files to generate:

1. `apps/web/app/(public)/page.tsx` — Homepage:
   - Hero with campaign headline, signature counter, primary CTA
   - "Why Confluence?" preview section (3 argument cards linking to /the-case/*)
   - Recent community voices preview (3 featured)
   - Live signature counter with milestone messaging
   - Email signup section
   - Copy from content/pages/home.mdx

2. `apps/web/app/(public)/the-case/page.tsx` — The Case parent page
3. `apps/web/app/(public)/the-case/history/page.tsx`
4. `apps/web/app/(public)/the-case/the-rivers/page.tsx`
5. `apps/web/app/(public)/the-case/columbus-legacy/page.tsx`
6. `apps/web/app/(public)/the-case/precedents/page.tsx`
7. `apps/web/app/(public)/the-case/the-process/page.tsx`

8. `apps/web/app/(public)/about/page.tsx` — About page
9. `apps/web/app/(public)/press/page.tsx` — Press page with media kit
10. `apps/web/app/(public)/faq/page.tsx` — FAQ with accordion component
11. `apps/web/app/(public)/privacy/page.tsx` — Privacy policy
12. `apps/web/app/(public)/terms/page.tsx` — Terms of service

Each page:
- Server component with generateMetadata() for SEO
- Loads copy from the corresponding MDX file
- Includes page-specific CTAs per docs/02-site-architecture.md
- Sub-navigation for /the-case/* pages
- Petition CTA in sidebar or bottom section

Use the (public) route group for all public-facing pages.
Reference docs/02-site-architecture.md for each page's component requirements.
Reference docs/03-content-strategy-seo.md §6 for meta tags per page.
```

### Prompt 7.4 — Blog Infrastructure (Source: Artifacts 03, 04)

```
Create the MDX blog infrastructure per Artifacts 03 and 04.

Files to generate:

1. `apps/web/lib/mdx.ts` — MDX utilities:
   - getBlogPosts(): reads content/blog/*.mdx, parses frontmatter, returns sorted list
   - getBlogPost(slug): reads single post, returns content + frontmatter
   - Uses gray-matter for frontmatter parsing
   - Uses next-mdx-remote for rendering

2. `apps/web/app/(public)/blog/page.tsx` — Blog index:
   - Lists all published posts (publishedAt <= now)
   - Post cards with title, excerpt, date, reading time, tags
   - Pagination (10 per page)
   - SEO meta per docs/03-content-strategy-seo.md §6

3. `apps/web/app/(public)/blog/[slug]/page.tsx` — Blog post page:
   - generateStaticParams() for static generation
   - generateMetadata() with post-specific OG tags
   - MDX content rendering with custom components
   - Author attribution
   - Share buttons (same as thank-you page)
   - Related posts section
   - Petition CTA at bottom
   - JSON-LD BlogPosting schema

4. `apps/web/components/mdx/index.tsx` — Custom MDX components:
   - Styled headings, blockquotes, code blocks, tables
   - Image component using next/image
   - Callout/aside component for highlighted text
   - Source citation component

5. `content/blog/why-were-asking.mdx` — Launch blog post (created by
   Prompt 7.0 — verify it's properly formatted)

Reference Artifact 03 §5 for content production workflow and Artifact 04
for the launch blog post copy.
```

### Prompt 7.5 — Layout, Navigation & Footer (Source: Artifact 02)

```
Create the site layout, navigation, and footer components per Artifact 02 §3.

Files to generate:

1. `apps/web/app/(public)/layout.tsx` — Public layout:
   - Wraps all public pages
   - Includes Header, Footer, SkipLink, ErrorAnnouncer provider
   - Loads fonts via next/font
   - Global Tailwind styles

2. `apps/web/components/layout/Header.tsx` — Desktop + mobile header:
   - Logo/wordmark linking to /
   - Primary nav: Home, The Case (dropdown), Voices, Volunteer, Donate, About
   - "The Case" dropdown with sub-pages
   - Accent "Sign the Petition" button
   - Mobile: hamburger menu with FocusTrap
   - Sticky on scroll (desktop), persistent (mobile)

3. `apps/web/components/layout/MobileNav.tsx` — Mobile navigation:
   - Full-screen overlay menu
   - All nav items with icons
   - Close button
   - FocusTrap when open
   - Persistent sticky bottom CTA bar: "Sign the Petition"
   - Bottom bar hides when virtual keyboard is open

4. `apps/web/components/layout/Footer.tsx` — Site footer:
   - 3-column layout: Campaign links, Legal links, Connect
   - Email signup form (EmailSignupForm component)
   - Social links: Facebook, X/Twitter, Instagram
   - Legal text: campaign finance disclaimer, 501(c)(4) status
   - Privacy policy + Terms links
   - Copyright

5. `apps/web/components/layout/SubNav.tsx` — Sub-navigation for
   /the-case/* pages (horizontal scrolling tabs on mobile)

Reference Artifact 02 §3 for the complete navigation design spec.
```

---

## Phase 8: Social Sharing & Referrals

### Prompt 8.1 — Share Buttons Component (Source: Artifact 11, Handoff A)

```
Create the social sharing components per Artifact 11 §1-2.

Files to generate:

1. `packages/ui/components/share-buttons.tsx` — ShareButtons component:
   - Platforms: Facebook, Twitter/X, WhatsApp, Email, Copy Link, native
     Web Share API (if available)
   - Props: url, text, hashtags, via, context (petition/voice/blog/donate)
   - Each button generates platform-specific share URL
   - Copy Link: navigator.clipboard with "Copied!" feedback
   - Web Share API: navigator.share() with fallback to button row
   - All share URLs include ?ref=[referralCode] if available
   - Tracks PostHog events: share_button_clicked, share_link_copied

2. `packages/ui/components/share-popover.tsx` — SharePopover variant:
   - Dropdown/popover version for inline use
   - FocusTrap when open
   - Used on blog posts and voice cards

3. Platform-specific share URL builders:
   - Facebook: https://www.facebook.com/sharer/sharer.php?u=
   - Twitter: https://twitter.com/intent/tweet?text=&url=&hashtags=
   - WhatsApp: https://wa.me/?text=
   - Email: mailto:?subject=&body=
   - LinkedIn: https://www.linkedin.com/sharing/share-offsite/?url=

4. Share text templates per context:
   - Petition signed: "I just signed the petition to rename Columbus to
     Confluence, Ohio — a name that honors what this city actually is.
     Will you join me?"
   - Voice shared: "Read why [name] [supports/opposes] renaming Columbus
     to Confluence, Ohio"
   - Blog: "[title] — from the Confluence Ohio campaign"
   - General: "Should Columbus, Ohio become Confluence, Ohio? Here's the case."

Reference Artifact 11 §1-2 for complete share text templates, platform
URL specs, and analytics event definitions.
```

### Prompt 8.2 — Dynamic OG Images (Source: Artifact 11, Handoff B)

```
Create dynamic Open Graph image generation per Artifact 11 §3.

Files to generate:

1. `apps/web/app/api/og/route.tsx` — Dynamic OG image endpoint using
   next/og (ImageResponse):
   - Query params: type (petition/voice/blog/milestone), title, subtitle,
     count, name
   - Renders 1200x630 image with:
     - Campaign branding (logo, colors, fonts)
     - Type-specific layout
   - Petition: "Join [count] signers" with progress bar
   - Voice: quote excerpt with author name and position
   - Blog: title + date + campaign branding
   - Milestone: celebration design with count
   - Cache: s-maxage=3600, stale-while-revalidate=86400

2. `apps/web/app/api/og/petition/route.tsx` — Petition-specific OG:
   - Shows current signature count (queried at generation time)
   - Progress bar toward 22,000 goal
   - "Sign the petition" CTA text

3. Update all page generateMetadata() functions to use dynamic OG
   image URLs with appropriate parameters.

Reference Artifact 11 §3 for OG image designs, Artifact 03 §4 for
the OG strategy, and the next/og documentation for ImageResponse API.
```

### Prompt 8.3 — Referral Tracking System (Source: Artifact 11, Handoff C-D)

```
Create the referral tracking system per Artifact 11 §4-5.

Files to generate:

1. `apps/web/middleware.ts` — Update existing middleware to:
   - Read ?ref= query param on any page
   - Store in cookie 'ref_code' (7-day expiry, httpOnly, sameSite=lax)
   - Track referral click: increment referral_clicks table or
     campaign_metrics.referral_click_count
   - Pass ref_code to petition form via cookie

2. `apps/web/app/api/referral/click/route.ts` — POST handler:
   - Records referral click with: referral_code, landing_page, utm_source,
     utm_medium, user_agent, ip_hash
   - Rate limited to prevent inflation
   - Fire Inngest event 'referral/click'

3. `apps/web/inngest/functions/track-referral-conversion.ts`:
   - Triggered by 'petition/signature.created' when referredByCode present
   - Links click to conversion
   - Computes attribution (first-touch: earliest click for that ref code)

4. `apps/web/app/api/referral/leaderboard/route.ts` — GET handler:
   - Returns top N referrers (name, count, referral_code)
   - Public endpoint (for potential Phase 2 leaderboard page)
   - Cached 5 minutes

5. `packages/core/referral/utils.ts` — Referral utilities:
   - buildReferralUrl(baseUrl, refCode) — appends ?ref= param
   - parseRefCode(url) — extracts ref code from URL
   - isValidRefCode(code) — validates CONF-XXXX format

Reference Artifact 11 §4-5 for complete referral flow, attribution model,
and leaderboard specs.
```

---

## Phase 9: SEO & Structured Data

### Prompt 9.1 — Meta Tags & Sitemap (Source: Artifact 12, Handoff A)

```
Implement the SEO meta tag system and sitemap per Artifact 12 §1-2.

Files to generate:

1. `apps/web/lib/seo.ts` — SEO utility functions:
   - generatePageMetadata(page): returns Next.js Metadata object with
     title, description, canonical URL, OG tags, Twitter card
   - Default template: "[Page Title] | Confluence Ohio"
   - All required OG properties: og:title, og:description, og:image,
     og:url, og:type, og:site_name
   - Twitter card: summary_large_image

2. `apps/web/app/sitemap.ts` — Next.js sitemap generation:
   - All static pages with priority and changeFrequency
   - Dynamic: /blog/[slug] from MDX files
   - Dynamic: /voices/[id] for approved voice submissions
   - Priority: homepage 1.0, /sign 0.9, /the-case/* 0.8, others 0.6
   - changeFrequency: homepage daily, blog weekly, static monthly

3. `apps/web/app/robots.ts` — Next.js robots.txt generation:
   - Allow all crawlers
   - Disallow: /admin/*, /api/*, /sign/verify/*, /sign/thank-you
   - Sitemap URL

4. Update all page.tsx files to use generatePageMetadata() in their
   generateMetadata() exports. Cross-reference docs/03-content-strategy-seo.md §6
   §6.2 for the specific title tags and meta descriptions per page.

Reference Artifact 12 §1-2 and docs/03-content-strategy-seo.md §6 for complete
SEO requirements per page.
```

### Prompt 9.2 — JSON-LD Structured Data (Source: Artifact 12, Handoff B)

```
Implement JSON-LD structured data per Artifact 12 §3 and docs/03-content-strategy-seo.md §3.

Files to generate:

1. `packages/ui/components/json-ld.tsx` — Generic JsonLd component:
   - Renders <script type="application/ld+json"> in document head
   - Type-safe props for each schema type
   - Sanitizes output to prevent XSS

2. `apps/web/lib/schema.ts` — Schema generators:
   - organizationSchema(): Organization with Nonprofit501c4 type, name,
     url, logo, sameAs (social profiles), foundingDate
   - breadcrumbSchema(items): BreadcrumbList from page hierarchy
   - blogPostSchema(post): BlogPosting with author, datePublished,
     dateModified, image, description
   - faqSchema(questions): FAQPage (with deprecation note — still valid
     for non-Google rich results)
   - webPageSchema(page): WebPage with name, description, url

3. Update all page.tsx files to include appropriate JSON-LD:
   - Every page: Organization + BreadcrumbList
   - Blog posts: BlogPosting
   - FAQ page: FAQPage
   - Homepage: WebPage with mainEntity Organization

4. `apps/web/lib/__tests__/schema.test.ts` — Validate JSON-LD output:
   - Valid JSON
   - Required @context and @type fields
   - No undefined or null values in output
   - Organization schema matches campaign details

Reference docs/03-content-strategy-seo.md §3 for complete JSON-LD specifications
and the schema-to-page mapping table.
```

### Prompt 9.3 — Canonical URLs & Redirects (Source: Artifact 12, Handoff C)

```
Implement canonical URLs and redirect rules per Artifact 12 §4.

Files to generate/update:

1. Update `apps/web/middleware.ts` to handle:
   - Trailing slash removal (redirect /sign/ → /sign)
   - www to apex redirect (www.confluenceohio.org → confluenceohio.org)
   - HTTP to HTTPS redirect (handled by Vercel, but verify)

2. `apps/web/next.config.ts` — Add redirects:
   - /petition → /sign (common alternative)
   - /stories → /voices
   - /community → /voices
   - /how → /the-case/the-process
   - /contribute → /donate
   - /join → /volunteer

3. Verify every page has a canonical URL in its metadata.
   Canonical URL pattern: https://confluenceohio.org/[path]

4. Create `public/_headers` or update vercel.json for:
   - X-Robots-Tag on admin pages: noindex
   - X-Robots-Tag on API routes: noindex

Reference Artifact 12 §4 and docs/03-content-strategy-seo.md §6 §6.3 for all
redirect rules and canonical URL requirements.
```

### Prompt 9.4 — Search Console & Performance Verification (Source: Artifact 12, Handoff D-E)

```
Create SEO verification tooling per Artifact 12 §5.

Files to generate:

1. `scripts/verify-seo.ts` — SEO verification script:
   - Crawls all pages in sitemap
   - For each page verifies:
     - Title tag present and unique
     - Meta description present (120-155 chars)
     - Canonical URL present and correct
     - OG tags complete (title, description, image, url)
     - JSON-LD present and valid
     - H1 tag present (exactly one per page)
     - No broken internal links
   - Outputs report with pass/fail per page

2. `docs/search-console-setup.md` — Google Search Console setup guide:
   - Domain verification via Cloudflare DNS TXT record
   - Sitemap submission
   - URL inspection for key pages
   - Performance monitoring baseline

3. `scripts/test-og-images.ts` — OG image verification:
   - Hits /api/og with various params
   - Verifies 200 response and correct content-type
   - Tests all page OG image URLs resolve

Reference docs/03-content-strategy-seo.md §6 for the complete verification requirements.
```

---

## Phase 10: Analytics

### Prompt 10.1 — Analytics Provider Setup (Source: Artifact 13, Handoff 1)

```
Read docs/13-analytics-conversion-tracking.md sections 1 and 2.

Create the following files:

1. `apps/web/app/providers.tsx` — AnalyticsProvider component wrapping PostHog
   in cookieless mode (persistence: 'memory', capture_pageview: false,
   respect_dnt: true, session recording with maskAllInputs: true)

2. `apps/web/components/analytics/posthog-pageview.tsx` — PostHogPageView
   component that captures $pageview on every App Router route change, wrapped
   in Suspense. Include UTM and ref_code extraction from search params.

3. `packages/core/analytics/posthog-server.ts` — Server-side PostHog client
   singleton using posthog-node. Include captureServerEvent() helper.

4. `packages/core/analytics/track-event.ts` — Unified client-side trackEvent()
   function that dispatches to PostHog and optionally GA4. Include identifyUser()
   and resetIdentity() functions. identifyUser takes an email hash, never raw email.

5. Update `apps/web/app/layout.tsx` to include AnalyticsProvider, PostHogPageView,
   Vercel Analytics (<Analytics />), Vercel Speed Insights (<SpeedInsights />),
   GA4ConsentLoader, and CookieBanner. GA4 loads only after consent — see
   Prompt 10.6 for the consent components.

6. `next.config.ts` — Add PostHog reverse proxy rewrites (/ingest/* → us.i.posthog.com).

7. Add to `.env.local.example`:
   NEXT_PUBLIC_POSTHOG_KEY=
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   POSTHOG_API_KEY=
   NEXT_PUBLIC_GA4_ID=

Install packages: posthog-js, posthog-node, @vercel/analytics, @vercel/speed-insights

All code must be TypeScript. Follow the hexagonal architecture — analytics is an
infrastructure adapter, not domain logic.
```

### Prompt 10.2 — Event Tracking Implementation (Source: Artifact 13, Handoff 2)

```
Read docs/13-analytics-conversion-tracking.md section 3 for the full
event taxonomy and section 8 for implementation patterns.

Create the following files:

1. `packages/ui/hooks/use-form-analytics.ts` — Reusable hook for tracking form
   interactions (form_started, field_completed, form_submitted) with automatic
   field timing. Accepts formName parameter for event namespacing.

2. `packages/ui/components/tracked-cta.tsx` — TrackedCTA component that wraps
   anchor tags and fires cta_clicked events with cta_id, cta_text, page, and
   destination properties.

3. `packages/ui/hooks/use-scroll-tracking.ts` — Hook for tracking scroll depth
   on blog posts at 25/50/75/100% milestones.

4. Integrate form analytics into the petition form (apps/web/app/sign/):
   - petition_page_viewed on mount
   - petition_form_started on first field interaction
   - petition_field_completed on each field blur
   - petition_address_autocomplete_selected when Smarty suggestion chosen
   - petition_form_submitted on submit

5. Integrate donation analytics into the ActBlue embed (apps/web/app/donate/):
   - donate_page_viewed on mount
   - donate_embed_loaded when iframe renders
   - donate_initiated on onContribute callback
   - donate_flow_complete on onComplete callback

6. Integrate share button analytics (packages/ui/components/share-buttons.tsx):
   - share_button_clicked with platform, context, and page properties
   - share_link_copied on clipboard copy
   - share_native_completed / share_native_cancelled for Web Share API

7. Add server-side event capture to:
   - POST /api/petition/sign: petition_verification_success or petition_verification_failed
   - POST /api/webhooks/actblue: donate_webhook_received
   - Inngest track-referral-conversion: referral_conversion

Use the posthog.register() super properties pattern for session-level context
(app_version, initial UTM params, initial ref_code).
```

### Prompt 10.3 — A/B Testing Framework (Source: Artifact 13, Handoff 3)

```
Read docs/13-analytics-conversion-tracking.md section 5 for the full spec.

Create the following:

1. Server-side flag bootstrapping in `apps/web/app/layout.tsx`:
   - Read PostHog distinct_id from cookies (or generate new UUID)
   - Call posthog.getAllFlags(distinctId) server-side
   - Inject flags into window.__PH_FLAGS__ via script tag
   - Pass distinct_id to client for PostHog init bootstrap

2. `packages/ui/hooks/use-feature-flag.ts` — useExperiment() hook that wraps
   PostHog's useFeatureFlagVariantKey and useFeatureFlagPayload. Returns
   { variant, payload, isControl, isLoading }.

3. Create experiment components for the first three planned experiments:
   - `apps/web/app/(public)/sign/components/petition-headline.tsx` (exp_petition_headline)
   - `apps/web/app/(public)/sign/components/petition-cta-button.tsx` (exp_petition_cta_text)
   - `apps/web/app/(public)/sign/thank-you/components/share-prompt.tsx` (exp_thankyou_share_prompt)

   Each component should render the control variant by default and use useExperiment()
   to select the active variant.

4. `scripts/setup-posthog-experiments.ts` — Script that uses PostHog's API to
   create the 6 planned experiments defined in §5.4 with proper variant definitions
   and goal metrics. Include instructions for running it once during project setup.

Feature flags must be evaluated server-side first (no variant flickering).
Client-side hooks consume the bootstrapped values.
```

### Prompt 10.4 — Admin Dashboard Metrics (Source: Artifact 13, Handoff 4)

```
Read docs/13-analytics-conversion-tracking.md section 6.

Create the following:

1. `apps/web/app/api/admin/metrics/route.ts` — Admin-protected API route that
   returns all dashboard metrics in a single response. Uses Promise.all for parallel
   Supabase queries. Requires admin auth (use requireAdmin middleware from artifact 15).

2. SQL migration for new RPC functions:
   - get_average_donation() → integer (cents)
   - get_recurring_donation_pct() → numeric
   - get_top_referrers(p_limit integer) → table(first_name, last_initial, referral_code, conversion_count)
   - get_top_referral_platform() → table(platform, total_conversions)
   All functions are SECURITY DEFINER and STABLE.

3. `packages/core/analytics/compute-trend.ts` — computeTrend() utility for
   calculating directional trends (up/down/flat) and percent change.

4. `apps/web/app/(admin)/admin/hooks/use-live-signatures.ts` — Hook using Supabase
   Realtime to subscribe to new signature inserts for a live feed.

5. Dashboard metric card components:
   - `apps/web/app/(admin)/admin/components/metric-card.tsx` — displays value, label,
     trend indicator, and optional progress bar
   - `apps/web/app/(admin)/admin/components/dashboard-grid.tsx` — 3×3 grid layout
     matching the wireframe in §6.1

All admin routes require authentication. All queries use the service_role client.
```

### Prompt 10.5 — PostHog Alerts and Dashboards (Source: Artifact 13, Handoff 5)

```
Read docs/13-analytics-conversion-tracking.md section 7.

Create the following:

1. `scripts/setup-posthog-dashboards.ts` — Script using PostHog's API to create
   the 5 recommended dashboards:
   - Campaign Overview (funnel + trends)
   - Petition Deep Dive (field completion, abandonment)
   - Sharing & Virality (platform breakdown, k-factor)
   - Donations (funnel, refcode performance)
   - Active Experiments (variant performance)

   Include insight definitions for each dashboard panel.

2. `scripts/setup-posthog-alerts.ts` — Script to create the 6 monitoring alerts:
   - Signature surge (>200/hour)
   - Signature drought (<5 in 4 hours, 8am-10pm ET)
   - Verification failure spike (>20%/hour)
   - High form abandonment (start→submit <40%)
   - Donation spike (>$500/hour)
   - Bot activity (>50 rate-limited/hour)

   Alerts send email to Tim.

3. `docs/analytics-runbook.md` — Operational guide explaining:
   - What each alert means and first-response actions
   - How to read the dashboards
   - How to create and evaluate A/B tests
   - How to add new tracked events
   - PostHog data retention and privacy settings

Both scripts should be runnable via `npx tsx scripts/setup-posthog-dashboards.ts`
with POSTHOG_API_KEY in environment.
```

### Prompt 10.6 — GA4 Integration and Cookie Consent (Source: Artifact 13, Handoff 6)

```
Read docs/13-analytics-conversion-tracking.md section 2.7.

Create the following:

1. `apps/web/components/analytics/ga4-consent.tsx` — GA4ConsentLoader component
   that only loads GA4 scripts after the user grants analytics consent. Uses
   sessionStorage for consent state. Listens for 'analytics-consent' custom event.

2. `apps/web/components/analytics/cookie-banner.tsx` — Minimal cookie consent
   banner. Two buttons: "Accept Analytics" and "Continue without tracking".
   Dispatches 'analytics-consent' custom event on acceptance. Shows only when
   GA4 is configured (NEXT_PUBLIC_GA4_ID is set).

3. Update `packages/core/analytics/track-event.ts` to dispatch events to GA4
   via window.gtag() when available.

4. Update `apps/web/app/layout.tsx` to include GA4ConsentLoader and CookieBanner.

5. Set up GA4 key events (conversions) for:
   - petition_verification_success
   - donate_webhook_received
   - volunteer_form_submitted

   Document the GA4 dashboard setup for reporting.

GA4 must be consent-gated. PostHog continues to work in cookieless mode regardless
of consent state. The cookie banner must meet GDPR requirements (no pre-checked boxes,
clear opt-out, no tracking before consent).

Note: Google Ad Grants is unavailable to 501(c)(4) organizations. GA4 is included
for Google ecosystem integration (Search Console, audience building for paid ads,
cross-platform attribution).
```

---

## Phase 11: Accessibility & Performance

### Prompt 11.1 — Accessibility Utility Components (Source: Artifact 14, Handoff A)

```
Create the accessibility utility components in packages/ui/src/a11y/ per Artifact 14 §4.

Files to create:
1. packages/ui/src/a11y/SkipLink.tsx — Skip navigation link, visually hidden until focused. Uses Tailwind sr-only / focus:not-sr-only pattern. Targets #main-content by default. On click, sets tabindex=-1 on target and focuses it, removes tabindex on blur.

2. packages/ui/src/a11y/VisuallyHidden.tsx — Renders children in a span (or configurable element) with className="sr-only". Used for screen-reader-only labels on icon buttons, hidden headings, etc.

3. packages/ui/src/a11y/FocusTrap.tsx — Client component. Props: active (boolean), onEscape (callback), returnFocusTo (optional HTMLElement), autoFocus (boolean, default true), children. When active: stores previously focused element, auto-focuses first focusable child, wraps Tab/Shift+Tab at boundaries, calls onEscape on Escape key. When deactivated: returns focus to previous element. Used for mobile nav menu and share popovers. Prefer native <dialog> for modals.

4. packages/ui/src/a11y/ReducedMotion.tsx — exports useReducedMotion() hook. Uses matchMedia('(prefers-reduced-motion: reduce)') with change listener. Returns boolean. Used by signature counter animation, progress bar, page transitions.

5. packages/ui/src/a11y/ErrorAnnouncer.tsx — React context provider + useAnnouncer() hook. Provider renders two sr-only divs: one role="status" aria-live="polite", one role="alert" aria-live="assertive". The announce(message, politeness) function clears then sets text (on next tick to trigger re-announcement of identical messages). Wrap in app layout.tsx.

6. packages/ui/src/a11y/index.ts — barrel export of all components and hooks.

Also add the global reduced-motion CSS to the global stylesheet:
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

And the global focus-visible styles:
:focus-visible {
  outline: 3px solid var(--color-focus-ring, #1A73E8);
  outline-offset: 2px;
  border-radius: 2px;
}
:focus:not(:focus-visible) {
  outline: none;
}

Write tests for each component using vitest + @testing-library/react:
- SkipLink: renders, is focusable, moves focus to target on Enter
- VisuallyHidden: renders with sr-only class, supports 'as' prop
- FocusTrap: traps focus when active, releases when inactive, returns focus, handles Escape
- useReducedMotion: returns false by default, responds to media query change
- ErrorAnnouncer: announce() sets text in the correct aria-live region

Reference: Artifact 14 §4 for full implementation specs.
```

### Prompt 11.2 — ESLint Accessibility Configuration (Source: Artifact 14, Handoff B)

```
Update the ESLint configuration to enforce strict accessibility rules per Artifact 14 §3.1.1.

In the root .eslintrc.json (or eslint.config.js if using flat config):
- Extend "next/core-web-vitals" (already includes eslint-plugin-jsx-a11y)
- Override all jsx-a11y rules listed in Artifact 14 §3.1.1 to "error" severity
- Key rules: alt-text, anchor-has-content, anchor-is-valid, label-has-associated-control (assert: "either"), tabindex-no-positive, click-events-have-key-events, heading-has-content, html-has-lang, interactive-supports-focus, no-static-element-interactions, role-has-required-aria-props

Verify: run eslint across the codebase after configuration. Fix any existing violations. All jsx-a11y rules should fail the build (error, not warn).
```

### Prompt 11.3 — axe-core Integration Tests (Source: Artifact 14, Handoff C)

```
Set up vitest-axe for runtime accessibility testing per Artifact 14 §3.1.2.

1. Install: vitest-axe (as devDependency)
2. Add to vitest.setup.ts: import 'vitest-axe/extend-expect'
3. Create accessibility test files for each interactive component:

Required test files (one per component):
- __tests__/a11y/petition-form.a11y.test.tsx
- __tests__/a11y/volunteer-form.a11y.test.tsx
- __tests__/a11y/voices-form.a11y.test.tsx
- __tests__/a11y/email-signup.a11y.test.tsx
- __tests__/a11y/navigation.a11y.test.tsx
- __tests__/a11y/share-buttons.a11y.test.tsx
- __tests__/a11y/faq-accordion.a11y.test.tsx
- __tests__/a11y/signature-counter.a11y.test.tsx

Each test file should:
- Render the component in its default state and run axe()
- Render the component in its error state and run axe()
- Render the component in its success/loading state and run axe()
- Test with interactive states (dropdown open, menu expanded) where applicable

Use the component states matrix from Artifact 14 §3.1.2 table.

Note: Mock Smarty API calls and Supabase Realtime in tests. The axe tests verify DOM structure, not backend behavior.
```

### Prompt 11.4 — Lighthouse CI & Pa11y CI (Source: Artifact 14, Handoff D)

```
Set up Lighthouse CI and Pa11y CI per Artifact 14 §3.1.3 and §3.1.4.

Files to create:

1. lighthouserc.json — Desktop configuration. URLs: /, /sign, /the-case, /voices, /volunteer, /donate, /faq, /blog. 3 runs per URL. Assert: performance ≥0.90, accessibility ≥0.95, best-practices ≥0.90, SEO ≥0.95, LCP ≤2500, CLS ≤0.1, total-byte-weight ≤500000. Upload to temporary-public-storage.

2. lighthouserc.mobile.json — Mobile configuration. URLs: /, /sign (the two highest-traffic mobile pages). 3 runs, mobile preset, 4x CPU slowdown, 150ms RTT, 1638.4 Kbps throughput. Assert: performance ≥0.85, accessibility ≥0.95, LCP ≤3000, CLS ≤0.1.

3. .pa11yci.json — WCAG2AA standard. All 15 static page URLs. 30-second timeout, 2-second wait. No ignored rules.

4. .github/workflows/lighthouse.yml — GitHub Action that:
   - Triggers on PRs to main
   - Checks out code, installs deps, builds
   - Runs Lighthouse CI desktop
   - Runs Lighthouse CI mobile
   - Runs Pa11y CI
   - Uploads artifacts
   - Posts results as PR comment

5. Add bundlesize to package.json per Artifact 14 §3.1.5: main chunk ≤80KB, app chunk ≤50KB, CSS ≤30KB.

Reference: Artifact 14 §3.1.3–§3.1.5 for full configuration details.
```

### Prompt 11.5 — Accessibility Integration Pass (Source: Artifact 14, Handoff E)

```
Audit and update all existing UI components for WCAG 2.1 AA compliance per Artifact 14 §1.

This prompt assumes the core components from earlier prompts (petition form, volunteer form, voices form, navigation, etc.) have been built. Audit each and apply:

1. SkipLink: Add <SkipLink /> as the first child of the root layout (app/layout.tsx). Add id="main-content" to the <main> element on every page.

2. ErrorAnnouncer: Wrap the app in <AnnouncerProvider> in layout.tsx. Update all forms to use announce() for:
   - Error summaries (assertive)
   - Success messages (polite)
   - Counter updates (polite, debounced to max 1 per 10 seconds)

3. Focus management:
   - Petition form: Smarty autocomplete must use aria-activedescendant, role="listbox" on dropdown, role="option" on suggestions
   - Mobile nav: wrap menu content in <FocusTrap active={isOpen} onEscape={close}>
   - Share popovers: wrap in <FocusTrap>

4. Form field audit:
   - Every <input> has <label> with matching htmlFor/id
   - Every required field has aria-required="true"
   - Every field with helper text uses aria-describedby
   - Error messages linked via aria-describedby (pointing to both helper AND error spans)
   - Autocomplete attributes on all personal data fields per Artifact 14 §1.3.5

5. ARIA landmarks:
   - <header role="banner"> (only the site header, not section headers)
   - <nav aria-label="Main navigation">
   - <main id="main-content"> on every page
   - <footer role="contentinfo">
   - <aside aria-label="..."> for sidebar content if applicable

6. Signature counter: role="status", aria-live="polite", aria-label="Petition signatures". Number updates announced max once per 10 seconds.

7. Progress bar: role="progressbar", aria-valuenow, aria-valuemin="0", aria-valuemax="[goal]", aria-label="Petition progress toward [goal] signatures".

8. Reduced motion: import useReducedMotion() in counter animation and progress bar. When true, set animation duration to 0.

9. Route change handling: verify Next.js built-in route announcer works. If not, add RouteAnnouncer per Artifact 14 §1.5.

10. Color palette proposal: As part of this integration pass, propose a brand color palette (primary, secondary, accent, neutral, error, success) inspired by the "confluence" / rivers theme and civic campaign aesthetics. Every text/background combination must meet WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text). Produce the palette as CSS custom properties in the global stylesheet and a design-tokens.ts file. Include a contrast verification table showing every combination and its ratio.

Reference: Artifact 14 §1 (full WCAG checklist) and §4 (component specs) for all requirements.
```

### Prompt 11.6 — Performance Optimization (Source: Artifact 14, Handoff F)

```
Implement the performance budget and optimization strategies from Artifact 14 §2.

1. Font loading:
   - Use next/font for font loading (local fonts preferred for performance)
   - Body font: font-display: optional (prevents CLS — shows fallback if font doesn't load in ~100ms)
   - Heading font: font-display: swap
   - Max 2 font families, 2–3 weights total
   - Total font weight < 50KB

2. Image optimization:
   - All images use next/image with explicit width/height
   - Above-the-fold images: priority={true}
   - Responsive srcSet for all images
   - Format negotiation: WebP/AVIF automatic via Next.js

3. Script loading:
   - PostHog: next/script strategy="afterInteractive"
   - Smarty autocomplete: dynamic import, only on /sign
   - Turnstile: dynamic import, only on pages with forms (/sign, /voices/share, /volunteer)
   - No global third-party scripts in _document or layout

4. Code splitting:
   - ShareButtons: dynamic(() => import('./ShareButtons'), { ssr: false })
   - SignatureCounter (Realtime): dynamic with ssr: false, show skeleton during load
   - Blog MDX content: statically generated at build time

5. SSR/ISR strategy per Artifact 14 §2.4:
   - SSG: /the-case/*, /about, /faq, /press, /privacy, /terms
   - ISR (60s): /, /voices, /blog
   - Dynamic SSR with streaming: /sign (needs fresh counter + Turnstile)
   - SSG at build: /blog/[slug] (from MDX)

6. CLS prevention per Artifact 14 §2.5:
   - Counter: fixed min-height container, CSS-only animation
   - Fonts: size-adjust in @font-face for fallback matching
   - Autocomplete dropdown: position: absolute
   - All images: explicit dimensions

7. Bundle analysis: Add @next/bundle-analyzer. Add npm script "analyze": "ANALYZE=true next build". Run and verify per-route JS is under 150KB compressed.

Reference: Artifact 14 §2 for all targets and strategies.
```

---

## Phase 12: Admin Dashboard

### Prompt 12.1 — Admin Auth & Middleware (Source: Artifact 15, Handoff A)

```
You are building the admin authentication layer for the Confluence Ohio campaign site.
This is a Next.js 15 App Router project using Supabase Auth, hosted on Vercel.

Context:
- The admin dashboard lives at apps/web/app/(admin)/admin/ as a route group
- Admin users are stored in the admin_users table (see packages/db/migrations/)
- The admin_role enum has three values: admin, moderator, viewer
- Authentication uses Supabase email+password (not magic links)
- Role is injected into JWT via a Custom Access Token Hook

Tasks:
1. Create the Supabase Custom Access Token Hook function (SQL) that checks
   admin_users and injects admin_role into app_metadata claims.
   File: packages/db/migrations/007_admin_dashboard.sql (partial — auth hook section)

2. Create the admin middleware in apps/web/middleware.ts that:
   - Intercepts all /admin/* routes except /admin/login
   - Uses supabase.auth.getUser() (NOT getSession()) to validate the JWT
   - Checks app_metadata.admin_role for a valid role
   - Redirects to /admin/login if unauthenticated or unauthorized
   - Passes the admin role via response header x-admin-role

3. Create packages/core/auth/admin.ts with:
   - requireAdmin(allowedRoles) — verifies admin from JWT + DB fallback
   - requireFullAdmin() — convenience for admin-only operations
   - AdminUser and AdminRole types

4. Create the admin login page at apps/web/app/(admin)/admin/login/page.tsx:
   - Email + password form
   - Error handling for invalid credentials and unauthorized accounts
   - Redirect to ?redirect param or /admin after login
   - Branded but minimal design

5. Create the MFA pages:
   - apps/web/app/(admin)/admin/mfa/enroll/page.tsx — TOTP enrollment with QR code,
     manual secret fallback, 6-digit verification
   - apps/web/app/(admin)/admin/mfa/verify/page.tsx — TOTP challenge for returning
     admin logins, 6-digit code input, redirect after verification
   - MFA is REQUIRED for all admin accounts. Middleware enforces AAL2.
   - First login redirects to /admin/mfa/enroll. Subsequent logins redirect to
     /admin/mfa/verify.

6. Create the admin layout at apps/web/app/(admin)/admin/layout.tsx:
   - Server component that calls requireAdmin()
   - Redirects to login if not authenticated
   - Renders AdminSidebar and AdminHeader
   - Passes admin role to sidebar for nav gating

Reference the existing Supabase client setup in lib/supabase/.
Reference the admin_users table schema in packages/db/migrations/.
Use @supabase/ssr for all Supabase client creation (not the deprecated auth-helpers).
```

### Prompt 12.2 — Dashboard Home & Metrics (Source: Artifact 15, Handoff B)

```
You are building the admin dashboard home page for the Confluence Ohio campaign.

Context:
- Admin auth is already implemented (requireAdmin, middleware, login)
- The campaign_metrics table has real-time counters (signature_count,
  verified_signature_count, email_subscriber_count, volunteer_count,
  voice_submission_count, donation_total_cents, referral_click_count,
  referral_conversion_count)
- Supabase Realtime is used for live signature counter updates
- PostHog tracks conversion rate (petition_verification_success / unique visitors)

Tasks:
1. Create the SQL migration with dashboard aggregate functions:
   - avg_donation_cents()
   - recurring_donation_pct()
   - top_referral_platform()
   - referral_k_factor()
   - recent_admin_activity(limit_count)
   - top_referrers(limit_count)
   - donation_refcode_performance()
   - adjust_signature_count(adjustment)
   File: packages/db/migrations/007_admin_dashboard.sql (functions section)

2. Create the dashboard home at apps/web/app/(admin)/admin/page.tsx:
   - Server component with revalidate = 60
   - Parallel data fetching using Promise.all
   - Renders DashboardGrid (metric cards) and RecentActivity (feed)

3. Create components/admin/dashboard-grid.tsx:
   - Hero row: Total Signatures (with progress bar), Signatures Today
     (with vs-yesterday trend), Conversion Rate (with vs-last-week trend)
   - Secondary row: Donations, Volunteers, Pending Voices, Email List
   - Third row: Recent Activity feed, Referral K-factor card

4. Create components/admin/live-signature-counter.tsx:
   - Client component subscribing to campaign_metrics via Supabase Realtime
   - Shows animated count update when signatures change
   - Progress bar toward signature_goal from campaign_settings

5. Create components/admin/recent-activity.tsx:
   - Renders the activity feed from recent_admin_activity()
   - Icon + color per activity type (signature, voice, donation, volunteer)
   - Relative timestamps

6. Create the admin metrics API route at apps/web/app/api/admin/metrics/route.ts:
   - Requires admin/moderator/viewer role
   - Returns all dashboard metrics in a single response
   - Used as fallback for client-side polling between ISR revalidations
```

### Prompt 12.3 — Signatures Management (Source: Artifact 15, Handoff C)

```
You are building the signatures management page for the Confluence Ohio admin.

Context:
- signatures table schema is defined in packages/db/migrations/
- Admin auth middleware protects /admin/* routes
- Viewer role can see signatures but not modify or export
- CSV export logs PII access for audit

Tasks:
1. Create apps/web/app/(admin)/admin/signatures/page.tsx:
   - Searchable, filterable, sortable DataTable
   - Columns: #, Name, City, Email (masked for viewer), Verification status,
     Referred by, Email verified, Signed at
   - Filters: verification status (multi-select), email verified, has referral,
     date range, search text
   - Pagination (50 per page default)

2. Create apps/web/app/api/admin/signatures/route.ts (GET):
   - Handles all filters, sorting, pagination via query params
   - Masks email for viewer role
   - Supports ?format=csv for export (admin only)
   - CSV includes: signature_number, first_name, last_name, email, city,
     zip_code, verification_status, signed_at, referral_code, referred_by_code

3. Create apps/web/app/api/admin/signatures/[id]/route.ts (PATCH):
   - Actions: flag, reject, restore
   - Adjusts campaign_metrics.signature_count on reject/restore
   - Requires full admin role

4. Create apps/web/app/(admin)/admin/signatures/[id]/page.tsx:
   - Signature detail view
   - Full address, verification details (Smarty results), referral chain
   - Action buttons: Flag, Reject, Restore

5. Create reusable components:
   - components/admin/data-table.tsx — generic sortable/paginated table
   - components/admin/filter-bar.tsx — composable filter controls
   - components/admin/status-badge.tsx — colored badge for verification status
```

### Prompt 12.4 — Voice Moderation Queue (Source: Artifact 15, Handoff D)

```
You are building the voice moderation queue for the Confluence Ohio admin.

Context:
- voice_submissions table has moderation_status enum and AI moderation fields
- moderation_log table records every moderation action
- Artifact 10 defines the full AI moderation pipeline
- Moderators need a fast workflow: scan → decide → next
- Inngest events trigger email notifications on approve/reject

Tasks:
1. Create apps/web/app/(admin)/admin/voices/page.tsx:
   - Tab-based filtering: Needs Review, Pending, Auto-Approved, Approved,
     Rejected, All
   - Each submission renders as an expandable ModerationCard
   - Card shows: AI status + confidence, title, author, neighborhood,
     position badge, word count, submitted time, AI flags
   - Expandable preview shows full submission text
   - Action buttons: Approve, Reject (with reason dropdown), Edit (admin only),
     Feature/Unfeature

2. Create apps/web/app/api/admin/voices/[id]/moderate/route.ts (POST):
   - Handles actions: approve, reject, edit, feature, unfeature, override_reject
   - Logs to moderation_log
   - Fires Inngest events for email notifications
   - Enforces anonymous-cannot-be-featured constraint
   - Edit requires admin role; approve/reject allow moderator

3. Create apps/web/app/(admin)/admin/voices/[id]/page.tsx:
   - Full submission detail view
   - Complete moderation history from moderation_log
   - Side-by-side: original text vs AI analysis

4. Create the daily moderation digest Inngest cron function:
   - Runs at 9 AM ET daily
   - Counts pending + needs_review submissions
   - Sends digest email to all admin + moderator users
   - Skips if nothing is pending
   File: apps/web/inngest/functions/moderation-digest.ts

5. Create components/admin/moderation-card.tsx:
   - Expandable card with AI confidence indicator
   - Keyboard navigable (Enter to expand, Tab to actions)
   - Focus management: after action, focus moves to next card
```

### Prompt 12.5 — Remaining Admin Pages (Source: Artifact 15, Handoff E)

```
You are building the remaining admin pages for the Confluence Ohio campaign.

Context:
- All database tables and RLS policies are defined
- Admin auth and middleware are implemented
- Dashboard home, signatures, and voices pages are done

Tasks:
1. Donations page (apps/web/app/(admin)/admin/donations/page.tsx):
   - Summary cards: total raised, donor count, avg donation, recurring %, largest
   - Filterable donation table (date, amount, recurring, refcode, search)
   - Refcode performance table below (grouped by refcode: count, total, avg)
   - Email masked for viewer role
   - Create donation_refcode_performance() SQL function

2. Volunteers page (apps/web/app/(admin)/admin/volunteers/page.tsx):
   - Filterable volunteer table
   - Role breakdown card (count per role)
   - Actions (admin): update status, add note, export CSV
   - Viewer: read-only

3. Email page (apps/web/app/(admin)/admin/email/page.tsx):
   - Admin only
   - Subscriber list with source breakdown pie chart
   - Brevo sync status indicator
   - Export CSV

4. Referrals page (apps/web/app/(admin)/admin/referrals/page.tsx):
   - Admin only
   - K-factor, total clicks, total conversions, conversion rate
   - Top referrers leaderboard (top_referrers function)
   - Platform breakdown bar chart
   - Create top_referrers() SQL function

5. Settings page (apps/web/app/(admin)/admin/settings/page.tsx):
   - Admin only
   - campaign_settings table CRUD
   - Fields: signature goal, milestone thresholds, site announcement,
     AI moderation thresholds, maintenance mode toggle
   - Admin team management: list current admins, invite new admin
   - Create campaign_settings table and seed data
   - Create admin invite API route (apps/web/app/api/admin/invite/route.ts)

6. Create apps/web/app/api/admin/settings/route.ts:
   - GET: return all settings
   - PATCH: update individual settings
   - Full admin role required

For all pages, use the reusable DataTable, FilterBar, MetricCard, and
StatusBadge components created in Prompt 12.3.
Track admin analytics events per the event taxonomy in Artifact 13.
```

### Prompt 12.6 — Admin Migration File (Source: Artifact 15, Handoff F)

```
You are creating the consolidated database migration for the Confluence Ohio
admin dashboard.

Create file: packages/db/migrations/007_admin_dashboard.sql

This migration contains ALL new SQL from Artifact 15:

1. ALTER TYPE admin_role — add 'moderator' and 'viewer' values

2. CREATE TABLE campaign_settings — key/value config store with RLS

3. CREATE FUNCTION custom_access_token_hook — JWT role injection for Supabase Auth

4. Updated RLS policies for role-based access:
   - signatures: admin + viewer SELECT
   - voice_submissions: admin + moderator SELECT + UPDATE
   - donations: admin + viewer SELECT
   - volunteers: admin + viewer SELECT, admin UPDATE
   - email_subscribers: admin SELECT
   - moderation_log: admin + moderator SELECT
   - admin_users: admin SELECT
   - campaign_settings: admin SELECT + ALL

5. Dashboard aggregate functions:
   - avg_donation_cents()
   - recurring_donation_pct()
   - top_referral_platform()
   - referral_k_factor()
   - recent_admin_activity(limit_count)
   - top_referrers(limit_count)
   - donation_refcode_performance()
   - adjust_signature_count(adjustment)

6. Seed data for campaign_settings

7. GRANT statements for all functions

IMPORTANT: This migration must be idempotent where possible (use IF NOT EXISTS,
DROP POLICY IF EXISTS before CREATE POLICY). It replaces the simpler RLS policies
from migration 001. Include a comment header explaining the dependency.

Test the migration against the existing schema by running it on a Supabase branch.
```

---

## Phase 13: Deployment

### Prompt 13.1 — GitHub Actions CI/CD (Source: Artifact 16, Handoff 3)

```
Read docs/16-deployment-dns-launch-checklist.md section 5.

Generate `.github/workflows/ci.yml` with:
- Triggers: push to main, pull_request to main
- Concurrency: cancel in-progress runs for same ref
- Jobs (all use Node 20, npm ci, Turborepo remote caching via TURBO_TOKEN/TURBO_TEAM):
  1. lint — runs turbo lint
  2. type-check — runs turbo type-check
  3. test — runs turbo test
  4. migrate-staging — runs on PR only, after lint/type-check/test pass; uses supabase/setup-cli@v1; links to staging project ref; runs supabase db push
  5. migrate-production — runs on push to main only; uses GitHub environment 'production' with required reviewer; links to prod project ref; logs migration timestamp; runs supabase db push; verifies RLS on all tables with SQL query
  6. lighthouse — runs on PR only; builds web app with staging env vars; runs lhci autorun

Also generate `apps/web/lighthouserc.js` with:
- Collect: start Next.js server, test URLs (/, /sign, /the-case, /faq), 3 runs, desktop preset
- Assert: all four categories ≥ 0.9 as errors
- Upload: temporary-public-storage

Reference the specific GitHub secrets and variables from Artifact 16 §5.4. The production migration job MUST use the 'production' environment for manual approval gating.
```

### Prompt 13.2 — Cloudflare DNS Guide (Source: Artifact 16, Handoff 4)

```
Read docs/16-deployment-dns-launch-checklist.md section 3.

Generate `docs/cloudflare-dns-setup.md` — a step-by-step guide for Tim to follow when configuring Cloudflare DNS. The domain is already registered and managed on Cloudflare — no nameserver transfer is needed. Include:

1. Login and site selection (domain already on Cloudflare)
2. DNS records table — exact records to create (A record for apex, CNAME for www, SPF TXT, DKIM CNAMEs for Brevo, DMARC TXT, Google verification TXT)
3. Critical warning about DNS-only mode (gray cloud) vs. proxy mode (orange cloud) — explain the Vercel SSL certificate conflict
4. SSL/TLS settings to configure
5. Turnstile widget creation steps with screenshots descriptions
6. Security settings to enable
7. Verification steps: dig commands to confirm propagation, SSL certificate check, Turnstile test

Also include a section on Brevo email authentication with a note that exact DKIM record values come from the Brevo dashboard after adding the sending domain — the records in this guide are Brevo's standard selectors but the specific values must be copied from Brevo.

Format as a checklist document that Tim can work through sequentially.
```

### Prompt 13.3 — Launch Checklist & Runbook (Source: Artifact 16, Handoff 5)

```
Read docs/16-deployment-dns-launch-checklist.md sections 7–8.

Generate `docs/launch-checklist.md` — the complete pre-launch checklist formatted as a GitHub-flavored Markdown checklist that Tim and the team can track in a GitHub Issue or project board.

Organize into the 15 categories from §7 (Infrastructure, Supabase, DNS, Email, Smarty, ActBlue, Turnstile, Analytics, Inngest, SEO, Content/Legal, Accessibility, Security, Admin, Final). Each item should be a checkbox with enough detail to be actionable without referencing the spec.

Also generate `docs/launch-runbook.md` — the launch day runbook from §8, including:
- T-2 hours pre-launch steps
- T-0 launch sequence
- T+1 to T+24 monitoring checklist
- Rollback procedures table with component, method, and recovery time

Both documents should be self-contained — someone should be able to follow them without reading the full deployment spec.
```

---

## Phase 14: Post-Launch

### Prompt 14.1 — Iteration Plan (Source: Artifact 17, Handoff A)

```
You are building the Confluence Ohio campaign website. Generate `docs/iteration-plan.md` — the complete post-launch iteration plan.

Context: Read artifacts 01 through 16 in the project for full campaign context. The site uses Next.js 15 App Router, TypeScript, Supabase, Vercel, PostHog for analytics, and Inngest for background jobs.

Generate a Markdown document containing:

1. **Week 1–4 checklist** — a checklist-formatted list of every launch-week and Month 1 task:
   - PostHog funnel verification (homepage → /sign → form start → submit → verified)
   - GA4 and Vercel Analytics validation
   - Session replay review protocol (20 replays/day from /sign abandons)
   - A/B test schedule: hero headline (3 variants), CTA text (3 variants), form layout (single vs two-step), social proof position
   - Email deliverability checks (DKIM/SPF/DMARC verification, inbox placement testing)
   - Press outreach tracking (outlets, pitch dates, status)
   - Volunteer onboarding milestones (target: 10 active by Week 4)
   - Community voices moderation queue monitoring
   - Week-by-week cadence (Week 1: instrument, Week 2: baseline, Week 3: optimize, Week 4: retrospective)

2. **Month 2–3 growth plan:**
   - Content calendar with 2–3 posts/week, themed by week
   - Earned media pitch schedule (Dispatch op-ed, WOSU, Columbus Underground, TV stations)
   - Community events plan (first forum in Month 2 Week 3, recurring monthly events)
   - Partnership outreach tracker (Tier 1 and Tier 2 organizations)
   - Email and referral optimization tasks

3. **Phase 2 roadmap (Month 3–6):**
   - Interactive signature map
   - Endorsements page
   - Events calendar with RSVP
   - SMS infrastructure (Brevo SMS, TCPA double opt-in)
   - Petition delivery planning
   - Note: structured debate and multilingual support are deferred beyond Phase 2

4. **Phase 3 roadmap (Month 6–12):**
   - Petition committee formation (5 electors minimum)
   - Charter amendment language drafting
   - Physical signature collection campaign (target: 18,800 gross for ~13,160 valid vs. 12,533 threshold)
   - Coalition building strategy
   - Public opinion polling ($15K–25K budget)
   - Timeline: file petition before November 2027 to use 2025 turnout baseline

Output: `docs/iteration-plan.md`
```

### Prompt 14.2 — Phase 2 Feature Spec (Source: Artifact 17, Handoff B)

```
You are building the Confluence Ohio campaign website. Generate `docs/phase-2-spec.md` — the complete Phase 2 feature specification.

Context: Read artifacts 01–16 plus docs/iteration-plan.md. The existing platform includes: petition signing with Smarty address verification, email automation via Brevo+Inngest, community voices with AI moderation, social sharing with referral tracking, an admin dashboard, and PostHog analytics.

Generate a Markdown document containing full specifications for each Phase 2 feature:

**1. Interactive Signature Map**
- MapLibre GL JS choropleth with Columbus neighborhood GeoJSON boundaries
- Data: aggregate signature counts by zip code, 15-minute cache TTL
- Privacy: neighborhood-level aggregation only, no individual locations
- Routes: embedded component on homepage + full page at /map

**2. Endorsements Page**
- endorsements table schema (name, title, organization, quote, logo_url, tier, sort_order)
- Tiered display: organizations, elected officials, public figures, community
- Admin CRUD interface
- Route: /endorsements

**3. Events Calendar**
- events and event_rsvps table schemas
- Supabase-native (no Mobilize dependency)
- Inngest integration: RSVP confirmation email + 24h reminder + .ics calendar attachment
- Admin interface for event management
- Route: /events

**4. SMS Infrastructure**
- SmsPort interface + Brevo SMS adapter
- TCPA double opt-in flow
- Phone number collection on volunteer form and petition thank-you page

**5. Admin Dashboard Extensions**
- Endorsements management
- Events management with RSVP lists
- Enhanced metrics dashboard with sparklines and geographic heatmap

Output: `docs/phase-2-spec.md`
```

### Prompt 14.3 — Success Metrics & KPI Dashboard (Source: Artifact 17, Handoff C)

```
You are building the Confluence Ohio campaign website. Generate `docs/success-metrics.md` — the KPI tracking framework and dashboard specification.

Context: Read artifacts 13 (analytics), 15 (admin dashboard), and docs/iteration-plan.md.

Generate a Markdown document containing:

**1. KPI Definitions**
For each metric, specify: name, calculation method, data source (PostHog event / Supabase query / Brevo API / Vercel Analytics), target by month (1, 3, 6, 12), and alert threshold.

Categories:
- Signatures: total verified, monthly new, conversion rate (visitor→signature), verification pass rate
- Email: list size, open rate, click rate, unsubscribe rate, spam complaint rate
- Volunteers: active count, events organized, hours contributed
- Donations: total raised, unique donors, average donation
- Social/Referral: referral conversions, share rate, media mentions
- SEO: organic visitors, keyword rankings, backlinks
- Performance: LCP, CLS, INP (from Vercel Speed Insights)

**2. Dashboard Specification**
Define the admin dashboard home page layout with:
- Sparkline charts for all primary KPIs (7-day, 30-day, all-time toggle)
- Signature velocity indicator (daily rate, 7-day moving average, trend direction)
- Funnel visualization (4-step with conversion percentages)
- Geographic heatmap thumbnail
- Media mention counter

**3. Automated Reports**
- Weekly digest email: Inngest cron job (Monday 9 AM ET), Brevo transactional template, content spec
- Daily anomaly alerts: PostHog alert definitions for conversion crash, traffic spike, deliverability drop, velocity stall, error rate
- Milestone blog post triggers: automated draft creation at each 1K signature milestone

**4. PostHog Dashboard Configurations**
Pre-configured dashboard definitions for: Acquisition, Petition Funnel, Content Performance, Referral Analytics, Email Health.

**5. Reporting Templates**
Markdown templates for: monthly retrospective, quarterly board report, milestone blog post.

Output: `docs/success-metrics.md`
```

### Prompt 14.4 — Phase 2 Database Migration (Source: Artifact 17, Handoff D)

```
You are building the Confluence Ohio campaign website. Generate the Supabase migration file for all Phase 2 database schema additions.

Context: Read artifact 05 (data model) for existing schema. Read docs/phase-2-spec.md for Phase 2 feature specifications.

Generate `packages/db/migrations/002_phase2_features.sql` containing:

1. New tables: endorsements, events, event_rsvps
2. All indexes specified in the Phase 2 spec
3. RLS policies for all new tables (public read for active content, public insert for RSVPs, admin full access)
4. Updated admin_role enum to add 'moderator' role

Follow the conventions from the existing migration: UUIDs, timestamptz, text not varchar, RLS on every table.

Output: `packages/db/migrations/002_phase2_features.sql`
```

### Prompt 14.5 — Phase 2 TypeScript Types (Source: Artifact 17, Handoff E)

```
You are building the Confluence Ohio campaign website. Generate updated TypeScript types for all Phase 2 database tables.

Context: Read packages/db/types.ts for existing type patterns. Read docs/phase-2-spec.md and packages/db/migrations/002_phase2_features.sql.

Add to `packages/db/types.ts`:
- Row types for: Endorsement, Event, EventRsvp
- Insert types (omitting generated fields)
- Update types (all fields optional except id)
- Supabase Database type extension for the new tables

Follow existing patterns in the file exactly.

Output: Updated `packages/db/types.ts`
```

### Prompt 14.6 — Weekly Metrics Digest (Source: Artifact 17, Handoff F)

```
You are building the Confluence Ohio campaign website. Generate the Inngest cron function for the automated weekly metrics digest email.

Context: Read artifact 07 (email automation) for Brevo adapter patterns and Inngest function conventions. Read artifact 13 (analytics) for PostHog query patterns. Read docs/success-metrics.md for KPI definitions.

Generate `apps/web/inngest/weekly-metrics-digest.ts`:

1. Inngest cron function triggered every Monday at 9:00 AM ET
2. Queries Supabase for: total signatures (+ weekly delta), email list size (+ weekly delta), new volunteers, donation total, top 5 referrers
3. Queries PostHog API for: weekly unique visitors, conversion rate, top traffic sources, top-performing blog posts
4. Formats data into a metrics summary object
5. Sends via Brevo transactional email to configured admin recipients
6. Includes signature velocity trend (up/down/flat compared to previous week)

Follow the Inngest function patterns established in artifact 07 exactly (event-driven, step functions, error handling).

Output: `apps/web/inngest/weekly-metrics-digest.ts`
```

---

## Prompt Count Summary

| Phase | Prompts | Description |
|-------|---------|-------------|
| 1 | 3 | Repo scaffolding (Artifact 16) |
| 2 | 4 | Database (Artifact 05) |
| 3 | 2 | Core domain logic (Artifact 06) |
| 4 | 3 | Adapters (Artifacts 06, 07, 09) |
| 5 | 8 | API routes (Artifacts 06, 08, 09, 10) |
| 6 | 4 | Inngest workflows (Artifact 07) |
| 7 | 6 | Frontend pages + MDX content (Artifacts 02, 04, 06) |
| 8 | 3 | Social sharing & referrals (Artifact 11) |
| 9 | 4 | SEO & structured data (Artifact 12) |
| 10 | 6 | Analytics (Artifact 13) |
| 11 | 6 | Accessibility & performance (Artifact 14) |
| 12 | 6 | Admin dashboard (Artifact 15) |
| 13 | 3 | Deployment (Artifact 16) |
| 14 | 6 | Post-launch (Artifact 17) |
| **Total** | **64** | |

> **Note:** The original 85 handoff prompts from the artifacts included load-confirmation checkpoints, doc-copying prompts, and some prompts that have been consolidated. This document contains 64 actionable prompts. Phase 0 (documentation setup) was removed — the 17 numbered artifacts in `docs/` serve directly as the reference documents. The MDX content creation prompt was moved to Phase 7 where the frontend pages that consume it are built.
