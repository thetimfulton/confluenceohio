-- Migration 00013: Dashboard aggregate functions
-- Adds missing RPC functions for the admin dashboard (Artifact 15, Handoff B).
-- Also creates spec-named aliases for existing functions from migration 00011.

-----------------------------------------------------------------------
-- 1. avg_donation_cents() — alias for get_average_donation()
-----------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION avg_donation_cents TO authenticated;

-----------------------------------------------------------------------
-- 2. recurring_donation_pct() — alias for get_recurring_donation_pct()
-----------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION recurring_donation_pct TO authenticated;

-----------------------------------------------------------------------
-- 3. top_referral_platform() — alias for get_top_referral_platform()
-----------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION top_referral_platform TO authenticated;

-----------------------------------------------------------------------
-- 4. referral_k_factor() — NEW
--    k = (shares / signers) × (conversions / clicks)
-----------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION referral_k_factor TO authenticated;

-----------------------------------------------------------------------
-- 5. recent_admin_activity(limit_count) — NEW
--    Union across signatures, voice_submissions, donations, volunteers
--    for the dashboard activity feed.
-----------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION recent_admin_activity TO authenticated;

-----------------------------------------------------------------------
-- 6. donation_refcode_performance() — NEW
--    Grouped donation stats by refcode for the donations dashboard.
-----------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION donation_refcode_performance TO authenticated;

-----------------------------------------------------------------------
-- 7. adjust_signature_count(adjustment) — NEW
--    Manual adjustment for signature count (used by admin signature
--    management when rejecting or reversing signatures).
-----------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION adjust_signature_count TO authenticated;
