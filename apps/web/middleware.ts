import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ---------------------------------------------------------------------------
// Referral code pattern — CONF-XXXX with reduced alphabet (Artifact 11 §1.1)
// ---------------------------------------------------------------------------
const REF_CODE_REGEX = /^CONF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // -------------------------------------------------------------------------
  // Referral tracking — runs on ALL pages (Artifact 11 §1.4)
  //
  // When a ?ref= param is present:
  //   1. Store in 'ref_code' cookie (7-day expiry) for petition form pre-fill
  //   2. Fire-and-forget click tracking POST (non-blocking)
  // -------------------------------------------------------------------------
  let response: NextResponse | null = null;
  const refParam = searchParams.get('ref');

  if (refParam && REF_CODE_REGEX.test(refParam)) {
    response = NextResponse.next();

    // Set ref_code cookie — 7 day expiry, httpOnly, sameSite=lax
    response.cookies.set('ref_code', refParam, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    // Fire-and-forget click tracking (Artifact 11 §1.4)
    // Determine platform from utm_source for attribution
    const utmSource = searchParams.get('utm_source') || 'other';

    const trackUrl = new URL('/api/referral/click', request.url);
    trackUrl.searchParams.set('ref', refParam);
    trackUrl.searchParams.set('platform', utmSource);

    try {
      fetch(trackUrl.toString(), { method: 'POST' });
    } catch {
      // Silently fail — click tracking is non-critical
    }
  }

  // -------------------------------------------------------------------------
  // Admin route protection (Artifact 15 §2.4)
  //
  // 1. Validate JWT via getUser() (not getSession())
  // 2. Check admin_role claim injected by Custom Access Token Hook
  // 3. Enforce MFA (AAL2) for all admin routes except /admin/mfa/*
  // -------------------------------------------------------------------------
  if (!pathname.startsWith('/admin')) {
    return response ?? NextResponse.next();
  }
  if (pathname === '/admin/login') {
    return response ?? NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return redirectToLogin(request);
  }

  // Create a response we can modify (for cookie refresh)
  // If we already have a response from referral tracking, use it
  let adminResponse = response ?? NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        adminResponse = NextResponse.next({ request });
        // Preserve ref_code cookie if it was set
        if (refParam && REF_CODE_REGEX.test(refParam)) {
          adminResponse.cookies.set('ref_code', refParam, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60,
          });
        }
        for (const { name, value, options } of cookiesToSet) {
          adminResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Validate the user's JWT (triggers token refresh if needed)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return redirectToLogin(request);
  }

  // Check admin_role from JWT claims (injected by Custom Access Token Hook)
  const adminRole = user.app_metadata?.admin_role;
  if (!adminRole || !['admin', 'moderator', 'viewer'].includes(adminRole)) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  // Enforce MFA (AAL2) for all admin routes except /admin/mfa/*
  // MFA pages must be accessible at AAL1 so the user can enroll or verify
  if (!pathname.startsWith('/admin/mfa')) {
    const { data: mfaData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (mfaData?.currentLevel !== 'aal2') {
      if (mfaData?.currentLevel === 'aal1' && mfaData?.nextLevel === 'aal2') {
        // MFA enrolled but not verified this session — challenge
        const mfaUrl = new URL('/admin/mfa/verify', request.url);
        mfaUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(mfaUrl);
      } else {
        // MFA not yet enrolled — send to enrollment
        const enrollUrl = new URL('/admin/mfa/enroll', request.url);
        return NextResponse.redirect(enrollUrl);
      }
    }
  }

  // Attach role to response header for downstream use
  adminResponse.headers.set('x-admin-role', adminRole);
  return adminResponse;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match all pages for referral tracking, plus admin routes for auth
  // Exclude static files and API routes (they don't need referral cookies)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
