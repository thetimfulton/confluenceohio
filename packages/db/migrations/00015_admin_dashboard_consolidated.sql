-- =============================================================================
-- Migration 00015: Admin Dashboard — Consolidated Role-Based Access & Functions
-- =============================================================================
-- This migration consolidates and hardens all admin dashboard SQL from
-- Artifact 15. It replaces the simpler RLS policies from migration 00005
-- with role-aware policies (admin, moderator, viewer) and ensures all
-- dashboard aggregate functions match the spec exactly.
--
-- Dependencies:
--   00001 — enum types (admin_role, etc.)
--   00002 — all core tables
--   00005 — original RLS policies (replaced here)
--   00009 — admin_role enum expansion (moderator, viewer)
--   00012 — custom_access_token_hook (refreshed here)
--   00013 — dashboard aggregate functions (refreshed here)
--   00014 — campaign_settings table + top_referrers (refreshed here)
--
-- Idempotency: DROP POLICY IF EXISTS before CREATE POLICY; CREATE OR REPLACE
-- for functions; IF NOT EXISTS for tables and enum values; ON CONFLICT for
-- seed data.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ENUM EXPANSION (idempotent — no-op if values already exist from 00009)
-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction in some PG versions.
-- Apply this section separately if needed:
--   ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'moderator';
--   ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'viewer';
-- These values were already added by migration 00009, so this migration
-- assumes they exist and proceeds with the DDL that uses them.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. CAMPAIGN SETTINGS TABLE (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS campaign_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_by  uuid REFERENCES admin_users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ROLE-BASED RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════
-- Drop all original policies from 00005 and 00009 that lack role granularity,
-- then recreate with proper admin/moderator/viewer distinctions.

-- ─── 3a. signatures: admin + viewer can read ────────────────────────────────
DROP POLICY IF EXISTS "Admins can read all signatures" ON signatures;
DROP POLICY IF EXISTS "Admin and viewer can read signatures" ON signatures;

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

-- ─── 3b. voice_submissions: admin + moderator read all; update ──────────────
-- Keep the public "Anyone can read approved voices" policy from 00005 intact.
DROP POLICY IF EXISTS "Admins can read all voices" ON voice_submissions;
DROP POLICY IF EXISTS "Admin and moderator can read all voices" ON voice_submissions;
DROP POLICY IF EXISTS "Admins can update voices" ON voice_submissions;
DROP POLICY IF EXISTS "Admin and moderator can update voices" ON voice_submissions;

CREATE POLICY "Admin and moderator can read all voices"
  ON voice_submissions FOR SELECT
  TO authenticated
  USING (
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

-- ─── 3c. donations: admin + viewer can read ─────────────────────────────────
DROP POLICY IF EXISTS "Admins can read donations" ON donations;
DROP POLICY IF EXISTS "Admin and viewer can read donations" ON donations;

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

-- ─── 3d. volunteers: admin + viewer read; admin update ──────────────────────
DROP POLICY IF EXISTS "Admins can read volunteers" ON volunteers;
DROP POLICY IF EXISTS "Admin and viewer can read volunteers" ON volunteers;
DROP POLICY IF EXISTS "Admin can update volunteers" ON volunteers;

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

-- ─── 3e. email_subscribers: admin only ──────────────────────────────────────
DROP POLICY IF EXISTS "Admins can read subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Admin can read email subscribers" ON email_subscribers;

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

-- ─── 3f. moderation_log: admin + moderator can read ─────────────────────────
DROP POLICY IF EXISTS "Admins can read moderation log" ON moderation_log;
DROP POLICY IF EXISTS "Admin and moderator can read moderation log" ON moderation_log;

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

-- ─── 3g. admin_users: admin can read (for invite management) ────────────────
DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admin can read admin users" ON admin_users;

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

-- ─── 3h. campaign_settings: admin read + write ─────────────────────────────
DROP POLICY IF EXISTS "admin_read_settings" ON campaign_settings;
DROP POLICY IF EXISTS "admin_write_settings" ON campaign_settings;
DROP POLICY IF EXISTS "Admin can read settings" ON campaign_settings;
DROP POLICY IF EXISTS "Admin can update settings" ON campaign_settings;

CREATE POLICY "Admin can read settings"
  ON campaign_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update settings"
  ON campaign_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. CUSTOM ACCESS TOKEN HOOK (refresh)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Supabase Auth calls this before every JWT issuance. It injects admin_role
-- into app_metadata so middleware can check roles without a DB query.
--
-- After applying, enable in Supabase Dashboard:
--   Authentication > Hooks > Custom Access Token > Enable > public.custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  admin_role_value text;
BEGIN
  claims := event->'claims';

  SELECT role::text INTO admin_role_value
  FROM public.admin_users
  WHERE id = (event->>'user_id')::uuid;

  IF admin_role_value IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata, admin_role}',
      to_jsonb(admin_role_value)
    );
  ELSE
    claims := jsonb_set(
      claims,
      '{app_metadata, admin_role}',
      'null'::jsonb
    );
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant to supabase_auth_admin (the role that executes auth hooks)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.admin_users TO supabase_auth_admin;

-- Revoke from everyone else
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. DASHBOARD AGGREGATE FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 5a. avg_donation_cents() ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION avg_donation_cents()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(AVG(amount_cents)::integer, 0)
  FROM donations;
$$;

-- ─── 5b. recurring_donation_pct() ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION recurring_donation_pct()
RETURNS numeric(5,2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    COUNT(*) FILTER (WHERE recurring) * 100.0 / NULLIF(COUNT(*), 0),
    0
  )::numeric(5,2)
  FROM donations;
$$;

-- ─── 5c. top_referral_platform() ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION top_referral_platform()
RETURNS TABLE(platform referral_platform, total_conversions bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT platform, SUM(conversions) AS total_conversions
  FROM referrals
  GROUP BY platform
  ORDER BY total_conversions DESC
  LIMIT 1;
$$;

-- ─── 5d. referral_k_factor() ────────────────────────────────────────────────
-- k = (shares / signers) x (conversions / clicks)
CREATE OR REPLACE FUNCTION referral_k_factor()
RETURNS numeric(5,3)
LANGUAGE sql
STABLE
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

-- ─── 5e. recent_admin_activity(limit_count) ─────────────────────────────────
-- Union across signatures, voice_submissions, donations, volunteers
CREATE OR REPLACE FUNCTION recent_admin_activity(limit_count integer DEFAULT 20)
RETURNS TABLE(
  activity_type text,
  description text,
  detail jsonb,
  occurred_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  (
    SELECT
      'signature' AS activity_type,
      first_name || ' ' || LEFT(last_name, 1) || '. signed (#' || signature_number || ')' AS description,
      jsonb_build_object('city', city, 'verification_status', verification_status) AS detail,
      signed_at AS occurred_at
    FROM signatures
    WHERE deleted_at IS NULL
    ORDER BY signed_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    SELECT
      'voice' AS activity_type,
      'New voice from ' || COALESCE(author_neighborhood, 'Columbus') || ' (' || position::text || ')' AS description,
      jsonb_build_object('title', title, 'status', moderation_status) AS detail,
      submitted_at AS occurred_at
    FROM voice_submissions
    ORDER BY submitted_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    SELECT
      'donation' AS activity_type,
      '$' || (amount_cents / 100)::text || ' donation' || CASE WHEN recurring THEN ' (recurring)' ELSE '' END AS description,
      jsonb_build_object('refcode', refcode, 'express_lane', express_lane) AS detail,
      donated_at AS occurred_at
    FROM donations
    ORDER BY donated_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    SELECT
      'volunteer' AS activity_type,
      first_name || ' ' || LEFT(last_name, 1) || '. signed up to volunteer' AS description,
      jsonb_build_object('roles', roles, 'neighborhood', neighborhood) AS detail,
      signed_up_at AS occurred_at
    FROM volunteers
    ORDER BY signed_up_at DESC
    LIMIT limit_count
  )
  ORDER BY occurred_at DESC
  LIMIT limit_count;
$$;

-- ─── 5f. top_referrers(limit_count) ─────────────────────────────────────────
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id AS signature_id,
    s.first_name,
    LEFT(s.last_name, 1) AS last_name_initial,
    s.city,
    s.referral_code,
    COUNT(DISTINCT r.id) AS referral_count,
    COALESCE(SUM(ref.clicks), 0) AS total_clicks
  FROM signatures s
  LEFT JOIN signatures r
    ON r.referred_by_code = s.referral_code AND r.deleted_at IS NULL
  LEFT JOIN referrals ref
    ON ref.referral_code = s.referral_code
  WHERE s.referral_code IS NOT NULL
    AND s.deleted_at IS NULL
  GROUP BY s.id, s.first_name, s.last_name, s.city, s.referral_code
  HAVING COUNT(DISTINCT r.id) > 0
  ORDER BY referral_count DESC
  LIMIT limit_count;
$$;

-- ─── 5g. donation_refcode_performance() ─────────────────────────────────────
CREATE OR REPLACE FUNCTION donation_refcode_performance()
RETURNS TABLE(
  refcode text,
  donation_count bigint,
  total_cents bigint,
  avg_cents numeric,
  recurring_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(refcode, 'direct') AS refcode,
    COUNT(*) AS donation_count,
    SUM(amount_cents) AS total_cents,
    AVG(amount_cents)::numeric(10,2) AS avg_cents,
    COUNT(*) FILTER (WHERE recurring) AS recurring_count
  FROM donations
  GROUP BY refcode
  ORDER BY total_cents DESC;
$$;

-- ─── 5h. adjust_signature_count(adjustment) ─────────────────────────────────
-- Manual signature count correction (admin signature management)
CREATE OR REPLACE FUNCTION adjust_signature_count(adjustment integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE campaign_metrics
  SET value = GREATEST(value + adjustment, 0), recorded_at = now()
  WHERE metric = 'signature_count';
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. GRANT EXECUTE ON ALL DASHBOARD FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION avg_donation_cents TO authenticated;
GRANT EXECUTE ON FUNCTION recurring_donation_pct TO authenticated;
GRANT EXECUTE ON FUNCTION top_referral_platform TO authenticated;
GRANT EXECUTE ON FUNCTION referral_k_factor TO authenticated;
GRANT EXECUTE ON FUNCTION recent_admin_activity TO authenticated;
GRANT EXECUTE ON FUNCTION top_referrers TO authenticated;
GRANT EXECUTE ON FUNCTION donation_refcode_performance TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_signature_count TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. SEED CAMPAIGN SETTINGS (idempotent — ON CONFLICT DO NOTHING)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO campaign_settings (key, value) VALUES
  ('signature_goal',                    '22000'::jsonb),
  ('milestone_thresholds',             '[1000, 2500, 5000, 10000, 15000, 22000]'::jsonb),
  ('site_announcement',                'null'::jsonb),
  ('moderation_auto_approve_threshold','0.85'::jsonb),
  ('moderation_auto_reject_threshold', '0.15'::jsonb),
  ('maintenance_mode',                 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
