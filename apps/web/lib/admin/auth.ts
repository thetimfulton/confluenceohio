import type { AdminRole, AdminUser } from '@confluenceohio/db/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const VALID_ROLES: AdminRole[] = ['admin', 'moderator', 'viewer'];

/**
 * Verify the current user is an admin with one of the allowed roles.
 * For use in Server Components and Server Actions (reads session from cookies).
 *
 * Uses getUser() (not getSession()) for JWT validation security.
 * Fast path: checks admin_role from JWT app_metadata (injected by Custom
 * Access Token Hook — no DB query needed).
 * Fallback: checks admin_users table via service client (defense-in-depth).
 *
 * Returns the admin user record or null if unauthorized.
 */
export async function requireAdmin(
  allowedRoles: AdminRole[] = ['admin', 'moderator', 'viewer'],
): Promise<AdminUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Fast path: check JWT claim (no DB query)
    const jwtRole = user.app_metadata?.admin_role as AdminRole | undefined;
    if (jwtRole && VALID_ROLES.includes(jwtRole) && allowedRoles.includes(jwtRole)) {
      return {
        id: user.id,
        email: user.email!,
        role: jwtRole,
        created_at: '',
        updated_at: '',
      };
    }

    // Fallback: check admin_users table via service client (defense-in-depth)
    const service = createServiceClient();
    const { data: adminUser, error: adminError } = await service
      .from('admin_users')
      .select('id, email, role, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser) return null;

    if (!allowedRoles.includes(adminUser.role as AdminRole)) return null;

    return adminUser as AdminUser;
  } catch {
    return null;
  }
}

/**
 * Convenience: require the `admin` role specifically (full access).
 */
export async function requireFullAdmin(): Promise<AdminUser | null> {
  return requireAdmin(['admin']);
}
