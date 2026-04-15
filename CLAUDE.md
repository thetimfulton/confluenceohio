# Confluence Ohio

Civic campaign website for renaming Columbus, Ohio to "Confluence, Ohio." Built as a participation engine: petition signing with Ohio residency verification, email list growth, volunteer recruitment, ActBlue donations, and social sharing. A lightweight community voices feature invites perspectives from all sides; structured debate is deferred to a future phase.

This is a real civic movement, not a stunt. Every historical claim in code, copy, or comments must be verifiable. Treat the project with the seriousness of a real campaign.

## How this project is planned

Planning artifacts live in `docs/` as numbered markdown files (`01-messaging-framework.md`, `02-site-architecture.md`, etc.). They were produced by a Claude Cowork project and are dependency-ordered: later artifacts assume earlier ones are implemented.

**Before implementing any feature, read the relevant numbered artifact in full.** Do not implement from memory or from this CLAUDE.md alone — the artifacts contain the actual specifications. Each artifact has a "Claude Code Handoff" section with concrete prompts; those handoffs are the source of truth for what to build.

When an artifact is ambiguous or contradicts something already built, **stop and ask** rather than guessing. Design decisions belong to the spec, not the implementer.

### Execution order

The artifacts have a dependency chain. Follow this sequence:

1. **Repo scaffolding** — Monorepo, Turborepo config, package structure, `.env.example` (Artifact 16)
2. **Database** — Schema, migrations, types, seed data (Artifact 05)
3. **Core domain logic** — Petition validation, referral codes, deduplication (Artifact 06)
4. **Adapters** — Smarty verification (06), Brevo email (07), ActBlue webhooks (09)
5. **API routes** — Petition signing (06), volunteer signup (08), community voices (10), donation webhooks (09)
6. **Inngest workflows** — Email automation, background jobs (07)
7. **Frontend pages** — In site-map order: homepage, /the-case/*, /sign, /voices, /volunteer, /donate, /about, /press, /blog, /faq (Artifacts 02, 04)
8. **Social sharing & referrals** — Share buttons, OG images, referral tracking (Artifact 11)
9. **SEO & structured data** — Meta tags, JSON-LD, sitemap (Artifact 12)
10. **Analytics** — PostHog events, funnels, A/B test infrastructure (Artifact 13)
11. **Accessibility & performance** — WCAG audit, Lighthouse CI, a11y components (Artifact 14)
12. **Admin dashboard** — Auth, metrics, moderation queue, settings (Artifact 15)
13. **Deployment** — Vercel config, Cloudflare DNS, CI/CD pipeline (Artifact 16)
14. **Post-launch docs** — Iteration plan, success metrics (Artifact 17)

Do not build a feature before its dependencies exist. If an artifact references types, tables, or adapters from an earlier artifact, confirm those are implemented first.

## Tech stack

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Monorepo:** Turborepo with hexagonal architecture
- **Database:** Supabase (Postgres, Auth, RLS, Realtime, Edge Functions)
- **Hosting:** Vercel
- **Email:** Brevo (transactional + marketing). Adapter in `packages/email`.
- **Address verification:** Smarty (US Street API + Autocomplete Pro). Adapter in `packages/verification`. **Never use the USPS API** — its ToS prohibits non-shipping use.
- **Donations:** ActBlue (link with refcodes + webhook handler). Already configured externally.
- **Background jobs:** Inngest for webhooks, email automation triggers, batch processing
- **Bot prevention:** Cloudflare Turnstile (never reCAPTCHA)
- **Analytics:** PostHog (events, funnels, A/B tests) + Vercel Analytics (web vitals) + GA4 (consent-gated, Google ecosystem)

## Repo structure

```
apps/
  web/                  # Next.js app — public site AND admin dashboard
    app/
      (public)/         # Public pages (homepage, petition, voices, etc.)
      (admin)/admin/    # Admin dashboard (route group — separate layout, shared deployment)
      api/              # API routes (petition, voices, webhooks, admin)
    inngest/            # Inngest function definitions
packages/
  core/       # Domain logic, types, validation. No infrastructure imports.
  db/         # Supabase client, migrations, RLS policies, generated types
  email/      # Brevo adapter, email templates
  verification/ # Smarty adapter, Ohio residency logic
  ui/         # Shared React components
docs/         # Cowork planning artifacts (READ THESE BEFORE BUILDING)
content/
  blog/       # MDX blog posts (Git-managed, no CMS)
```

The admin dashboard is a **route group** inside `apps/web`, not a separate app. It shares the Supabase client, middleware, and Vercel deployment with the public site. See Artifact 15 for the full routing structure and rationale.

## Architectural principles

- **Hexagonal architecture.** Domain logic in `packages/core` is isolated from infrastructure. Ports and adapters pattern. Switching email providers or verification services should require touching one adapter, not business logic. `packages/core` must never import from `packages/email`, `packages/db`, or `packages/verification` directly — it depends on interfaces.
- **Server-first.** Address verification, signature recording, deduplication, and webhook processing happen in API routes or Edge Functions. Smarty secret keys, Brevo API keys, and ActBlue webhook secrets never reach the client. Only Smarty's embedded (publishable) key is used in the browser, and only for autocomplete.
- **Progressive enhancement.** Core petition signing must work without JavaScript. Live counters, autocomplete, and share buttons enhance progressively.
- **Privacy by design.** Collect only what's necessary. Encrypt PII at rest. Hash addresses for deduplication rather than storing duplicates of raw PII. Honor signature deletion requests. Cookie consent and a real privacy policy ship at launch.
- **Mobile-first.** 50–68% of civic campaign traffic is mobile. Design and test mobile flows first.
- **RLS on every table.** No table is publicly readable or writable without an explicit Supabase Row-Level Security policy. Default deny.

## Brand voice (for any user-facing copy you write or modify)

Serious-but-playful civic movement. First person plural ("we"). Confident without being righteous. Historically grounded — every claim sourced. Warm and locally rooted: reference specific Columbus places, neighborhoods, institutions. Steelman opposition arguments wherever they appear. Never mock or dismiss people who love the name "Columbus." Never reduce the case to "Columbus was bad." Never academic, never preachy, never snarky.

Think: a neighbor who has done their homework, inviting you to consider something. Not a lecture. Not a joke.

If you're writing copy and you're not sure it lands, leave a `{{ COPY: ... }}` placeholder and flag it rather than shipping something off-tone.

## Working preferences

- **Action-oriented.** Make reasonable assumptions and flag them. Don't ask permission for every micro-decision.
- **Flag ambiguity early.** If a spec is unclear or a dependency is missing, say so at the top of your response, not after you've written 200 lines of code.
- **No fluff.** Skip preamble, "great question," and self-narration. Show the work.
- **Plan before coding for complex features.** For any feature touching the petition flow, the admin dashboard, the voices moderation queue, or any external integration, produce an implementation plan first. Files to create, files to modify, order of operations, test strategy, decisions needed. Wait for approval before executing.
- **One feature per session.** Don't try to build half the site in one go. Scope tightly, ship, commit, start fresh.
- **Stop and show.** For monorepo bootstrapping, schema migrations, and any destructive operation, show the proposed change before executing it.

## Quality standards (non-negotiable)

- **Accessibility:** WCAG 2.1 AA. All forms keyboard-navigable. All interactive elements focusable with visible focus styles. Screen reader tested (announce errors via `aria-live`). Color contrast ≥4.5:1 normal text, ≥3:1 large text. Alt text on every image. Skip-to-content link. Reduced-motion support.
- **Performance:** Lighthouse ≥90 across all categories. LCP <2.5s, CLS <0.1, INP <200ms. JS bundle <200KB compressed on initial load. Use `next/image` and `next/font` everywhere.
- **SEO:** Every page has unique meta title, description, canonical URL, and Open Graph tags. JSON-LD structured data per artifact 12. Semantic HTML (proper heading hierarchy, landmark roles).
- **Security:** Rate limiting on all public form submissions. Cloudflare Turnstile on petition and voices forms. Honeypot fields as a second layer. Input validation with Zod on every API route. No PII in client-side logs or analytics events.
- **Testing:** Every API route gets at least one happy-path test and one error-path test. Every adapter (Smarty, Brevo, ActBlue webhook) gets unit tests with mocked external services. The petition signing flow gets integration tests covering: valid Ohio address, non-Ohio address, invalid address, duplicate email, duplicate address, rate limit exceeded, Turnstile failure.
- **Type safety:** Strict TypeScript. No `any` without a comment explaining why. Database types generated from Supabase schema, not hand-written.

## Commands

Once the monorepo is bootstrapped, these should work:

```bash
npm run dev              # Run all apps in dev mode
npm run dev --filter=web # Run just the public site
npm run build            # Build all apps (via Turborepo)
npm run lint             # Lint everything
npm run typecheck        # Type-check everything
npm run test             # Run all tests
npm run test --filter=verification # Test a single package
npm run db:migrate       # Apply Supabase migrations locally
npm run db:types         # Regenerate TypeScript types from Supabase schema
npm run db:seed          # Seed local database with dev data
```

The monorepo uses **npm workspaces** (not pnpm or yarn). Vercel's deployment config in `vercel.json` and `turbo.json` are set up for npm. If migrating to pnpm later, update `vercel.json` `installCommand`, all CI workflows, and this file.

If a command doesn't exist yet, add it to the appropriate `package.json` rather than running raw tools. Update this section when commands change.

## Environment variables

All env vars are documented in `.env.example` at the repo root. Never commit `.env.local` or any file with real secrets. When adding a new integration, add the variable to `.env.example` with a placeholder value and a comment explaining what it is and where to get it.

### Client-side (NEXT_PUBLIC_*)

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous/public key
- `NEXT_PUBLIC_SMARTY_EMBEDDED_KEY` — Smarty publishable key (autocomplete only)
- `NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN` — ActBlue embed form token
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project API key
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog ingest URL
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` — Google Analytics 4 measurement ID (consent-gated)
- `NEXT_PUBLIC_SITE_URL` — Canonical site URL (`https://confluenceohio.org`)

### Server-side (secret — never expose to client)

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (bypasses RLS)
- `SMARTY_AUTH_ID` — Smarty auth ID for US Street API
- `SMARTY_AUTH_TOKEN` — Smarty auth token for US Street API
- `BREVO_API_KEY` — Brevo API key for transactional + marketing email
- `ACTBLUE_WEBHOOK_USERNAME` — Random string for Basic Auth on webhook endpoint
- `ACTBLUE_WEBHOOK_PASSWORD` — Random string for Basic Auth on webhook endpoint
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile server-side secret
- `INNGEST_EVENT_KEY` — Inngest event sending key
- `INNGEST_SIGNING_KEY` — Inngest webhook signature verification
- `EMAIL_VERIFICATION_SECRET` — HMAC secret for email verification tokens

> **Note:** Artifact 09 specifies ActBlue webhook auth as HTTP Basic Auth (username + password). Artifact 16's `turbo.json` references `ACTBLUE_WEBHOOK_SECRET` instead. Follow Artifact 09 (the detailed implementation spec) — use `ACTBLUE_WEBHOOK_USERNAME` and `ACTBLUE_WEBHOOK_PASSWORD`. Update `turbo.json` to match when scaffolding the repo.

## What not to do

- Do not use the USPS Address Verification API. Its Terms of Service prohibit use outside of shipping/mailing services. Smarty is the chosen vendor.
- Do not use reCAPTCHA. Cloudflare Turnstile is the chosen bot prevention.
- Do not store raw addresses for deduplication. Hash the canonical (Smarty-normalized) address and store the hash. Keep the original address for the signature record only.
- Do not auto-publish community voice submissions. Every submission goes through the moderation queue. No exceptions.
- Do not implement structured debate features (threaded arguments, argument-strength voting, consensus mapping). Those are deferred beyond Phase 2. Launch and Phase 2 ship with community voices (curated story submissions) only.
- Do not implement multilingual/i18n support. Foreign language translations are cut from Phase 2 scope. Build the site in English only.
- Do not collect voter registration data, party affiliation, or any sensitive demographic data. Ohio residency confirmation via Smarty address verification is the only verification we do.
- Do not write copy that mocks Columbus, the name "Columbus," Italian American heritage, or people who oppose the rename. Read the brand voice section above twice if tempted.
- Do not skip tests because the feature "feels simple." The petition flow is the campaign's credibility — bugs there are existential.
- Do not implement a feature that isn't specified in a `docs/` artifact. If something is missing from the spec, ask before building.

## When you're stuck

1. Re-read the relevant artifact in `docs/` in full.
2. Check whether a dependency artifact has the answer.
3. Check whether the answer is in the messaging framework (`docs/01-messaging-framework.md`) or site architecture (`docs/02-site-architecture.md`).
4. If still stuck, stop and ask. Don't guess at design decisions.
