-- =============================================================================
-- Migration 00012: Custom Access Token Hook
-- =============================================================================
-- Supabase Auth Hook that injects admin_role into JWT claims before issuance.
-- This avoids a database query on every authenticated request — the role is
-- embedded in the JWT and checked by middleware.
--
-- After applying this migration, enable the hook in the Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token → Enable
--   → Select: public.custom_access_token_hook
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom Access Token Hook function
-- ---------------------------------------------------------------------------
-- Called by Supabase Auth before every JWT issuance. Checks admin_users and
-- injects the role into app_metadata.admin_role.

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
    -- User is not an admin — ensure no stale admin_role claim persists
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

-- ---------------------------------------------------------------------------
-- 2. Grant permissions to supabase_auth_admin
-- ---------------------------------------------------------------------------
-- The auth hook runs as supabase_auth_admin, which needs access to:
--   - The public schema (to find the function)
--   - The function itself (to execute it)
--   - The admin_users table (to look up roles)

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.admin_users TO supabase_auth_admin;

-- Revoke from public to prevent non-admin callers
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;
