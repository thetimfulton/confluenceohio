# Confluence Ohio — Admin Dashboard and Moderation Tools

**Artifact 15 · Prompt 15 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 05 (Data Model), Artifact 06 (Petition Signing Flow), Artifact 09 (ActBlue Donation Integration), Artifact 10 (Community Voices), Artifact 13 (Analytics & Conversion Tracking)

---

## Resolved Questions (Tim's Answers — April 10, 2026)

1. **Admin app routing strategy.** ✅ **Route group confirmed.** Admin dashboard stays at `apps/web/app/(admin)/admin/` as a route group inside the main Next.js app. No separate `apps/admin` app.

2. **Admin role expansion timeline.** ✅ **Deferred approach confirmed.** Roles added to enum and RLS policies now; full role-gated UI deferred to Phase 2 when volunteer moderators join.

3. **Admin email domain.** ✅ **No domain restriction.** Any email address is valid for admin invites.

4. **Two-factor authentication.** ✅ **MFA required at launch.** Supabase TOTP-based MFA will be enforced for all admin logins, given PII access.

5. **Blog content management.** ✅ **MDX-in-Git only.** No blog CMS in the admin dashboard. Blog content managed via Git commits per Artifact 05.

---

## 1. Architecture Overview

### 1.1 Routing Strategy

The admin dashboard is a **route group** inside the main Next.js app, sharing the Supabase client, middleware, and Vercel deployment.

```
apps/web/app/
├── (public)/           ← Public pages (existing)
│   ├── page.tsx        ← Homepage
│   ├── sign/
│   ├── voices/
│   └── ...
├── (admin)/            ← Admin route group (separate layout, no public nav)
│   └── admin/
│       ├── layout.tsx              ← Admin shell (sidebar, auth gate)
│       ├── page.tsx                ← Dashboard home
│       ├── signatures/
│       │   ├── page.tsx            ← Signatures list
│       │   └── [id]/page.tsx       ← Signature detail + referral chain
│       ├── voices/
│       │   ├── page.tsx            ← Moderation queue
│       │   └── [id]/page.tsx       ← Submission detail + moderation actions
│       ├── donations/
│       │   └── page.tsx            ← Donation list + analytics
│       ├── volunteers/
│       │   └── page.tsx            ← Volunteer list + management
│       ├── email/
│       │   └── page.tsx            ← Email subscriber list + Brevo sync status
│       ├── referrals/
│       │   └── page.tsx            ← Referral leaderboard + attribution
│       ├── settings/
│       │   └── page.tsx            ← Campaign settings, milestone config
│       ├── login/
│       │   └── page.tsx            ← Admin login (outside auth gate)
│       └── mfa/
│           ├── enroll/page.tsx     ← TOTP enrollment (QR code + verify)
│           └── verify/page.tsx     ← TOTP challenge (6-digit code entry)
├── api/
│   └── admin/
│       ├── metrics/route.ts        ← Dashboard metrics API
│       ├── signatures/route.ts     ← Signatures CRUD + export
│       ├── voices/route.ts         ← Moderation actions
│       ├── volunteers/route.ts     ← Volunteer management
│       ├── donations/route.ts      ← Donation queries
│       ├── referrals/route.ts      ← Referral analytics
│       ├── settings/route.ts       ← Campaign settings
│       └── invite/route.ts         ← Admin invite flow
└── middleware.ts                    ← Auth check for /admin/* routes
```

### 1.2 Why a Route Group, Not a Separate App

| Factor | Route Group (`apps/web`) | Separate App (`apps/admin`) |
|--------|--------------------------|----------------------------|
| Deployment | Single Vercel project | Two Vercel projects, 2× preview deploys |
| Shared code | Imports Supabase client, types, utilities directly | Must go through `packages/*` |
| Auth middleware | Single `middleware.ts` | Duplicate auth logic |
| Build time | Slightly larger bundle (admin code tree-shaken from public) | Independent builds |
| Domain | `confluenceohio.org/admin` | `admin.confluenceohio.org` (needs separate DNS) |
| Phase 2 extraction | Easy to extract to `apps/admin` if needed | Already separate |

**Decision:** Route group at launch. Extract to `apps/admin` only if admin bundle size meaningfully impacts public site performance (unlikely — admin routes are dynamically imported and not included in public bundles via route groups).

---

## 2. Authentication and Authorization

### 2.1 Auth Flow

Admin users authenticate via **Supabase Auth email + password with TOTP-based MFA**, not magic links (magic links are convenient but less secure for admin access — they can be forwarded). MFA is **required** for all admin accounts given PII access to signer addresses and emails. Admin sessions use Supabase's built-in JWT with a custom claim indicating admin role.

```
┌──────────────────────────────────────────────────────────────┐
│                     Admin Login Flow                          │
│                                                              │
│  1. User navigates to /admin/login                           │
│  2. Enters email + password                                  │
│  3. Supabase Auth validates credentials                      │
│  4. If MFA not enrolled → redirect to /admin/mfa/enroll      │
│  5. If MFA enrolled → prompt for TOTP code                   │
│  6. Verify TOTP → session established                        │
│  7. Custom Access Token Hook injects admin role claim        │
│  8. JWT returned with { app_metadata: { admin_role: X } }   │
│  9. Middleware reads JWT, checks admin_role + MFA AAL         │
│  10. If valid admin + AAL2 → serve admin page                │
│  11. If not admin → redirect to /admin/login                 │
│  12. If no session → redirect to /admin/login                │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Custom Access Token Hook

Supabase's Custom Access Token Hook runs before every JWT issuance. It checks the `admin_users` table and injects the role into the token's `app_metadata`. This is the recommended Supabase approach for RBAC — it avoids extra database queries on every request because the role is embedded in the JWT.

```sql
-- Supabase Auth Hook: Custom Access Token
-- This function is called before every JWT issuance.
-- It checks if the authenticated user exists in admin_users
-- and injects their role into the JWT's app_metadata.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  admin_role_value text;
BEGIN
  -- Extract current claims from the event
  claims := event->'claims';

  -- Look up the user's admin role
  SELECT role::text INTO admin_role_value
  FROM public.admin_users
  WHERE id = (event->>'user_id')::uuid;

  IF admin_role_value IS NOT NULL THEN
    -- User is an admin — inject role into app_metadata
    claims := jsonb_set(
      claims,
      '{app_metadata, admin_role}',
      to_jsonb(admin_role_value)
    );
  ELSE
    -- User is not an admin — ensure no admin_role claim exists
    claims := jsonb_set(
      claims,
      '{app_metadata, admin_role}',
      'null'::jsonb
    );
  END IF;

  -- Return the modified event with updated claims
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant required permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.admin_users TO supabase_auth_admin;

-- IMPORTANT: After creating this function, enable it in the Supabase Dashboard:
-- Authentication → Hooks → Custom Access Token → Enable → Select public.custom_access_token_hook
```

### 2.3 Updated Admin Role Enum

Expanding the `admin_role` enum from Artifact 05 to include `moderator` and `viewer` at the schema level. Only `admin` is used at launch; the other roles are enforced in RLS policies for forward compatibility.

```sql
-- Migration: Expand admin_role enum (idempotent)
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'viewer';
```

**Role permissions matrix:**

| Capability | admin | moderator | viewer |
|-----------|-------|-----------|--------|
| View dashboard metrics | ✅ | ✅ | ✅ |
| View signature list + detail | ✅ | ❌ | ✅ (read-only) |
| Export signatures to CSV | ✅ | ❌ | ❌ |
| Flag/unflag signatures | ✅ | ❌ | ❌ |
| View moderation queue | ✅ | ✅ | ❌ |
| Approve/reject voices | ✅ | ✅ | ❌ |
| Feature/unfeature voices | ✅ | ✅ | ❌ |
| Edit voice submissions | ✅ | ❌ | ❌ |
| View donation data | ✅ | ❌ | ✅ (read-only) |
| View volunteer list | ✅ | ❌ | ✅ (read-only) |
| Manage volunteers (status, notes) | ✅ | ❌ | ❌ |
| View email subscriber list | ✅ | ❌ | ❌ |
| Campaign settings | ✅ | ❌ | ❌ |
| Invite new admins | ✅ | ❌ | ❌ |

### 2.4 Middleware: Admin Route Protection

```typescript
// apps/web/middleware.ts (admin-specific section)

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply admin auth checks to /admin/* routes (except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const response = NextResponse.next({
      request: { headers: request.headers },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // IMPORTANT: Use getUser() not getSession() for security
    // getUser() validates the JWT against the Supabase Auth server
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin role from JWT claims (injected by custom access token hook)
    const adminRole = user.app_metadata?.admin_role;
    if (!adminRole || !['admin', 'moderator', 'viewer'].includes(adminRole)) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    // Enforce MFA: require AAL2 (TOTP verified) for all admin routes
    // Skip enforcement for the MFA enrollment page itself
    if (!pathname.startsWith('/admin/mfa')) {
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (mfaData?.currentLevel !== 'aal2') {
        // User is authenticated but hasn't completed MFA
        if (mfaData?.currentLevel === 'aal1' && (mfaData?.nextLevel === 'aal2')) {
          // MFA enrolled but not verified this session → challenge
          const mfaUrl = new URL('/admin/mfa/verify', request.url);
          mfaUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(mfaUrl);
        } else {
          // MFA not enrolled → send to enrollment
          const enrollUrl = new URL('/admin/mfa/enroll', request.url);
          return NextResponse.redirect(enrollUrl);
        }
      }
    }

    // Attach role to request headers for downstream use
    response.headers.set('x-admin-role', adminRole);
    return response;
  }

  // ... existing middleware logic for public routes (referral tracking, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

### 2.5 Server-Side Admin Verification Utility

Used by all admin API routes and server components. Double-checks the JWT claim against the database as a defense-in-depth measure.

```typescript
// packages/core/auth/admin.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type AdminRole = 'admin' | 'moderator' | 'viewer';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
}

/**
 * Verify the current request is from an authenticated admin user.
 * Returns the admin user object or null.
 * 
 * Uses getUser() (not getSession()) for JWT validation security.
 * Falls back to database lookup if JWT claim is missing.
 */
export async function requireAdmin(
  allowedRoles: AdminRole[] = ['admin', 'moderator', 'viewer']
): Promise<AdminUser | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components — safe to ignore
          }
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Primary: check JWT claim (fast, no DB query)
  const jwtRole = user.app_metadata?.admin_role as AdminRole | undefined;
  if (jwtRole && allowedRoles.includes(jwtRole)) {
    return { id: user.id, email: user.email!, role: jwtRole };
  }

  // Fallback: check database (defense-in-depth)
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: adminRecord } = await serviceClient
    .from('admin_users')
    .select('id, email, role')
    .eq('id', user.id)
    .single();

  if (!adminRecord || !allowedRoles.includes(adminRecord.role as AdminRole)) {
    return null;
  }

  return {
    id: adminRecord.id,
    email: adminRecord.email,
    role: adminRecord.role as AdminRole,
  };
}

/**
 * Convenience: require full admin access (not moderator or viewer).
 */
export async function requireFullAdmin(): Promise<AdminUser | null> {
  return requireAdmin(['admin']);
}
```

### 2.6 Updated RLS Policies for Role-Based Access

These extend the Artifact 05 policies with granular role checks.

```sql
-- ============================================
-- Signatures: admin and viewer can read; only admin can modify
-- ============================================
DROP POLICY IF EXISTS "Admins can read all signatures" ON signatures;

CREATE POLICY "Admin and viewer can read signatures"
  ON signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'viewer')
    )
  );

-- ============================================
-- Voice submissions: admin and moderator can read all; admin and moderator can update
-- ============================================
DROP POLICY IF EXISTS "Admins can read all voices" ON voice_submissions;
DROP POLICY IF EXISTS "Admins can update voices" ON voice_submissions;

CREATE POLICY "Admin and moderator can read all voices"
  ON voice_submissions FOR SELECT
  TO authenticated
  USING (
    -- Public approved voices (existing policy covers anon)
    moderation_status IN ('auto_approved', 'approved')
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admin and moderator can update voices"
  ON voice_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================
-- Donations: admin and viewer can read
-- ============================================
DROP POLICY IF EXISTS "Admins can read donations" ON donations;

CREATE POLICY "Admin and viewer can read donations"
  ON donations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'viewer')
    )
  );

-- ============================================
-- Volunteers: admin and viewer can read; admin can update
-- ============================================
CREATE POLICY "Admin and viewer can read volunteers"
  ON volunteers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'viewer')
    )
  );

CREATE POLICY "Admin can update volunteers"
  ON volunteers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- Email subscribers: admin only
-- ============================================
CREATE POLICY "Admin can read email subscribers"
  ON email_subscribers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- Moderation log: admin and moderator can read; writes via service_role
-- ============================================
CREATE POLICY "Admin and moderator can read moderation log"
  ON moderation_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================
-- Admin users: only admin can read (for invite management)
-- ============================================
CREATE POLICY "Admin can read admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

## 3. Admin Dashboard Home

### 3.1 Layout and Navigation

The admin layout uses a **persistent left sidebar** on desktop (≥1024px) that collapses to a top hamburger menu on tablet/mobile. The sidebar contains navigation links and a "Back to public site" escape hatch.

```typescript
// apps/web/app/(admin)/admin/layout.tsx

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/packages/core/auth/admin';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminHeader } from '@/components/admin/header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect('/admin/login');

  return (
    <div className="admin-layout">
      <AdminSidebar role={admin.role} />
      <div className="admin-main">
        <AdminHeader admin={admin} />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
```

**Sidebar navigation items (role-gated):**

| Nav Item | Icon | Route | Roles |
|----------|------|-------|-------|
| Dashboard | LayoutDashboard | `/admin` | all |
| Signatures | FileSignature | `/admin/signatures` | admin, viewer |
| Voices | MessageSquare | `/admin/voices` | admin, moderator |
| Donations | DollarSign | `/admin/donations` | admin, viewer |
| Volunteers | Users | `/admin/volunteers` | admin, viewer |
| Email List | Mail | `/admin/email` | admin |
| Referrals | Share2 | `/admin/referrals` | admin |
| Settings | Settings | `/admin/settings` | admin |

Sidebar badge indicators:
- **Voices:** shows count of pending moderation items (red badge)
- **Volunteers:** shows count of new signups in last 7 days (blue badge)

### 3.2 Dashboard Home Metrics

The dashboard home page (`/admin`) renders a grid of metric cards sourced from the `campaign_metrics` table (real-time via Supabase Realtime) and computed queries (polled).

**Metric card grid layout:**

```
Row 1: Hero metrics (large cards)
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   TOTAL SIGS     │  │  SIGS TODAY      │  │  CONVERSION RATE │
│   4,217 / 22K    │  │  +127            │  │  8.4%            │
│   [████░░░░░░]   │  │  ↑ 23% vs yday   │  │  ↑ 1.2pp vs lwk │
└──────────────────┘  └──────────────────┘  └──────────────────┘

Row 2: Secondary metrics (standard cards)
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ DONATIONS│  │ VOLNTEERS│  │ VOICES   │  │ EMAIL    │
│ $12,450  │  │ 89 active│  │ 12 pndng │  │ 5,890    │
│ avg $31  │  │ +7 /wk   │  │ 34 aprvd │  │ subs     │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

Row 3: Activity feed + Referral snapshot
┌────────────────────────────────┐  ┌──────────────────────┐
│  RECENT ACTIVITY               │  │  REFERRAL K-FACTOR   │
│  • Jane D. signed (#4,218)     │  │  k = 0.34            │
│  • New voice from Clintonville │  │  1,240 via referral   │
│  • $25 donation (ActBlue)      │  │  Top: Twitter (38%)   │
│  • 3 new volunteers            │  │                       │
└────────────────────────────────┘  └──────────────────────┘
```

### 3.3 Dashboard Data Fetching

The dashboard home uses **server-side data fetching** with a hybrid approach: real-time counters from `campaign_metrics` (instant), computed metrics from aggregate queries (cached 60s), and PostHog API data (cached 5 min).

```typescript
// apps/web/app/(admin)/admin/page.tsx

import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/packages/core/auth/admin';
import { redirect } from 'next/navigation';
import { DashboardGrid } from '@/components/admin/dashboard-grid';
import { RecentActivity } from '@/components/admin/recent-activity';

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  if (!admin) redirect('/admin/login');

  const supabase = createServiceClient();

  const [
    metrics,
    todaySignatures,
    weekSignatures,
    yesterdaySignatures,
    avgDonation,
    recurringPct,
    activeVolunteers,
    newVolunteersWeek,
    pendingVoices,
    approvedVoices,
    topReferralPlatform,
    kFactor,
    recentActivity,
  ] = await Promise.all([
    // Real-time counters
    supabase.from('campaign_metrics').select('metric, value'),

    // Today's signatures
    supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .gte('signed_at', new Date().toISOString().split('T')[0]),

    // This week's signatures
    supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .gte('signed_at', getWeekStart().toISOString()),

    // Yesterday's signatures (for trend comparison)
    supabase
      .from('signatures')
      .select('id', { count: 'exact', head: true })
      .gte('signed_at', getYesterdayStart().toISOString())
      .lt('signed_at', new Date().toISOString().split('T')[0]),

    // Average donation
    supabase.rpc('avg_donation_cents'),

    // Recurring donation percentage
    supabase.rpc('recurring_donation_pct'),

    // Active volunteers
    supabase
      .from('volunteers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // New volunteers this week
    supabase
      .from('volunteers')
      .select('id', { count: 'exact', head: true })
      .gte('signed_up_at', getWeekStart().toISOString()),

    // Pending voice submissions
    supabase
      .from('voice_submissions')
      .select('id', { count: 'exact', head: true })
      .in('moderation_status', ['pending', 'needs_review']),

    // Approved voices total
    supabase
      .from('voice_submissions')
      .select('id', { count: 'exact', head: true })
      .in('moderation_status', ['auto_approved', 'approved']),

    // Top referral platform
    supabase.rpc('top_referral_platform'),

    // K-factor
    supabase.rpc('referral_k_factor'),

    // Recent activity (last 20 events across all tables)
    supabase.rpc('recent_admin_activity', { limit_count: 20 }),
  ]);

  return (
    <div>
      <h1>Campaign Dashboard</h1>
      <DashboardGrid
        metrics={metrics.data}
        todayCount={todaySignatures.count}
        weekCount={weekSignatures.count}
        yesterdayCount={yesterdaySignatures.count}
        avgDonationCents={avgDonation.data}
        recurringPct={recurringPct.data}
        activeVolunteers={activeVolunteers.count}
        newVolunteersWeek={newVolunteersWeek.count}
        pendingVoices={pendingVoices.count}
        approvedVoices={approvedVoices.count}
        topPlatform={topReferralPlatform.data}
        kFactor={kFactor.data}
      />
      <RecentActivity items={recentActivity.data} />
    </div>
  );
}
```

### 3.4 Database Functions for Dashboard Aggregates

```sql
-- Average donation in cents
CREATE OR REPLACE FUNCTION avg_donation_cents()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(AVG(amount_cents)::integer, 0)
  FROM donations;
$$;

-- Recurring donation percentage
CREATE OR REPLACE FUNCTION recurring_donation_pct()
RETURNS numeric(5,2)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    COUNT(*) FILTER (WHERE recurring) * 100.0 / NULLIF(COUNT(*), 0),
    0
  )::numeric(5,2)
  FROM donations;
$$;

-- Top referral platform by conversions
CREATE OR REPLACE FUNCTION top_referral_platform()
RETURNS TABLE(platform referral_platform, total_conversions bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT platform, SUM(conversions) as total_conversions
  FROM referrals
  GROUP BY platform
  ORDER BY total_conversions DESC
  LIMIT 1;
$$;

-- Referral k-factor: (shares/signers) × (conversions/clicks)
CREATE OR REPLACE FUNCTION referral_k_factor()
RETURNS numeric(5,3)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COUNT(DISTINCT referral_code) FROM referrals)::numeric
    / NULLIF((SELECT value FROM campaign_metrics WHERE metric = 'signature_count'), 0)::numeric
    * (SELECT SUM(conversions) FROM referrals)::numeric
    / NULLIF((SELECT SUM(clicks) FROM referrals), 0)::numeric,
    0
  )::numeric(5,3);
$$;

-- Recent admin activity feed (union across tables)
CREATE OR REPLACE FUNCTION recent_admin_activity(limit_count integer DEFAULT 20)
RETURNS TABLE(
  activity_type text,
  description text,
  detail jsonb,
  occurred_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  (
    SELECT
      'signature' as activity_type,
      first_name || ' ' || LEFT(last_name, 1) || '. signed (#' || signature_number || ')' as description,
      jsonb_build_object('city', city, 'verification_status', verification_status) as detail,
      signed_at as occurred_at
    FROM signatures
    WHERE deleted_at IS NULL
    ORDER BY signed_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    SELECT
      'voice' as activity_type,
      'New voice from ' || COALESCE(author_neighborhood, 'Columbus') || ' (' || position::text || ')' as description,
      jsonb_build_object('title', title, 'status', moderation_status) as detail,
      submitted_at as occurred_at
    FROM voice_submissions
    ORDER BY submitted_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    SELECT
      'donation' as activity_type,
      '$' || (amount_cents / 100)::text || ' donation' || CASE WHEN recurring THEN ' (recurring)' ELSE '' END as description,
      jsonb_build_object('refcode', refcode, 'express_lane', express_lane) as detail,
      donated_at as occurred_at
    FROM donations
    ORDER BY donated_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    SELECT
      'volunteer' as activity_type,
      first_name || ' ' || LEFT(last_name, 1) || '. signed up to volunteer' as description,
      jsonb_build_object('roles', roles, 'neighborhood', neighborhood) as detail,
      signed_up_at as occurred_at
    FROM volunteers
    ORDER BY signed_up_at DESC
    LIMIT limit_count
  )
  ORDER BY occurred_at DESC
  LIMIT limit_count;
$$;

-- Grant execute to authenticated (RLS on underlying tables still applies)
GRANT EXECUTE ON FUNCTION avg_donation_cents TO authenticated;
GRANT EXECUTE ON FUNCTION recurring_donation_pct TO authenticated;
GRANT EXECUTE ON FUNCTION top_referral_platform TO authenticated;
GRANT EXECUTE ON FUNCTION referral_k_factor TO authenticated;
GRANT EXECUTE ON FUNCTION recent_admin_activity TO authenticated;
```

### 3.5 Real-Time Signature Counter (Client Component)

The dashboard uses Supabase Realtime to subscribe to `campaign_metrics` changes, providing live signature count updates without polling.

```typescript
// components/admin/live-signature-counter.tsx

'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface LiveCounterProps {
  initialCount: number;
  goal: number;
}

export function LiveSignatureCounter({ initialCount, goal }: LiveCounterProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('admin-signature-count')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_metrics',
          filter: "metric=eq.signature_count",
        },
        (payload) => {
          setCount(payload.new.value);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pct = Math.min((count / goal) * 100, 100);

  return (
    <div className="metric-card metric-card--hero">
      <div className="metric-label">Total Signatures</div>
      <div className="metric-value">
        {count.toLocaleString()}
        <span className="metric-goal"> / {goal.toLocaleString()}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="metric-pct">{pct.toFixed(1)}%</div>
    </div>
  );
}
```

---

## 4. Signatures Management

### 4.1 Signature List Page

Route: `/admin/signatures`
Roles: admin, viewer

A searchable, filterable, sortable table of all petition signatures. Viewer role gets read-only access; admin can flag/unflag and export.

**Table columns:**

| Column | Sortable | Notes |
|--------|----------|-------|
| # | Yes | Signature number |
| Name | Yes | First + last name |
| City | Yes | Ohio city from address |
| Email | No | Masked for viewer role: `j***@gmail.com` |
| Verification | Yes | Status badge (verified/flagged/rejected/pending) |
| Referred by | No | Referral code if applicable, links to referrer |
| Email verified | Yes | ✅ / ❌ |
| Signed at | Yes (default: newest first) | Relative time + tooltip with absolute |

**Filters:**

| Filter | Type | Options |
|--------|------|---------|
| Verification status | Multi-select | verified, flagged, rejected, pending, duplicate |
| Email verified | Toggle | yes / no / all |
| Has referral | Toggle | referred / not referred / all |
| Date range | Date picker | from / to |
| Search | Text | Searches first_name, last_name, email, city |

**Actions (admin only):**

- **Flag signature:** Sets `verification_status = 'flagged'` with a note. Flagged signatures remain in the public count.
- **Reject signature:** Sets `verification_status = 'rejected'`. Removes from public count. Decrements `campaign_metrics.signature_count`.
- **Restore rejected:** Moves back to `verified` or `flagged`.
- **Export CSV:** Exports filtered results. Includes: signature_number, first_name, last_name, email, city, zip, verification_status, signed_at, referral_code, referred_by_code. PII export is logged to an audit table.
- **View referral chain:** Shows the signer's referrer and all signers they referred, as a visual tree.

### 4.2 Signatures API Route

```typescript
// apps/web/app/api/admin/signatures/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin, requireFullAdmin } from '@/packages/core/auth/admin';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(['admin', 'viewer']);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const perPage = parseInt(searchParams.get('per_page') ?? '50');
  const sortBy = searchParams.get('sort') ?? 'signed_at';
  const sortOrder = searchParams.get('order') === 'asc' ? true : false;
  const search = searchParams.get('search');
  const status = searchParams.getAll('status');
  const emailVerified = searchParams.get('email_verified');
  const hasReferral = searchParams.get('has_referral');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const format = searchParams.get('format'); // 'csv' for export

  // CSV export requires full admin
  if (format === 'csv') {
    const fullAdmin = await requireFullAdmin();
    if (!fullAdmin) return NextResponse.json({ error: 'Admin role required for export' }, { status: 403 });
  }

  const supabase = createServiceClient();
  let query = supabase
    .from('signatures')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  // Apply filters
  if (status.length > 0) {
    query = query.in('verification_status', status);
  }
  if (emailVerified === 'true') query = query.eq('email_verified', true);
  if (emailVerified === 'false') query = query.eq('email_verified', false);
  if (hasReferral === 'true') query = query.not('referred_by_code', 'is', null);
  if (hasReferral === 'false') query = query.is('referred_by_code', null);
  if (dateFrom) query = query.gte('signed_at', dateFrom);
  if (dateTo) query = query.lte('signed_at', dateTo);
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
    );
  }

  // Sort
  query = query.order(sortBy, { ascending: sortOrder });

  // Pagination (skip for CSV export)
  if (format !== 'csv') {
    const from = (page - 1) * perPage;
    query = query.range(from, from + perPage - 1);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // CSV export
  if (format === 'csv') {
    const csv = generateSignaturesCsv(data ?? []);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="signatures-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // Mask email for viewer role
  const masked = admin.role === 'viewer'
    ? (data ?? []).map(s => ({ ...s, email: maskEmail(s.email) }))
    : data;

  return NextResponse.json({
    data: masked,
    pagination: { page, perPage, total: count ?? 0 },
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

function generateSignaturesCsv(signatures: any[]): string {
  const headers = [
    'signature_number', 'first_name', 'last_name', 'email',
    'city', 'zip_code', 'verification_status', 'email_verified',
    'signed_at', 'referral_code', 'referred_by_code',
  ];
  const rows = signatures.map(s =>
    headers.map(h => `"${String(s[h] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
```

### 4.3 Signature Actions API

```typescript
// apps/web/app/api/admin/signatures/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireFullAdmin } from '@/packages/core/auth/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireFullAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin role required' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { action, note } = body as {
    action: 'flag' | 'reject' | 'restore';
    note?: string;
  };

  const supabase = createServiceClient();

  // Get current signature
  const { data: signature } = await supabase
    .from('signatures')
    .select('verification_status')
    .eq('id', id)
    .single();

  if (!signature) {
    return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
  }

  let newStatus: string;
  let adjustCount = 0; // +1 or -1 for campaign_metrics

  switch (action) {
    case 'flag':
      newStatus = 'flagged';
      // Flagged still counts — no metric adjustment
      break;
    case 'reject':
      newStatus = 'rejected';
      // Rejected removes from count
      if (['verified', 'flagged', 'pending'].includes(signature.verification_status)) {
        adjustCount = -1;
      }
      break;
    case 'restore':
      newStatus = 'verified';
      // Restoring adds back to count
      if (signature.verification_status === 'rejected') {
        adjustCount = 1;
      }
      break;
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Update signature status
  const { error } = await supabase
    .from('signatures')
    .update({
      verification_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Adjust campaign_metrics if needed (trigger handles verified count,
  // but manual rejection isn't handled by the insert trigger)
  if (adjustCount !== 0) {
    await supabase.rpc('adjust_signature_count', { adjustment: adjustCount });
  }

  return NextResponse.json({ status: newStatus });
}
```

```sql
-- Helper function for manual signature count adjustment
CREATE OR REPLACE FUNCTION adjust_signature_count(adjustment integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaign_metrics
  SET value = GREATEST(value + adjustment, 0), recorded_at = now()
  WHERE metric = 'signature_count';
END;
$$;
```

---

## 5. Voice Moderation Queue

### 5.1 Queue Page

Route: `/admin/voices`
Roles: admin, moderator

The moderation queue is the moderator's primary workspace. It shows pending submissions with quick-action buttons for approve/reject, plus a detail view for deeper review.

**Queue layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Moderation Queue                           12 pending · 5 new  │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [All pending ▾]  [Support ▾]  [This week ▾]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟡 NEEDS REVIEW · AI confidence: 0.67                      ││
│  │ "Why I Think We Should Keep Columbus"                       ││
│  │ by Mark T. · Westerville · oppose · 347 words              ││
│  │ Submitted 2 hours ago                                       ││
│  │                                                              ││
│  │ AI flags: political_reference (low), mentions_specific_     ││
│  │ person (medium)                                              ││
│  │                                                              ││
│  │ [Preview ▾]                                                 ││
│  │ "I've lived in Columbus for 40 years. My kids grew up here. ││
│  │  The name Columbus means home to us, not some historical... ││
│  │                                                              ││
│  │ [✅ Approve]  [❌ Reject ▾]  [📝 Edit]  [⭐ Feature]       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟢 AUTO-APPROVED · AI confidence: 0.94                     ││
│  │ "The Rivers Tell the Story"                                 ││
│  │ by Sarah K. · Clintonville · support · 210 words           ││
│  │ Submitted 5 hours ago                                       ││
│  │ ...                                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Queue tabs/filters:**

| Tab | Filter | Description |
|-----|--------|-------------|
| Needs Review | `moderation_status = 'needs_review'` | AI-flagged submissions requiring human decision |
| Pending | `moderation_status = 'pending'` | Awaiting AI moderation (should be transient) |
| Auto-Approved | `moderation_status = 'auto_approved'` | AI approved, shown for spot-checking |
| Approved | `moderation_status = 'approved'` | Human-approved |
| Rejected | `moderation_status = 'rejected'` | Rejected (review for false positives) |
| All | No filter | All submissions |

**Additional filters:** Position (support/oppose/undecided), date range, featured status, search by author name or content.

### 5.2 Moderation Actions

**Approve:**
- Sets `moderation_status = 'approved'`, `approved_at = now()`, `moderated_by = admin.id`
- Logs to `moderation_log` with `action = 'human_approve'`
- Triggers Inngest event: `voice/approved` → sends approval notification email to author
- Submission becomes visible on public `/voices` page

**Reject:**
- Sets `moderation_status = 'rejected'`, `rejected_at = now()`, `rejection_reason = [selected reason]`
- Logs to `moderation_log` with `action = 'human_reject'`
- Triggers Inngest event: `voice/rejected` → sends rejection notification email with reason and invitation to revise
- Rejection reasons (dropdown): Personal attack, Spam/commercial, Off-topic, Hate speech, AI-generated content, Other (free text)

**Edit (admin only):**
- Opens the submission body in an editable textarea
- Saves the edited version with a `moderation_log` entry: `action = 'human_edit'`
- Triggers notification email to author: "We made a minor edit to your submission for clarity."
- Original text preserved in `moderation_log.metadata.original_body`

**Feature/Unfeature:**
- Toggles `featured = true/false`
- Featured submissions appear at the top of the public `/voices` page
- Constraint: anonymous submissions cannot be featured (per Artifact 10 decisions)

**Override auto-approval:**
- If an auto-approved submission should not have been published, admin can reject it
- Logs `action = 'human_override'` to moderation_log
- Removes from public display immediately

### 5.3 Moderation Actions API

```typescript
// apps/web/app/api/admin/voices/[id]/moderate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/packages/core/auth/admin';
import { captureServerEvent } from '@/packages/core/analytics/posthog-server';

type ModerationAction = 'approve' | 'reject' | 'edit' | 'feature' | 'unfeature' | 'override_reject';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(['admin', 'moderator']);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { action, reason, editedBody } = body as {
    action: ModerationAction;
    reason?: string;
    editedBody?: string;
  };

  // Edit requires full admin
  if (action === 'edit') {
    const fullAdmin = await requireAdmin(['admin']);
    if (!fullAdmin) return NextResponse.json({ error: 'Edit requires admin role' }, { status: 403 });
  }

  const supabase = createServiceClient();

  // Get the current submission
  const { data: submission } = await supabase
    .from('voice_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  let updates: Record<string, any> = {};
  let logAction: string;
  let logMetadata: Record<string, any> = {};
  let inngestEvent: string | null = null;

  switch (action) {
    case 'approve':
      updates = {
        moderation_status: 'approved',
        approved_at: new Date().toISOString(),
        moderated_by: admin.id,
      };
      logAction = 'human_approve';
      inngestEvent = 'voice/approved';
      break;

    case 'reject':
      updates = {
        moderation_status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason ?? 'No reason provided',
        moderated_by: admin.id,
      };
      logAction = 'human_reject';
      logMetadata = { reason };
      inngestEvent = 'voice/rejected';
      break;

    case 'edit':
      if (!editedBody) {
        return NextResponse.json({ error: 'editedBody required' }, { status: 400 });
      }
      updates = { body: editedBody };
      logAction = 'human_edit';
      logMetadata = { original_body: submission.body };
      inngestEvent = 'voice/edited';
      break;

    case 'feature':
      // Cannot feature anonymous submissions
      if (submission.author_name.toLowerCase() === 'anonymous') {
        return NextResponse.json(
          { error: 'Anonymous submissions cannot be featured' },
          { status: 400 }
        );
      }
      updates = { featured: true };
      logAction = 'human_feature';
      break;

    case 'unfeature':
      updates = { featured: false };
      logAction = 'human_unfeature';
      break;

    case 'override_reject':
      updates = {
        moderation_status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason ?? 'Overridden by moderator',
        moderated_by: admin.id,
      };
      logAction = 'human_override';
      logMetadata = { previous_status: submission.moderation_status, reason };
      inngestEvent = 'voice/rejected';
      break;

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Update submission
  const { error: updateError } = await supabase
    .from('voice_submissions')
    .update(updates)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log moderation action
  await supabase.from('moderation_log').insert({
    voice_submission_id: id,
    action: logAction,
    actor_type: 'human',
    actor_id: admin.id,
    reasoning: reason,
    metadata: Object.keys(logMetadata).length > 0 ? logMetadata : null,
  });

  // Fire Inngest event for email notification
  if (inngestEvent) {
    // Import and call Inngest client
    const { inngest } = await import('@/inngest/client');
    await inngest.send({
      name: inngestEvent,
      data: {
        submissionId: id,
        authorEmail: submission.author_email,
        authorName: submission.author_name,
        action: logAction,
        reason,
      },
    });
  }

  // Track in PostHog
  captureServerEvent(admin.id, 'voice_moderation_complete', {
    decision: logAction,
    is_auto: false,
    submission_position: submission.position,
  });

  return NextResponse.json({ success: true, status: updates.moderation_status ?? submission.moderation_status });
}
```

### 5.4 Daily Moderation Digest

An Inngest cron function sends a daily email to admins summarizing pending moderation work.

```typescript
// apps/web/inngest/functions/moderation-digest.ts

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTransactionalEmail } from '@/packages/email/brevo';

export const moderationDigest = inngest.createFunction(
  { id: 'moderation-daily-digest', name: 'Daily Moderation Digest' },
  { cron: '0 9 * * *' }, // 9 AM ET daily
  async ({ step }) => {
    const stats = await step.run('fetch-pending-stats', async () => {
      const supabase = createServiceClient();

      const [pending, needsReview, autoApprovedToday] = await Promise.all([
        supabase
          .from('voice_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('moderation_status', 'pending'),
        supabase
          .from('voice_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('moderation_status', 'needs_review'),
        supabase
          .from('voice_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('moderation_status', 'auto_approved')
          .gte('submitted_at', new Date().toISOString().split('T')[0]),
      ]);

      return {
        pendingCount: pending.count ?? 0,
        needsReviewCount: needsReview.count ?? 0,
        autoApprovedTodayCount: autoApprovedToday.count ?? 0,
      };
    });

    // Only send if there are items to review
    if (stats.needsReviewCount === 0 && stats.pendingCount === 0) {
      return { skipped: true, reason: 'No pending items' };
    }

    // Get admin emails
    const admins = await step.run('fetch-admin-emails', async () => {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from('admin_users')
        .select('email')
        .in('role', ['admin', 'moderator']);
      return data?.map(a => a.email) ?? [];
    });

    await step.run('send-digest', async () => {
      for (const email of admins) {
        await sendTransactionalEmail({
          to: email,
          templateId: 'moderation-digest',
          params: {
            needsReviewCount: stats.needsReviewCount,
            pendingCount: stats.pendingCount,
            autoApprovedTodayCount: stats.autoApprovedTodayCount,
            dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/voices`,
          },
        });
      }
    });

    return { sent: true, recipientCount: admins.length, stats };
  }
);
```

---

## 6. Donation Tracking

### 6.1 Donation List Page

Route: `/admin/donations`
Roles: admin, viewer

Displays donations from ActBlue webhooks. Viewer role sees amounts and refcodes but not donor PII (name, email masked).

**Table columns:**

| Column | Sortable | Notes |
|--------|----------|-------|
| Date | Yes (default: newest) | `donated_at` |
| Amount | Yes | Formatted as currency (`$25.00`) |
| Donor | No | Name (masked for viewer: `John D.`) |
| Recurring | Yes | ✅ / one-time |
| Express Lane | No | ✅ / ❌ |
| Refcode | Yes | Traffic source attribution |
| Refcode2 | No | Secondary campaign code |

**Summary cards above the table:**

| Metric | Source |
|--------|--------|
| Total raised | `campaign_metrics.donation_total_cents / 100` |
| Donor count | `COUNT(DISTINCT donor_email) FROM donations` |
| Average donation | `avg_donation_cents() / 100` |
| Recurring % | `recurring_donation_pct()` |
| Largest single | `MAX(amount_cents) FROM donations` |

**Filters:** Date range, minimum/maximum amount, recurring only, refcode, search by donor name.

**Refcode performance table:** Below the donation list, a grouped view showing donations by refcode with total, count, and average — helping Tim understand which traffic sources drive donations.

```sql
-- Refcode performance view (used by donation dashboard)
CREATE OR REPLACE FUNCTION donation_refcode_performance()
RETURNS TABLE(
  refcode text,
  donation_count bigint,
  total_cents bigint,
  avg_cents numeric,
  recurring_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(refcode, 'direct') as refcode,
    COUNT(*) as donation_count,
    SUM(amount_cents) as total_cents,
    AVG(amount_cents)::numeric(10,2) as avg_cents,
    COUNT(*) FILTER (WHERE recurring) as recurring_count
  FROM donations
  GROUP BY refcode
  ORDER BY total_cents DESC;
$$;

GRANT EXECUTE ON FUNCTION donation_refcode_performance TO authenticated;
```

---

## 7. Volunteer Management

### 7.1 Volunteer List Page

Route: `/admin/volunteers`
Roles: admin, viewer

**Table columns:**

| Column | Sortable | Notes |
|--------|----------|-------|
| Name | Yes | First + last |
| Email | No | Masked for viewer |
| Phone | No | Masked for viewer (admin sees full) |
| Neighborhood | Yes | |
| Roles | No | Badge per role |
| Availability | No | Weekdays / Weekends / Evenings / Flexible |
| Status | Yes | Active / Inactive / Onboarded |
| Signed up | Yes (default: newest) | |

**Filters:** Role (multi-select), status, neighborhood, availability, date range, search.

**Actions (admin only):**

- **Update status:** Active → Onboarded (after completing onboarding), Active → Inactive, Inactive → Active
- **Add note:** Freeform note field per volunteer (stored in `notes` column or a separate `volunteer_notes` jsonb field)
- **Send email:** Opens a pre-filled mailto: link or triggers a Brevo transactional email to the volunteer
- **Export CSV:** Exports filtered volunteer list

**Volunteer role breakdown card:** Shows count of volunteers per role, helping Tim identify gaps (e.g., "Only 2 Neighborhood Captains — need to recruit more").

---

## 8. Email Subscriber Management

### 8.1 Subscriber List Page

Route: `/admin/email`
Roles: admin only (PII sensitivity)

**Summary cards:**

| Metric | Source |
|--------|--------|
| Total active subscribers | `campaign_metrics.email_subscriber_count` |
| By source | `GROUP BY source` breakdown |
| Brevo sync status | Last sync timestamp + any sync errors |

**Table columns:** Email, first name, source, status (active/unsubscribed/bounced), subscribed at, Brevo contact ID (link to Brevo dashboard).

**Actions:**

- **Sync with Brevo:** Triggers an Inngest function to reconcile local subscriber list with Brevo's contact list (handles bounces, unsubscribes processed in Brevo)
- **Export CSV**
- **View by source:** Pie chart showing subscriber sources (petition, standalone, volunteer, blog, footer, event)

The admin dashboard does not manage email campaigns — that happens in Brevo's dashboard. This page provides subscriber oversight and sync monitoring.

---

## 9. Referral Analytics

### 9.1 Referral Dashboard Page

Route: `/admin/referrals`
Roles: admin

**Summary cards:**

| Metric | Source |
|--------|--------|
| K-factor | `referral_k_factor()` |
| Total referral clicks | `campaign_metrics.referral_click_count` |
| Total referral conversions | `campaign_metrics.referral_conversion_count` |
| Conversion rate | conversions / clicks |

**Top referrers leaderboard:**

```sql
CREATE OR REPLACE FUNCTION top_referrers(limit_count integer DEFAULT 20)
RETURNS TABLE(
  signature_id uuid,
  first_name text,
  last_name_initial text,
  city text,
  referral_code text,
  referral_count bigint,
  total_clicks bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id as signature_id,
    s.first_name,
    LEFT(s.last_name, 1) as last_name_initial,
    s.city,
    s.referral_code,
    COUNT(DISTINCT r.id) FILTER (WHERE r.referred_by_code = s.referral_code) as referral_count,
    COALESCE(SUM(ref.clicks), 0) as total_clicks
  FROM signatures s
  LEFT JOIN signatures r ON r.referred_by_code = s.referral_code
  LEFT JOIN referrals ref ON ref.referral_code = s.referral_code
  WHERE s.referral_code IS NOT NULL
    AND s.deleted_at IS NULL
  GROUP BY s.id, s.first_name, s.last_name, s.city, s.referral_code
  HAVING COUNT(DISTINCT r.id) FILTER (WHERE r.referred_by_code = s.referral_code) > 0
  ORDER BY referral_count DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION top_referrers TO authenticated;
```

**Platform breakdown:** Bar chart showing clicks and conversions by platform (Facebook, Twitter, WhatsApp, Email, Copy Link).

---

## 10. Campaign Settings

### 10.1 Settings Page

Route: `/admin/settings`
Roles: admin only

**Configurable settings (stored in a `campaign_settings` table):**

```sql
CREATE TABLE campaign_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_by  uuid REFERENCES admin_users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read settings"
  ON campaign_settings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update settings"
  ON campaign_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'admin'));

-- Seed default settings
INSERT INTO campaign_settings (key, value) VALUES
  ('signature_goal', '22000'::jsonb),
  ('milestone_thresholds', '[1000, 2500, 5000, 10000, 15000, 22000]'::jsonb),
  ('site_announcement', 'null'::jsonb),
  ('moderation_auto_approve_threshold', '0.85'::jsonb),
  ('moderation_auto_reject_threshold', '0.15'::jsonb),
  ('maintenance_mode', 'false'::jsonb);
```

**Settings UI sections:**

1. **Signature Goal:** Current goal number, editable. Changing it updates the progress bar across the site.
2. **Milestone Thresholds:** JSON array of milestone numbers. When signature count crosses one, the milestone celebration email fires.
3. **Site Announcement Banner:** Optional text shown across the top of all public pages. Useful for events, press mentions, milestone celebrations.
4. **AI Moderation Thresholds:** Auto-approve confidence threshold (default 0.85) and auto-reject threshold (default 0.15). Adjustable as we learn the AI moderation accuracy.
5. **Maintenance Mode:** Toggle to show a maintenance page on the public site. Admin dashboard remains accessible.

### 10.2 Admin Invite Flow

Route: `/admin/settings` → Invite section
Roles: admin only

```
┌──────────────────────────────────────────────────────────────┐
│  Admin Team Management                                        │
│                                                              │
│  Current admins:                                             │
│  • tim@timfulton.com — admin — Active since Apr 10           │
│                                                              │
│  [Invite New Admin]                                          │
│  Email: [________________]  Role: [admin ▾]  [Send Invite]   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Invite flow:**

1. Admin enters email + role
2. API creates a Supabase Auth user with a random password via `supabase.auth.admin.createUser()`
3. Inserts row into `admin_users` table with the new user ID and role
4. Sends an invite email via Supabase Auth's `inviteUserByEmail()` — this sends a magic link for initial password setup
5. New admin clicks the link, sets their password, logs in

```typescript
// apps/web/app/api/admin/invite/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireFullAdmin } from '@/packages/core/auth/admin';

export async function POST(request: NextRequest) {
  const admin = await requireFullAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { email, role } = await request.json();

  if (!email || !role || !['admin', 'moderator', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid email or role' }, { status: 400 });
  }

  // Use the service role client (admin API requires service_role key)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create auth user and send invite email
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { admin_role: role },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/login`,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Insert admin_users row
  const { error: insertError } = await supabaseAdmin
    .from('admin_users')
    .insert({
      id: authUser.user.id,
      email,
      role,
    });

  if (insertError) {
    // Rollback: delete the auth user if admin_users insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: authUser.user.id });
}
```

---

## 11. Admin Login Page

### 11.1 Login Page

Route: `/admin/login` (outside the auth-gated admin layout)

Minimal, branded login page. No link from the public site — admin access is by direct URL only.

```typescript
// apps/web/app/(admin)/admin/login/page.tsx

'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }

    // Redirect to the originally requested page, or dashboard home
    const redirect = searchParams.get('redirect') ?? '/admin';
    router.push(redirect);
    router.refresh(); // Refresh to pick up the new session in server components
  };

  const unauthorizedError = searchParams.get('error') === 'unauthorized';

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1>Confluence Ohio Admin</h1>
        {unauthorizedError && (
          <div className="alert alert-error" role="alert">
            Your account does not have admin access.
          </div>
        )}
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 11.2 MFA Enrollment Page

Route: `/admin/mfa/enroll` — shown on first login before TOTP is set up.

```typescript
// apps/web/app/(admin)/admin/mfa/enroll/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function MFAEnrollPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function enroll() {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Confluence Ohio Admin',
      });
      if (error) {
        setError(error.message);
        return;
      }
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    }
    enroll();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
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
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1>Set Up Two-Factor Authentication</h1>
        <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)</p>

        {qrCode && (
          <div className="mfa-qr">
            <img src={qrCode} alt="TOTP QR Code" width={200} height={200} />
            <details>
              <summary>Can't scan? Enter this code manually</summary>
              <code className="mfa-secret">{secret}</code>
            </details>
          </div>
        )}

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleVerify}>
          <label htmlFor="code">Enter the 6-digit code from your app</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={verifyCode}
            onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
            autoComplete="one-time-code"
            required
            autoFocus
          />
          <button type="submit" disabled={loading || verifyCode.length !== 6}>
            {loading ? 'Verifying...' : 'Verify and Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 11.3 MFA Verify Page

Route: `/admin/mfa/verify` — shown on subsequent logins when TOTP is already enrolled.

```typescript
// apps/web/app/(admin)/admin/mfa/verify/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MFAVerifyPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getFactors() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data.totp.length) {
        router.push('/admin/mfa/enroll');
        return;
      }
      setFactorId(data.totp[0].id);
    }
    getFactors();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
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
      code,
    });

    if (verifyError) {
      setError('Invalid code. Please try again.');
      setCode('');
      setLoading(false);
      return;
    }

    const redirect = searchParams.get('redirect') ?? '/admin';
    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1>Two-Factor Authentication</h1>
        <p>Enter the 6-digit code from your authenticator app.</p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleVerify}>
          <label htmlFor="code">Authentication code</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            autoComplete="one-time-code"
            required
            autoFocus
          />
          <button type="submit" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 11.4 Session Management

- **Session duration:** Supabase Auth default (1 hour access token, 7-day refresh token)
- **Idle timeout:** Not enforced at launch. Phase 2: add client-side idle detection that clears the session after 30 minutes of inactivity.
- **Logout:** Admin header includes a "Sign out" button that calls `supabase.auth.signOut()` and redirects to `/admin/login`.

---

## 12. Component Library

All admin UI components use a consistent design system. At launch, the admin uses **minimal custom CSS** with utility classes — not a full component library like shadcn/ui (which is for the public site). The admin dashboard priorities are function over aesthetics.

**Core admin components to build:**

| Component | Description |
|-----------|-------------|
| `AdminSidebar` | Persistent nav with role-gated items + badge counts |
| `AdminHeader` | Top bar with admin name, role badge, sign out |
| `MetricCard` | Numeric metric with label, trend indicator, optional progress bar |
| `DataTable` | Sortable, filterable, paginated table with column configuration |
| `FilterBar` | Composable filter controls (dropdowns, date pickers, search) |
| `StatusBadge` | Colored badge for verification/moderation status |
| `ActionButton` | Confirm-on-click action button with loading state |
| `ModerationCard` | Expandable card for voice moderation queue |
| `ActivityFeed` | Chronological list of recent events |
| `EmptyState` | Friendly message + CTA when a table/queue is empty |

**Accessibility requirements (same WCAG 2.1 AA standards as public site):**
- All form inputs have visible labels
- Status badges use icons + text, not color alone
- Keyboard navigation for all table actions
- Focus management when moderation actions complete (return focus to next item in queue)
- `aria-live` regions for real-time counter updates
- Skip-to-content link in admin layout

---

## 13. Admin Analytics Events

The admin dashboard fires its own PostHog events for understanding how admins use the tools:

| Event | Trigger | Properties |
|-------|---------|------------|
| `admin_dashboard_viewed` | Dashboard home loaded | `admin_role` |
| `admin_signatures_viewed` | Signatures list loaded | `filter_count`, `total_results` |
| `admin_signature_action` | Flag/reject/restore | `action`, `signature_id` |
| `admin_signatures_exported` | CSV export | `filter_count`, `total_exported` |
| `admin_voice_moderated` | Approve/reject/edit/feature | `action`, `submission_id`, `position` |
| `admin_voice_queue_time` | Time from queue load to first action | `seconds` |
| `admin_donation_viewed` | Donation list loaded | — |
| `admin_volunteer_updated` | Status/note change | `action`, `volunteer_id` |
| `admin_setting_changed` | Any setting updated | `setting_key`, `old_value`, `new_value` |
| `admin_invite_sent` | Admin invite sent | `invited_role` |

---

## 14. Migration: New Tables and Functions

All new SQL from this artifact, consolidated into a single migration file:

**Migration file:** `packages/db/migrations/007_admin_dashboard.sql`

Contains:
1. `admin_role` enum expansion (add `moderator`, `viewer`)
2. `campaign_settings` table
3. `custom_access_token_hook` function
4. Updated RLS policies (role-aware)
5. Dashboard aggregate functions (`avg_donation_cents`, `recurring_donation_pct`, `top_referral_platform`, `referral_k_factor`, `recent_admin_activity`, `top_referrers`, `donation_refcode_performance`, `adjust_signature_count`)
6. Grants for functions and hook

**Note:** This migration depends on all tables from Artifact 05's migration (`001_initial_schema.sql` through `006_*`). It should be numbered sequentially after the last existing migration.

---

## 15. Environment Variables

New env vars required for admin functionality:

```bash
# .env.local additions for admin dashboard

# Supabase Service Role Key (already exists — used by admin API routes)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Site URL (used for invite redirects and digest email links)
NEXT_PUBLIC_SITE_URL=https://confluenceohio.org

# No new third-party services required — admin uses existing Supabase Auth,
# Brevo (for digest emails), PostHog (for admin analytics), and Inngest (for cron jobs).
```

---

## 16. Claude Code Handoff

### Handoff Prompt 15-A: Admin Authentication and Middleware

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

### Handoff Prompt 15-B: Dashboard Home and Metrics

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

### Handoff Prompt 15-C: Signatures Management

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

### Handoff Prompt 15-D: Voice Moderation Queue

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

### Handoff Prompt 15-E: Donations, Volunteers, Email, Referrals, Settings

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
StatusBadge components created in Prompt 15-C.
Track admin analytics events per the event taxonomy in §13.
```

### Handoff Prompt 15-F: Admin Migration File

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

## 17. Pre-Implementation Checklist

Before starting Claude Code implementation:

- [x] Tim confirms admin routing strategy → Route group confirmed
- [x] Tim confirms role expansion approach → Deferred approach confirmed
- [x] Tim confirms MFA requirement → MFA required at launch
- [x] Tim confirms no admin email domain restriction
- [x] Tim confirms blog stays MDX-in-Git (no admin CMS)
- [ ] Enable Custom Access Token Hook in Supabase Dashboard: Authentication → Hooks → Enable `custom_access_token_hook`
- [ ] Enable MFA in Supabase Dashboard: Authentication → Multi-Factor Auth → Enable TOTP
- [ ] Create initial admin user: Insert Tim's Supabase Auth user ID into `admin_users` with `role = 'admin'`
- [ ] Supabase Realtime enabled for `campaign_metrics` table (should already be set from Artifact 06)
- [ ] Verify Inngest cron support is available on current plan (for daily moderation digest)
