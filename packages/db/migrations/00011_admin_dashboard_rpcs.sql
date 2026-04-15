-- Migration 00011: Admin dashboard RPC functions
-- Supporting functions for the admin dashboard metrics grid.
-- All SECURITY DEFINER + STABLE: read-only, execute with owner privileges.

-- Average donation amount in cents
CREATE OR REPLACE FUNCTION get_average_donation()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(AVG(amount_cents)::integer, 0)
  FROM donations;
$$;

-- Recurring donation percentage
CREATE OR REPLACE FUNCTION get_recurring_donation_pct()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    COUNT(*) FILTER (WHERE recurring) * 100.0 / NULLIF(COUNT(*), 0),
    0
  )
  FROM donations;
$$;

-- Top N referrers by conversion count
CREATE OR REPLACE FUNCTION get_top_referrers(p_limit integer DEFAULT 10)
RETURNS TABLE (
  first_name text,
  last_initial text,
  referral_code text,
  conversion_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.first_name,
    LEFT(s.last_name, 1) AS last_initial,
    s.referral_code,
    COUNT(r.id) AS conversion_count
  FROM signatures s
  JOIN signatures r ON r.referred_by_id = s.id AND r.deleted_at IS NULL
  WHERE s.deleted_at IS NULL
    AND s.referral_code IS NOT NULL
  GROUP BY s.id, s.first_name, s.last_name, s.referral_code
  ORDER BY conversion_count DESC
  LIMIT p_limit;
$$;

-- Top referral platform by conversions
CREATE OR REPLACE FUNCTION get_top_referral_platform()
RETURNS TABLE (
  platform referral_platform,
  total_conversions bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT platform, SUM(conversions) AS total_conversions
  FROM referrals
  GROUP BY platform
  ORDER BY total_conversions DESC
  LIMIT 1;
$$;
