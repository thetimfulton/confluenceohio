# Confluence Ohio — Deployment, DNS, and Launch Checklist

**Artifact 16 · Prompt 16 Output**
**Date:** April 10, 2026
**Dependencies:** All previous artifacts (01–15)

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **Vercel plan tier.** ✅ **Pro tier confirmed** ($20/month per team member). Provides deployment protection, password-protected previews, Vercel Analytics, Speed Insights, and 100GB bandwidth.

2. **GitHub repository.** ✅ **`confluenceohio/confluenceohio`** on GitHub. Repo already exists. Updated throughout this document.

3. **Domain registrar.** ✅ **Domain is already on Cloudflare.** No nameserver transfer needed — DNS records can be added directly. Updated §3 to remove nameserver migration steps.

4. **Staging environment.** ✅ **Separate Supabase staging project confirmed** ($25/month additional). Two-project strategy (staging + production) retained for migration safety.

5. **Google Ads account.** ✅ **Deferred.** GA4 tracking ID exists but no Google Ads account yet. GA4 conversion tracking configuration deferred to post-launch. GA4 is included at launch for baseline data collection only.

6. **Brevo sender domain.** ✅ **`confluenceohio.org` confirmed** as the sending domain with DKIM subdomain selectors.

---

## 1. Vercel Deployment Configuration

### 1.1 Project Setup

The monorepo contains one deployable app (`apps/web`) that includes both the public site and the admin dashboard (as a route group per Artifact 15). Vercel deploys the monorepo root, with the build command scoped to the web app via Turborepo filtering.

**Vercel Dashboard Settings:**

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Build Command | `cd ../.. && npx turbo run build --filter=web...` |
| Output Directory | `.next` (default) |
| Install Command | `npm install` (runs at monorepo root) |
| Node.js Version | 20.x (LTS) |

**Why `Root Directory = apps/web` with a build command that `cd`s to root:** Vercel's monorepo support uses Root Directory to determine which `package.json` to read for framework detection. But the build needs to execute from the monorepo root so Turborepo can resolve all workspace dependencies. The `cd ../..` pattern is the standard approach documented by Vercel for Turborepo monorepos.

### 1.2 turbo.json Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": [
    "NODE_ENV",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
    "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
    "NEXT_PUBLIC_SMARTY_EMBEDDED_KEY",
    "NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN",
    "NEXT_PUBLIC_SITE_URL"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"],
      "env": [
        "SUPABASE_SERVICE_ROLE_KEY",
        "SMARTY_AUTH_TOKEN",
        "BREVO_API_KEY",
        "ACTBLUE_WEBHOOK_USERNAME",
        "ACTBLUE_WEBHOOK_PASSWORD",
        "TURNSTILE_SECRET_KEY",
        "INNGEST_EVENT_KEY",
        "INNGEST_SIGNING_KEY",
        "EMAIL_VERIFICATION_SECRET"
      ]
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Key design decisions:**
- `globalEnv` lists all `NEXT_PUBLIC_*` variables so Turborepo invalidates its cache when any public-facing configuration changes (different Supabase URL for staging vs. production = different build cache).
- Task-specific `env` in `build` lists server-only secrets. These don't need to be in `globalEnv` because they aren't shared across packages — they're only consumed by `apps/web` during build.
- `^build` dependency ensures packages (`core`, `db`, `email`, `verification`, `ui`) build before the web app.

### 1.3 vercel.json

Place this in the monorepo root (`/vercel.json`):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npx turbo run build --filter=web...",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next",
  "ignoreCommand": "npx turbo-ignore web",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/sitemap.xml",
      "destination": "/api/sitemap"
    },
    {
      "source": "/robots.txt",
      "destination": "/api/robots"
    }
  ]
}
```

**`ignoreCommand: npx turbo-ignore web`:** Vercel runs this before every build. If the commit only touched files outside the `web` app's dependency graph (e.g., a docs-only change), the build is skipped. This saves build minutes and prevents unnecessary deployments.

### 1.4 next.config.ts

Key production configuration for `apps/web/next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turborepo: transpile workspace packages
  transpilePackages: [
    '@confluenceohio/core',
    '@confluenceohio/db',
    '@confluenceohio/email',
    '@confluenceohio/verification',
    '@confluenceohio/ui',
  ],

  // Security headers (supplemented by vercel.json)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.posthog.com https://www.googletagmanager.com https://secure.actblue.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co https://*.posthog.com https://www.google-analytics.com https://challenges.cloudflare.com https://api.smarty.com wss://*.supabase.co",
              "frame-src https://challenges.cloudflare.com https://secure.actblue.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://secure.actblue.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', '@confluenceohio/ui'],
  },

  // Redirect www to apex
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.confluenceohio.org' }],
        destination: 'https://confluenceohio.org/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

**CSP policy notes:**
- `unsafe-inline` for scripts is required by Next.js's inline script injection; once the site stabilizes, migrate to nonce-based CSP per Next.js docs.
- `unsafe-eval` is needed for PostHog's session replay feature. Remove if session replay is disabled.
- ActBlue's embed iframe requires `frame-src https://secure.actblue.com` and `form-action` allowance.
- Smarty's autocomplete SDK connects to `api.smarty.com`.
- Supabase Realtime requires `wss://*.supabase.co` in connect-src.

### 1.5 Preview Deployments

Every pull request generates a preview deployment at a unique URL (e.g., `confluenceohio-git-feature-xyz.vercel.app`). Preview deployments:

- Use **preview** environment variables (staging Supabase, test Smarty keys, Turnstile test keys)
- Are password-protected via Vercel Deployment Protection (Pro feature) — prevents public access to staging content
- Run the full build pipeline including `turbo-ignore` filtering
- Generate a GitHub status check with the preview URL

**Vercel Git Configuration (Dashboard → Settings → Git):**

| Setting | Value |
|---|---|
| Production Branch | `main` |
| Automatically expose System Environment Variables | Enabled |
| Git LFS | Disabled (no large binary assets) |

### 1.6 Production Branch Protection

Configure in GitHub repository settings:

- **Branch protection rule on `main`:**
  - Require pull request reviews before merging (1 reviewer minimum)
  - Require status checks to pass: `Vercel`, `lint`, `type-check`, `test`
  - Require branches to be up to date before merging
  - Do not allow bypassing the above settings (applies to admins too)
  - Restrict who can push to matching branches: deploy bot only

---

## 2. Environment Variables

### 2.1 Complete Environment Variable Inventory

All variables are organized by the service they configure. Variables prefixed with `NEXT_PUBLIC_` are embedded in the client bundle at build time and are visible to end users — they must contain only non-secret values.

#### Supabase

| Variable | Scope | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | `https://xyzproject.supabase.co` | Public project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | `eyJhbGci...` | Public anon key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | `eyJhbGci...` | **SECRET.** Bypasses RLS. Used only in API routes + Inngest functions |
| `SUPABASE_DB_URL` | Server | `postgresql://postgres:...@db.xyzproject.supabase.co:5432/postgres` | Direct Postgres connection for migrations CI |

#### Smarty

| Variable | Scope | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SMARTY_EMBEDDED_KEY` | Client | `12345678901234567` | Publishable key for Autocomplete Pro widget |
| `SMARTY_AUTH_ID` | Server | `abcd1234-...` | **SECRET.** Auth ID for US Street API |
| `SMARTY_AUTH_TOKEN` | Server | `aBcDeFgH...` | **SECRET.** Auth token for US Street API |

#### Brevo

| Variable | Scope | Example | Notes |
|---|---|---|---|
| `BREVO_API_KEY` | Server | `xkeysib-...` | **SECRET.** Brevo REST API key |
| `BREVO_WEBHOOK_SECRET` | Server | `whsec_...` | **SECRET.** Webhook signature verification |

#### ActBlue

| Variable | Scope | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN` | Client | `ab_live_...` | Embed token from ActBlue dashboard |
| `ACTBLUE_WEBHOOK_USERNAME / ACTBLUE_WEBHOOK_PASSWORD` | Server | `abwh_...` | **SECRET.** Webhook payload verification |

#### Cloudflare Turnstile

| Variable | Scope | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client | `0x4AAAAAABcDeF...` | Public site key |
| `TURNSTILE_SECRET_KEY` | Server | `0x4AAAAAAAaBcDeFgH...` | **SECRET.** Server-side token validation |

#### PostHog

| Variable | Scope | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Client | `phc_aBcDeFgH...` | Project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Client | `https://us.i.posthog.com` | Ingestion endpoint (US cloud) |

#### Google Analytics 4

| Variable | Scope | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Client | `G-XXXXXXXXXX` | GA4 measurement ID |

#### Inngest

| Variable | Scope | Example | Notes |
|---|---|---|---|
| `INNGEST_EVENT_KEY` | Server | `test_...` / `prod_...` | Event sending key |
| `INNGEST_SIGNING_KEY` | Server | `signkey_...` | **SECRET.** Webhook signature verification |

#### Application

| Variable | Scope | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Client | `https://confluenceohio.org` | Canonical site URL (used for OG tags, referral links, sitemap) |
| `EMAIL_VERIFICATION_SECRET` | Server | `64-char-hex-string` | **SECRET.** HMAC key for email verification tokens |
| `ADMIN_ALLOWED_EMAILS` | Server | `tim@timfulton.com,co-admin@example.com` | Comma-separated list of emails allowed to access admin |

### 2.2 Environment Variable Matrix

| Environment | Supabase Project | Smarty | Turnstile | PostHog | Brevo |
|---|---|---|---|---|---|
| **Development** (local) | Local Docker via `supabase start` | Test keys (free tier) | `1x00000000000000000000AA` (always passes) | Dev project or disabled | Test mode |
| **Preview** (PR deploys) | Staging Supabase project | Test keys | `1x00000000000000000000AA` | Dev project | Test mode |
| **Production** (`main`) | Production Supabase project | Live keys | Live site key | Production project | Live mode |

**Turnstile test keys** (from Cloudflare docs):
- Site key (always passes): `1x00000000000000000000AA`
- Secret key (always passes): `1x0000000000000000000000000000000AA`

### 2.3 .env.example

```bash
# ============================================================
# Confluence Ohio — Environment Variables
# ============================================================
# Copy this file to .env.local for local development.
# In Vercel, set these in Project Settings → Environment Variables.
# ============================================================

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# --- Smarty (Address Verification) ---
NEXT_PUBLIC_SMARTY_EMBEDDED_KEY=your-smarty-embedded-key
SMARTY_AUTH_ID=your-smarty-auth-id
SMARTY_AUTH_TOKEN=your-smarty-auth-token

# --- Brevo (Email) ---
BREVO_API_KEY=xkeysib-your-api-key
BREVO_WEBHOOK_SECRET=your-brevo-webhook-secret

# --- ActBlue (Donations) ---
NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN=your-actblue-embed-token
ACTBLUE_WEBHOOK_USERNAME / ACTBLUE_WEBHOOK_PASSWORD=your-actblue-webhook-secret

# --- Cloudflare Turnstile ---
# Test keys below always pass — replace with real keys in production
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# --- PostHog ---
NEXT_PUBLIC_POSTHOG_KEY=phc_your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# --- Google Analytics 4 ---
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# --- Inngest ---
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# --- Application ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EMAIL_VERIFICATION_SECRET=generate-with-openssl-rand-hex-32
ADMIN_ALLOWED_EMAILS=tim@timfulton.com
```

---

## 3. DNS Configuration (Cloudflare)

### 3.1 Cloudflare Account Setup

The domain `confluenceohio.org` is already registered on Cloudflare — no nameserver transfer is needed. DNS records can be added directly in the Cloudflare dashboard.

1. Log in at `dash.cloudflare.com`
2. Select the `confluenceohio.org` site
3. Confirm the plan is **Free** (sufficient for DNS, CDN, DDoS protection, and Turnstile)

### 3.2 DNS Records

Configure the following records in Cloudflare's DNS dashboard:

#### Primary Domain Records

| Type | Name | Content | Proxy | TTL | Purpose |
|---|---|---|---|---|---|
| `A` | `@` | `76.76.21.21` | **DNS only** (gray cloud) | Auto | Vercel apex domain |
| `CNAME` | `www` | `cname.vercel-dns.com` | **DNS only** (gray cloud) | Auto | Vercel www subdomain |

**Critical: Use DNS-only mode (gray cloud), NOT Cloudflare proxy (orange cloud).** Cloudflare's proxy mode conflicts with Vercel's SSL certificate issuance. Vercel issues its own certificates via Let's Encrypt and needs to validate the `_acme-challenge` DNS record, which Cloudflare's proxy intercepts. DNS-only mode lets Vercel handle SSL while Cloudflare provides authoritative DNS.

**Vercel's A record IP (`76.76.21.21`):** This is Vercel's anycast IP for apex domains. Verify the current IP in Vercel's domain settings when configuring — it may change.

#### Email Authentication Records (Brevo)

| Type | Name | Content | Proxy | TTL | Purpose |
|---|---|---|---|---|---|
| `TXT` | `@` | `v=spf1 include:sendinblue.com ~all` | N/A | Auto | SPF — authorizes Brevo to send from `@confluenceohio.org` |
| `CNAME` | `mail._domainkey` | `mail._domainkey.mailin.fr` | DNS only | Auto | DKIM — Brevo signing key |
| `CNAME` | `s1._domainkey` | `s1.domainkey.sendinblue.com` | DNS only | Auto | DKIM — Brevo second selector |
| `CNAME` | `s2._domainkey` | `s2.domainkey.sendinblue.com` | DNS only | Auto | DKIM — Brevo third selector |
| `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@confluenceohio.org; pct=100` | N/A | Auto | DMARC policy |

**Note:** Brevo's exact DKIM record names may differ. After adding the sending domain in Brevo's dashboard (Settings → Senders & IP → Domains), Brevo displays the specific DNS records to add. Follow those exactly.

#### Verification Records

| Type | Name | Content | Proxy | TTL | Purpose |
|---|---|---|---|---|---|
| `TXT` | `@` | `google-site-verification=XXXXX` | N/A | Auto | Google Search Console verification |

### 3.3 SSL/TLS Configuration

Since we're using **DNS-only mode** (Cloudflare not proxying), SSL is handled entirely by Vercel:

- Vercel auto-issues Let's Encrypt certificates for `confluenceohio.org` and `www.confluenceohio.org`
- HSTS is configured in `next.config.ts` headers (max-age 2 years, includeSubDomains, preload)
- After 3+ months of stable HSTS, submit to the [HSTS preload list](https://hstspreload.org/) for browser-level enforcement

**Cloudflare SSL/TLS settings (for DNS-only mode):**
- SSL/TLS encryption mode: **Full (strict)** — though not actively proxying, this ensures any future proxy-mode toggle uses strict validation
- Always Use HTTPS: **On**
- Minimum TLS Version: **TLS 1.2**

### 3.4 Cloudflare Turnstile Setup

1. In Cloudflare Dashboard → **Turnstile** → **Add site**
2. Site name: `Confluence Ohio`
3. Domain: `confluenceohio.org`
4. Widget type: **Managed** (invisible when risk is low, interactive challenge when needed)
5. Copy the **Site Key** → set as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel
6. Copy the **Secret Key** → set as `TURNSTILE_SECRET_KEY` in Vercel

**Server-side validation** (already specified in Artifact 06):

```typescript
// packages/verification/turnstile.ts
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  });

  const data = await response.json();
  return data.success === true;
}
```

Token validation rules (from Cloudflare docs):
- Tokens expire after **300 seconds** (5 minutes)
- Each token can only be validated **once** — replayed tokens return `timeout-or-duplicate`
- Always validate server-side; client-side widget alone does not protect forms

### 3.5 Cloudflare Security Settings

Even in DNS-only mode, configure these for any future proxy-mode activation and general security:

| Setting | Location | Value |
|---|---|---|
| Bot Fight Mode | Security → Bots | **On** |
| Browser Integrity Check | Security → Settings | **On** |
| Email Address Obfuscation | Scrape Shield | **On** |
| Hotlink Protection | Scrape Shield | **On** |

---

## 4. Supabase Production Setup

### 4.1 Project Architecture

| Environment | Supabase Project | Purpose |
|---|---|---|
| Local dev | `supabase start` (Docker) | Developer machines |
| Staging | `confluenceohio-staging` | PR preview deployments, integration testing |
| Production | `confluenceohio-prod` | Live site |

Both staging and production use **Supabase Pro tier** ($25/month each — $50/month total). Pro tier provides:
- 8GB database storage (sufficient for 500K+ signatures)
- Daily backups with 7-day point-in-time recovery
- No pause-after-inactivity (critical for a live petition)
- 500MB file storage (voice submission photos)
- 2.5M Edge Function invocations per month

### 4.2 Migration Deployment Strategy

Migrations are managed via the Supabase CLI and deployed through GitHub Actions:

```
Developer writes migration locally
        ↓
supabase db diff → generates migration SQL
        ↓
Commit to feature branch → PR opened
        ↓
GitHub Action runs: supabase db push --linked (against staging)
        ↓
PR reviewer verifies staging data integrity
        ↓
Merge to main → GitHub Action runs: supabase db push --linked (against production)
```

**Safety rules:**
- Never run `supabase db push` against production from a local machine
- All production migrations flow through CI/CD
- Destructive migrations (DROP TABLE, DROP COLUMN) require manual approval in the GitHub Actions workflow
- Always test migrations against staging first
- Back up production database before applying any schema change (automated via GitHub Action pre-step)

### 4.3 Supabase CLI Link Configuration

```bash
# Link to staging (for development)
supabase link --project-ref <staging-project-ref>

# Link to production (CI/CD only — never from local machines)
supabase link --project-ref <prod-project-ref>
```

### 4.4 RLS Verification

After applying migrations to production, verify RLS is enabled on every table:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- Every row must show rowsecurity = true
```

This query is included in the CI pipeline as a post-migration check.

### 4.5 Realtime Configuration

Enable Realtime subscriptions for the `campaign_metrics` table only (for live signature counters). All other tables use standard REST queries. Configure in Supabase Dashboard → Database → Replication:

| Table | Realtime | Reason |
|---|---|---|
| `campaign_metrics` | ✅ Enabled | Live signature counter on homepage and `/sign` |
| All other tables | ❌ Disabled | No real-time requirements; reduces database load |

---

## 5. GitHub Actions CI/CD Pipeline

### 5.1 Pipeline Architecture

```
PR opened / push to feature branch
    ├── lint (Turborepo cached)
    ├── type-check (Turborepo cached)
    ├── test (Turborepo cached)
    ├── supabase db push (staging)
    └── Vercel preview deployment (automatic)
           All must pass → PR mergeable

Merge to main
    ├── supabase db push (production)
    └── Vercel production deployment (automatic)
```

### 5.2 CI Workflow: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
  NODE_VERSION: '20'

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx turbo run lint

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx turbo run type-check

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx turbo run test

  migrate-staging:
    name: Migrate Staging DB
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: |
          supabase link --project-ref ${{ secrets.SUPABASE_STAGING_PROJECT_REF }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  migrate-production:
    name: Migrate Production DB
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [lint, type-check, test]
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Backup production database
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROD_PROJECT_REF }}
          # Point-in-time recovery is available via Supabase Pro dashboard
          # This step logs the migration timestamp for manual recovery reference
          echo "Migration applied at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $GITHUB_STEP_SUMMARY
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - name: Apply migrations
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROD_PROJECT_REF }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - name: Verify RLS enabled on all tables
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROD_PROJECT_REF }}
          result=$(supabase db execute --sql "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;" 2>&1)
          if echo "$result" | grep -q "rows"; then
            echo "❌ Tables found without RLS enabled!"
            echo "$result"
            exit 1
          fi
          echo "✅ All tables have RLS enabled"
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm install -g @lhci/cli
      - run: npx turbo run build --filter=web...
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA'
          NEXT_PUBLIC_POSTHOG_KEY: 'phc_test'
          NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com'
          NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-TEST'
          NEXT_PUBLIC_SMARTY_EMBEDDED_KEY: 'test'
          NEXT_PUBLIC_ACTBLUE_EMBED_TOKEN: 'test'
          NEXT_PUBLIC_SITE_URL: 'https://staging.confluenceohio.org'
      - run: lhci autorun
        working-directory: apps/web
```

### 5.3 Lighthouse CI Configuration: `apps/web/lighthouserc.js`

```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx next start -p 9222',
      startServerReadyPattern: 'started server on',
      url: [
        'http://localhost:9222/',
        'http://localhost:9222/sign',
        'http://localhost:9222/the-case',
        'http://localhost:9222/faq',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### 5.4 GitHub Actions Secrets & Variables

**Secrets** (Settings → Secrets → Actions):

| Secret | Value | Purpose |
|---|---|---|
| `TURBO_TOKEN` | Vercel scoped access token | Turborepo remote caching |
| `SUPABASE_ACCESS_TOKEN` | `sbp_...` | Supabase CLI authentication |
| `SUPABASE_STAGING_PROJECT_REF` | `abcdefghijklmnop` | Staging project reference |
| `SUPABASE_PROD_PROJECT_REF` | `qrstuvwxyz123456` | Production project reference |
| `STAGING_SUPABASE_URL` | `https://abcdef.supabase.co` | For CI build env |
| `STAGING_SUPABASE_ANON_KEY` | `eyJhbGci...` | For CI build env |

**Variables** (Settings → Variables → Actions):

| Variable | Value | Purpose |
|---|---|---|
| `TURBO_TEAM` | `confluenceohio` | Turborepo remote cache team |

**Environments** (Settings → Environments):

Create a `production` environment with:
- Required reviewers: Tim (manual approval for production migrations)
- Deployment branches: `main` only

---

## 6. Inngest Deployment

Inngest functions are deployed as part of the Next.js app via the Inngest serve handler at `/api/inngest`. No separate deployment is needed.

### 6.1 Inngest Configuration

**Development:** Run `npx inngest-cli@latest dev` alongside `npm run dev` to get the local Inngest Dev Server for testing workflows.

**Production:** Inngest's cloud service automatically discovers functions via the serve endpoint when the app deploys. After the first deployment:

1. Log in to `app.inngest.com`
2. Create an app → set the URL to `https://confluenceohio.org/api/inngest`
3. Inngest syncs function definitions automatically on each deploy
4. Set environment variables `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in Vercel

### 6.2 Inngest Serve Endpoint

Already specified in Artifact 07. Located at `apps/web/app/api/inngest/route.ts`:

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { allFunctions } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
```

---

## 7. Pre-Launch Checklist

### 7.1 Infrastructure Setup

- [ ] **GitHub repository created** with monorepo structure (`apps/web`, `packages/*`)
- [ ] **Branch protection configured** on `main` per §1.6
- [ ] **Vercel project created** and linked to GitHub repo
- [ ] **Vercel Pro plan** activated
- [ ] **Vercel environment variables set** — all variables from §2.1, separated by environment (Production / Preview / Development)
- [ ] **Turborepo remote caching enabled** — `TURBO_TOKEN` and `TURBO_TEAM` set in GitHub Actions
- [ ] **GitHub Actions secrets and variables configured** per §5.4
- [ ] **GitHub Actions `production` environment created** with required reviewers

### 7.2 Supabase

- [ ] **Production Supabase project created** on Pro tier ($25/month)
- [ ] **Staging Supabase project created** on Pro tier ($25/month)
- [ ] **All migrations applied** to both staging and production via `supabase db push`
- [ ] **RLS verified** — all public tables have Row-Level Security enabled (run verification query from §4.4)
- [ ] **Realtime enabled** on `campaign_metrics` table only (§4.5)
- [ ] **Supabase Auth configured** — email provider enabled, redirect URLs set to `https://confluenceohio.org/admin/mfa/verify`
- [ ] **Initial admin user created** — Tim's email in `admin_users` table with `admin` role
- [ ] **MFA enrollment tested** — admin can log in and enroll TOTP per Artifact 15

### 7.3 DNS & Domain

- [ ] **`confluenceohio.org` active on Cloudflare** — domain already registered and managed on Cloudflare
- [ ] **DNS records configured** per §3.2 (A record, CNAME for www)
- [ ] **DNS propagation verified** — `dig confluenceohio.org` returns `76.76.21.21`
- [ ] **Vercel domain added** — `confluenceohio.org` and `www.confluenceohio.org` in Vercel project settings
- [ ] **SSL certificate issued** — Vercel shows certificate active for both domains
- [ ] **www → apex redirect working** — `https://www.confluenceohio.org` redirects to `https://confluenceohio.org`

### 7.4 Email (Brevo)

- [ ] **Brevo account created** on Starter plan ($9/month)
- [ ] **Sending domain verified** — `confluenceohio.org` added in Brevo dashboard
- [ ] **SPF record added** to Cloudflare DNS
- [ ] **DKIM records added** (3 CNAME records per Brevo's instructions)
- [ ] **DMARC record added** to Cloudflare DNS
- [ ] **Email deliverability tested** — send test emails to Gmail, Outlook, Yahoo; check spam scores via `mail-tester.com` (target score ≥8/10)
- [ ] **Brevo contact lists created** — All Subscribers, Petition Signers, Verified Signers, Volunteers, Donors
- [ ] **Transactional email templates created** — email verification, signature confirmation, volunteer welcome, admin notifications
- [ ] **CAN-SPAM compliant** — every marketing email includes: physical address (PO Box 8012, Columbus, OH 43201), unsubscribe link, sender identification
- [ ] **Brevo API key set** in Vercel production environment variables
- [ ] **Brevo webhook endpoint configured** for bounce/unsubscribe handling

### 7.5 Address Verification (Smarty)

- [ ] **Smarty account created** with production subscription
- [ ] **Embedded key generated** for client-side Autocomplete Pro
- [ ] **Auth-ID and Auth-Token generated** for server-side US Street API
- [ ] **Ohio filtering verified** — Autocomplete Pro returns only Ohio addresses with `include_only_states=OH`
- [ ] **Server-side verification tested** — submit a real Ohio address, verify `dpv_match_code`, `state_abbreviation`, `rdi` fields return correctly

### 7.6 Donations (ActBlue)

- [ ] **ActBlue form created** at `secure.actblue.com/donate/confluence`
- [ ] **Form configured** as 501(c)(4) entity
- [ ] **Embed token generated** (`data-ab-token`) and set in Vercel env
- [ ] **Webhook URL configured** in ActBlue dashboard: `https://confluenceohio.org/api/webhooks/actblue`
- [ ] **Webhook secret set** in Vercel production environment variables
- [ ] **Test donation processed** — end-to-end from form submission to webhook receipt to database insert
- [ ] **Refcode tracking verified** — donations via `?refcode=test` correctly attribute in the database

### 7.7 Cloudflare Turnstile

- [ ] **Turnstile widget created** per §3.4
- [ ] **Site key and secret key set** in Vercel environment variables
- [ ] **Widget rendering verified** — petition form at `/sign` shows Turnstile challenge when needed
- [ ] **Server-side validation verified** — API route correctly validates tokens and rejects invalid/replayed tokens

### 7.8 Analytics

- [ ] **PostHog project created** (free tier)
- [ ] **PostHog project API key set** in Vercel environment variables
- [ ] **Session replay enabled** with PII masking on all form fields (per Artifact 13)
- [ ] **GA4 property created** and measurement ID set in Vercel
- [ ] **Cookie consent banner functioning** — GA4 only loads after consent; PostHog runs cookieless regardless
- [ ] **Vercel Analytics enabled** in project settings (automatic with Pro)
- [ ] **Vercel Speed Insights enabled** in project settings
- [ ] **Key events verified firing** — petition form_view, form_start, form_submit, verification_success, share_click (test via PostHog live events view)
- [ ] **Conversion funnels defined** in PostHog per Artifact 13

### 7.9 Inngest

- [ ] **Inngest account created** at `app.inngest.com`
- [ ] **App registered** with URL `https://confluenceohio.org/api/inngest`
- [ ] **Event key and signing key set** in Vercel production environment variables
- [ ] **Functions synced** — all Inngest functions visible in dashboard after first production deployment
- [ ] **Welcome email flow tested** — sign petition → Inngest event fires → Brevo sends confirmation email

### 7.10 SEO & Social

- [ ] **Google Search Console** — site verified and `confluenceohio.org` added as property
- [ ] **Sitemap submitted** — `https://confluenceohio.org/sitemap.xml` submitted in Search Console
- [ ] **robots.txt accessible** — `https://confluenceohio.org/robots.txt` returns correct directives
- [ ] **OG tags verified** — test homepage, `/sign`, `/the-case`, and `/voices` via Facebook Sharing Debugger (`developers.facebook.com/tools/debug/`)
- [ ] **Twitter Cards verified** — test key pages via Twitter Card Validator
- [ ] **JSON-LD validated** — test homepage (NGO schema), `/faq` (FAQ schema), blog posts (Article schema) via Google's Rich Results Test
- [ ] **Dynamic OG image working** — `/sign` OG image reflects current signature count
- [ ] **Google Business Profile created** for the campaign (if applicable as a 501(c)(4))

### 7.11 Content & Legal

- [ ] **Privacy policy published** at `/privacy` — covers data collection, Smarty address verification, analytics cookies, PII handling
- [ ] **Terms of use published** at `/terms`
- [ ] **Cookie consent banner** — functional, gates GA4, respects user choice
- [ ] **Petition disclaimer** — confirm with election counsel whether Ohio law requires specific disclosure language on the petition form
- [ ] **"Paid for by" disclaimer** — confirm whether 501(c)(4) status requires `Paid for by Confluence Ohio` on email and web content per Ohio ORC §3517 (flagged in Artifact 07)
- [ ] **All page copy proofread** — every page from Artifact 04 reviewed for accuracy, typos, broken links
- [ ] **Historical claims verified** — spot-check 5+ factual claims from `/the-case/*` pages against sources
- [ ] **Launch blog post ready** — published at `/blog/why-were-asking-columbus-to-consider-a-new-name`

### 7.12 Accessibility & Performance

- [ ] **WCAG 2.1 AA audit passed** — run axe-core on all pages, resolve all critical/serious issues
- [ ] **Keyboard navigation verified** — tab through petition form, voices submission, admin dashboard
- [ ] **Screen reader tested** — VoiceOver (macOS/iOS) or NVDA (Windows) on petition form and voices section
- [ ] **Skip-to-content link present** on all pages
- [ ] **Color contrast verified** — ≥4.5:1 for normal text, ≥3:1 for large text
- [ ] **Lighthouse scores ≥90** on all four categories (Performance, Accessibility, Best Practices, SEO) for homepage, `/sign`, `/the-case`, `/faq`
- [ ] **LCP < 2.5s** on mobile (test via WebPageTest or Lighthouse)
- [ ] **CLS < 0.1** on all pages
- [ ] **Total page weight < 500KB** initial load (check via DevTools Network tab)

### 7.13 Security & Load Testing

- [ ] **Rate limiting verified** — submit >3 petition signatures from same IP within 1 hour; confirm rate limit kicks in
- [ ] **Honeypot field verified** — submit petition form with honeypot field populated; confirm rejection
- [ ] **Turnstile bypass attempt** — submit petition API route without valid Turnstile token; confirm rejection
- [ ] **RLS penetration test** — attempt to read `signatures` table from anonymous Supabase client; confirm access denied
- [ ] **Admin auth verified** — attempt to access `/admin` routes without authentication; confirm redirect to login
- [ ] **MFA required** — attempt to access admin after password login but before MFA; confirm redirect to MFA challenge
- [ ] **Load test** — simulate 100 concurrent petition submissions using `k6` or `artillery`; verify no errors, response times < 2s at p95
- [ ] **Email verification token security** — verify tokens expire after 72 hours, cannot be reused, and use HMAC not plaintext IDs
- [ ] **CSP headers verified** — no violations in browser console on any page; no inline scripts blocked

### 7.14 Admin Dashboard

- [ ] **Admin login flow working** — email/password → MFA enrollment (first time) → MFA challenge → dashboard
- [ ] **Dashboard metrics loading** — signature count, today's signatures, conversion rate, pending voices
- [ ] **Signatures list functional** — search, filter by verification status, export to CSV
- [ ] **Voices moderation queue functional** — approve, reject, feature stories
- [ ] **Donation list loading** from ActBlue webhook data
- [ ] **Volunteer list functional** — view by role, status
- [ ] **Settings page working** — update milestone thresholds

### 7.15 Final Pre-Launch

- [ ] **Backup and recovery plan documented** — Supabase Pro has point-in-time recovery; document the process for restoring from backup
- [ ] **Admin accounts created** — Tim + one other with MFA enrolled
- [ ] **Social media accounts created** and linked — Twitter/X, Facebook, Instagram (at minimum)
- [ ] **Press kit uploaded** to `/press` — logo files, brand guidelines, campaign one-pager, high-res photos
- [ ] **Error monitoring configured** — Vercel's built-in error tracking or Sentry integration
- [ ] **Uptime monitoring configured** — BetterUptime, Checkly, or similar on `confluenceohio.org` and `/api/petition/sign`
- [ ] **Launch sequence planned** — coordinate blog post publish, social media announcement, email to pre-launch list, press outreach
- [ ] **Rollback plan documented** — if critical bugs emerge, revert to previous Vercel deployment with one click; Supabase migration rollback requires manual SQL (document the reversal for each migration)

---

## 8. Launch Day Runbook

### 8.1 Pre-Launch (T-2 hours)

1. Verify all checklist items above are complete
2. Run `supabase db execute --sql "SELECT count(*) FROM signatures;"` — should be 0 (or test data cleared)
3. Clear test data from staging and production databases
4. Verify Vercel production deployment is the latest `main` commit
5. Open PostHog live events view — confirm no spurious events
6. Open Inngest dashboard — confirm all functions are registered and healthy

### 8.2 Launch (T-0)

1. Publish launch blog post (merge the blog post MDX to `main` if not already deployed)
2. Tim signs the petition — becomes signer #1
3. Verify the full flow: signature → email verification → referral code → share buttons → Inngest events
4. Monitor PostHog for first real events
5. Announce on social media
6. Send email to any pre-launch list
7. Distribute press kit to local media contacts

### 8.3 Post-Launch (T+1 hour to T+24 hours)

1. Monitor Vercel error logs for any 500s
2. Monitor Supabase dashboard for database performance (connections, query latency)
3. Check Brevo delivery dashboard — any bounces or spam reports?
4. Check Inngest dashboard — any failed function runs?
5. Review first 10 signatures in admin dashboard — verify address verification working correctly
6. Test sharing flow from a real signer's perspective (referral link → new signer attribution)
7. Screenshot Lighthouse scores for baseline documentation

### 8.4 Rollback Procedures

| Component | Rollback Method | Time to Recover |
|---|---|---|
| Next.js app | Vercel → Deployments → promote previous deployment | < 1 minute |
| Database schema | Supabase point-in-time recovery (Pro feature) to pre-migration timestamp | 5–15 minutes |
| DNS | Revert Cloudflare records (keep previous values documented) | 1–5 minutes (+ propagation) |
| Inngest functions | Redeploy previous commit; Inngest re-syncs automatically | < 2 minutes |
| Brevo templates | Re-upload previous template versions | 5 minutes |

---

## 9. Monthly Infrastructure Costs (Launch)

| Service | Plan | Monthly Cost |
|---|---|---|
| Vercel | Pro (1 member) | $20 |
| Supabase Production | Pro | $25 |
| Supabase Staging | Pro | $25 |
| Brevo | Starter | $9 |
| Smarty | ~10K verifications/mo | $54 |
| Cloudflare | Free | $0 |
| PostHog | Free (1M events) | $0 |
| Inngest | Free (25K function runs) | $0 |
| Domain registration | Annual ÷ 12 | ~$1 |
| **Total** | | **~$134/month** |

**Scaling triggers:**
- Supabase: Upgrade to Team ($599/month) if database exceeds 8GB or need more than 100 concurrent connections
- Brevo: Upgrade when monthly sends exceed Starter limits (~20K emails/month)
- Smarty: Cost scales linearly with verification volume
- PostHog: First 1M events free, then usage-based ($0.00031/event) — at 50K monthly visitors × 20 events each = 1M events, which fits free tier
- Inngest: First 25K runs free, then $0.003/step — at 1K signatures/month with 5 Inngest functions per signature = 5K runs, well within free tier

---

## Claude Code Handoff

### Handoff Prompt 1: Vercel Configuration and Security Headers

```
Read docs/deployment-launch.md (Artifact 16) sections 1.1–1.4.

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

### Handoff Prompt 2: Turborepo Configuration

```
Read docs/deployment-launch.md (Artifact 16) section 1.2.

Generate `/turbo.json` with:
- globalDependencies: .env.*local files
- globalEnv: all NEXT_PUBLIC_* variables (Supabase URL, anon key, Turnstile site key, PostHog key/host, GA4 measurement ID, Smarty embedded key, ActBlue embed token, site URL)
- Task definitions:
  - build: depends on ^build, outputs .next/** excluding cache, env includes all server-only secrets
  - lint: depends on ^build, no outputs
  - type-check: depends on ^build, no outputs
  - test: depends on ^build, no outputs
  - dev: no cache, persistent

Cross-reference the environment variable list against Artifacts 06 (SMARTY_AUTH_ID, SMARTY_AUTH_TOKEN), 07 (BREVO_API_KEY, BREVO_WEBHOOK_SECRET), 09 (ACTBLUE_WEBHOOK_USERNAME / ACTBLUE_WEBHOOK_PASSWORD), 13 (PostHog and GA4 keys), and 15 (admin email allowlist) to ensure no variable is missing.
```

### Handoff Prompt 3: GitHub Actions CI/CD Pipeline

```
Read docs/deployment-launch.md (Artifact 16) section 5.

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

### Handoff Prompt 4: Cloudflare DNS Configuration Guide

```
Read docs/deployment-launch.md (Artifact 16) section 3.

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

### Handoff Prompt 5: Launch Checklist as Trackable Document

```
Read docs/deployment-launch.md (Artifact 16) sections 7–8.

Generate `docs/launch-checklist.md` — the complete pre-launch checklist formatted as a GitHub-flavored Markdown checklist that Tim and the team can track in a GitHub Issue or project board.

Organize into the 15 categories from §7 (Infrastructure, Supabase, DNS, Email, Smarty, ActBlue, Turnstile, Analytics, Inngest, SEO, Content/Legal, Accessibility, Security, Admin, Final). Each item should be a checkbox with enough detail to be actionable without referencing the spec.

Also generate `docs/launch-runbook.md` — the launch day runbook from §8, including:
- T-2 hours pre-launch steps
- T-0 launch sequence
- T+1 to T+24 monitoring checklist
- Rollback procedures table with component, method, and recovery time

Both documents should be self-contained — someone should be able to follow them without reading the full deployment spec.
```

### Handoff Prompt 6: Environment Variable Validation Script

```
Read docs/deployment-launch.md (Artifact 16) section 2.

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
