# Confluence Ohio — Pre-Launch Checklist

Use this checklist to track every item that must be complete before launching confluenceohio.org. Copy into a GitHub Issue or project board for collaborative tracking.

**Owner:** Tim Fulton
**Target launch:** TBD
**Last updated:** 2026-04-14

---

## 1. Infrastructure Setup

- [ ] GitHub repository `confluenceohio/confluenceohio` has monorepo structure (`apps/web`, `packages/*`)
- [ ] Branch protection enabled on `main` — require PR reviews, status checks, no force pushes
- [ ] Vercel project created and linked to GitHub repo
- [ ] Vercel Pro plan activated ($20/month per team member)
- [ ] All environment variables set in Vercel dashboard, separated by environment (Production / Preview / Development) — see `.env.example` for the full list
- [ ] Turborepo remote caching enabled — `TURBO_TOKEN` and `TURBO_TEAM` set as GitHub Actions secrets
- [ ] GitHub Actions secrets and variables configured (Supabase project refs, access tokens, Turbo credentials)
- [ ] GitHub Actions `production` environment created with required reviewers for migration approval gating

## 2. Supabase

- [ ] Production Supabase project created on Pro tier ($25/month)
- [ ] Staging Supabase project created on Pro tier ($25/month)
- [ ] All migrations applied to both staging and production via `supabase db push`
- [ ] RLS verified — run `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true);` — result should be empty
- [ ] Realtime enabled on `campaign_metrics` table only (used for live signature counter)
- [ ] Supabase Auth configured — email provider enabled, redirect URLs set to `https://confluenceohio.org/admin/mfa/verify`
- [ ] Initial admin user created — Tim's email inserted into `admin_users` table with `admin` role
- [ ] MFA enrollment tested — admin can log in, enroll TOTP authenticator, and access dashboard

## 3. DNS & Domain

- [ ] `confluenceohio.org` is active on Cloudflare (domain already registered and managed there)
- [ ] A record created: `confluenceohio.org` → `76.76.21.21` (Vercel), DNS-only mode (gray cloud, not proxied)
- [ ] CNAME record created: `www.confluenceohio.org` → `cname.vercel-dns.com`, DNS-only mode
- [ ] DNS propagation verified — `dig confluenceohio.org` returns `76.76.21.21`
- [ ] Both `confluenceohio.org` and `www.confluenceohio.org` added in Vercel project domain settings
- [ ] SSL certificate issued — Vercel shows certificate active for both domains
- [ ] www → apex redirect working — `https://www.confluenceohio.org` 301-redirects to `https://confluenceohio.org`

## 4. Email (Brevo)

- [ ] Brevo account created on Starter plan ($9/month)
- [ ] Sending domain `confluenceohio.org` added and verified in Brevo dashboard
- [ ] SPF TXT record added to Cloudflare DNS (per Brevo's instructions)
- [ ] DKIM CNAME records added to Cloudflare DNS (3 records per Brevo's instructions — copy exact values from Brevo dashboard)
- [ ] DMARC TXT record added to Cloudflare DNS: `v=DMARC1; p=quarantine; rua=mailto:dmarc@confluenceohio.org`
- [ ] Email deliverability tested — send test emails to Gmail, Outlook, Yahoo; check spam scores via mail-tester.com (target score 8/10 or higher)
- [ ] Brevo contact lists created: All Subscribers, Petition Signers, Verified Signers, Volunteers, Donors
- [ ] Transactional email templates created: email verification, signature confirmation, volunteer welcome, admin notifications
- [ ] CAN-SPAM compliance verified — every marketing email template includes: physical address (PO Box 8012, Columbus, OH 43201), unsubscribe link, sender identification
- [ ] `BREVO_API_KEY` set in Vercel production environment variables
- [ ] Brevo webhook endpoint configured for bounce/unsubscribe handling

## 5. Address Verification (Smarty)

- [ ] Smarty account created with production subscription
- [ ] Embedded (publishable) key generated for client-side Autocomplete Pro
- [ ] Auth-ID and Auth-Token generated for server-side US Street API
- [ ] Ohio filtering verified — Autocomplete Pro returns only Ohio addresses with `include_only_states=OH`
- [ ] Server-side verification tested — submit a real Ohio address and verify `dpv_match_code`, `state_abbreviation`, and `rdi` fields return correctly

## 6. Donations (ActBlue)

- [ ] ActBlue form created at `secure.actblue.com/donate/confluence`
- [ ] Form configured as 501(c)(4) entity
- [ ] Embed token generated (`data-ab-token`) and set as `NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN` in Vercel
- [ ] Webhook URL configured in ActBlue dashboard: `https://confluenceohio.org/api/webhooks/actblue`
- [ ] Webhook credentials (`ACTBLUE_WEBHOOK_USERNAME` and `ACTBLUE_WEBHOOK_PASSWORD`) set in Vercel production environment variables
- [ ] Test donation processed end-to-end — form submission → webhook received → database insert confirmed
- [ ] Refcode tracking verified — donations via `?refcode=test` correctly attribute in the database

## 7. Cloudflare Turnstile

- [ ] Turnstile widget created in Cloudflare dashboard for `confluenceohio.org`
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` set in Vercel environment variables
- [ ] Widget renders on petition form at `/sign` — shows Turnstile challenge when needed
- [ ] Server-side validation verified — API route correctly validates tokens and rejects invalid/replayed tokens

## 8. Analytics

- [ ] PostHog project created (free tier — 1M events/month)
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` set in Vercel environment variables
- [ ] PostHog session replay enabled with PII masking on all form fields
- [ ] GA4 property created and `NEXT_PUBLIC_GA4_MEASUREMENT_ID` set in Vercel
- [ ] Cookie consent banner functioning — GA4 only loads after user consents; PostHog runs cookieless regardless
- [ ] Vercel Analytics enabled in project settings (included with Pro)
- [ ] Vercel Speed Insights enabled in project settings
- [ ] Key events verified firing — open PostHog live events view and trigger: `petition_form_view`, `petition_form_start`, `petition_form_submit`, `verification_success`, `share_click`
- [ ] Conversion funnels defined in PostHog (visit → form view → form start → submit → verify → share)

## 9. Inngest

- [ ] Inngest account created at app.inngest.com
- [ ] App registered with production URL: `https://confluenceohio.org/api/inngest`
- [ ] `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` set in Vercel production environment variables
- [ ] Functions synced — all Inngest functions visible in the dashboard after first production deployment
- [ ] Welcome email flow tested end-to-end — sign petition → Inngest event fires → Brevo sends confirmation email

## 10. SEO & Social

- [ ] Google Search Console — site verified and `confluenceohio.org` added as property
- [ ] Sitemap submitted — `https://confluenceohio.org/sitemap.xml` submitted in Search Console
- [ ] robots.txt accessible — `https://confluenceohio.org/robots.txt` returns correct directives (allow all, link to sitemap)
- [ ] OG tags verified on homepage, `/sign`, `/the-case`, and `/voices` — test via Facebook Sharing Debugger (developers.facebook.com/tools/debug/)
- [ ] Twitter Cards verified on key pages — test via Twitter Card Validator
- [ ] JSON-LD validated on homepage (NGO schema), `/faq` (FAQ schema), and blog posts (Article schema) — test via Google's Rich Results Test
- [ ] Dynamic OG image working — `/sign` OG image reflects current signature count
- [ ] Google Business Profile created for the campaign (if applicable as a 501(c)(4))

## 11. Content & Legal

- [ ] Privacy policy published at `/privacy` — covers data collection, Smarty address verification, analytics cookies, PII handling, data deletion rights
- [ ] Terms of use published at `/terms`
- [ ] Cookie consent banner functional — gates GA4, respects user choice, stores preference
- [ ] Petition disclaimer reviewed — confirm with election counsel whether Ohio law requires specific disclosure language on the petition form
- [ ] "Paid for by" disclaimer reviewed — confirm whether 501(c)(4) status requires `Paid for by Confluence Ohio` on email and web content per Ohio ORC 3517
- [ ] All page copy proofread — every page reviewed for accuracy, typos, broken links
- [ ] Historical claims verified — spot-check 5+ factual claims from `/the-case/*` pages against cited sources
- [ ] Launch blog post ready and staged — `/blog/why-were-asking-columbus-to-consider-a-new-name`

## 12. Accessibility & Performance

- [ ] WCAG 2.1 AA audit passed — run axe-core on all pages, resolve all critical and serious issues
- [ ] Keyboard navigation verified — tab through petition form, voices submission form, admin dashboard; all interactive elements focusable with visible focus styles
- [ ] Screen reader tested — VoiceOver (macOS/iOS) or NVDA (Windows) on petition form and voices section; form errors announced via `aria-live`
- [ ] Skip-to-content link present and functional on all pages
- [ ] Color contrast verified — minimum 4.5:1 for normal text, 3:1 for large text
- [ ] Lighthouse scores 90+ on all four categories (Performance, Accessibility, Best Practices, SEO) for homepage, `/sign`, `/the-case`, `/faq`
- [ ] LCP < 2.5s on mobile (test via WebPageTest or Lighthouse)
- [ ] CLS < 0.1 on all pages
- [ ] Total page weight < 500KB on initial load (check via DevTools Network tab)

## 13. Security & Load Testing

- [ ] Rate limiting verified — submit 3+ petition signatures from same IP within 1 hour; confirm rate limit response
- [ ] Honeypot field verified — submit petition form with honeypot field populated; confirm silent rejection
- [ ] Turnstile bypass attempt — submit petition API route without valid Turnstile token; confirm 403 rejection
- [ ] RLS penetration test — attempt to read `signatures` table from anonymous Supabase client; confirm access denied
- [ ] Admin auth verified — attempt to access `/admin` routes without authentication; confirm redirect to login
- [ ] MFA required — attempt to access admin after password login but before MFA; confirm redirect to MFA challenge
- [ ] Load test — simulate 100 concurrent petition submissions using k6 or artillery; verify no errors and p95 response time < 2s
- [ ] Email verification token security — verify tokens expire after 72 hours, cannot be reused, and use HMAC (not plaintext IDs)
- [ ] CSP headers verified — no Content-Security-Policy violations in browser console on any page

## 14. Admin Dashboard

- [ ] Admin login flow working end-to-end — email/password → MFA enrollment (first login) → MFA challenge → dashboard access
- [ ] Dashboard metrics loading — signature count, today's signatures, conversion rate, pending voices count
- [ ] Signatures list functional — search, filter by verification status, export to CSV
- [ ] Voices moderation queue functional — approve, reject, and feature community stories
- [ ] Donation list loading correctly from ActBlue webhook data
- [ ] Volunteer list functional — view by role and status
- [ ] Settings page working — update milestone thresholds and campaign settings

## 15. Final Pre-Launch

- [ ] Backup and recovery plan documented — Supabase Pro has point-in-time recovery; process for restoring from backup is written down and tested
- [ ] Admin accounts created — Tim + one other team member, both with MFA enrolled
- [ ] Social media accounts created and linked — Twitter/X, Facebook, Instagram (at minimum)
- [ ] Press kit uploaded to `/press` — logo files, brand guidelines, campaign one-pager, high-res photos
- [ ] Error monitoring configured — Vercel's built-in error tracking or Sentry integration active
- [ ] Uptime monitoring configured — BetterUptime, Checkly, or similar watching `confluenceohio.org` and `/api/petition/sign`
- [ ] Launch sequence coordinated — blog post publish, social media announcement, email to pre-launch list, press outreach all scheduled
- [ ] Rollback plan documented — Vercel one-click revert for app; manual SQL rollback scripts written for each Supabase migration; previous Cloudflare DNS values recorded

---

**Total items:** 108

When all boxes are checked, proceed to the [Launch Day Runbook](./launch-runbook.md).
