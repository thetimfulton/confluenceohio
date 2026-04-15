import { NextRequest } from 'next/server';
import type { AdminRole, AdminUser } from '@confluenceohio/db/types';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Verify that the request comes from an admin with one of the allowed roles.
 * For use in API Route Handlers (reads token from Authorization header or cookies).
 *
 * Returns the admin user record or null if unauthorized.
 */
export async function requireAdminFromRequest(
  request: NextRequest,
  allowedRoles: AdminRole[] = ['admin', 'moderator', 'viewer'],
): Promise<AdminUser | null> {
  try {
    const service = createServiceClient();

    // Try Authorization header first (Bearer token)
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const {
        data: { user },
        error,
      } = await service.auth.getUser(token);

      if (!error && user) {
        userId = user.id;
      }
    }

    // Fall back to cookie-based session
    if (!userId) {
      // Extract the Supabase access token from cookies
      const accessToken =
        request.cookies.get('sb-access-token')?.value ||
        findSupabaseAccessToken(request);

      if (accessToken) {
        const {
          data: { user },
          error,
        } = await service.auth.getUser(accessToken);

        if (!error && user) {
          userId = user.id;
        }
      }
    }

    if (!userId) return null;

    // Check admin_users table
    const { data: adminUser, error: adminError } = await service
      .from('admin_users')
      .select('id, email, role, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (adminError || !adminUser) return null;

    if (!allowedRoles.includes(adminUser.role as AdminRole)) return null;

    return adminUser as AdminUser;
  } catch {
    return null;
  }
}

/**
 * Scan cookies for the Supabase access token.
 * Supabase stores session in a cookie named `sb-<project-ref>-auth-token`.
 */
function findSupabaseAccessToken(request: NextRequest): string | null {
  for (const [name, cookie] of request.cookies) {
    if (name.includes('-auth-token')) {
      try {
        // The cookie value is a JSON array: [access_token, refresh_token]
        // or a JSON object with access_token key
        const parsed = JSON.parse(cookie.value) as
          | string[]
          | { access_token?: string };
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
          return parsed[0];
        }
        if (
          typeof parsed === 'object' &&
          'access_token' in parsed &&
          typeof parsed.access_token === 'string'
        ) {
          return parsed.access_token;
        }
      } catch {
        // Not a JSON cookie, try raw value
        if (cookie.value.startsWith('eyJ')) {
          return cookie.value;
        }
      }
    }
  }
  return null;
}
