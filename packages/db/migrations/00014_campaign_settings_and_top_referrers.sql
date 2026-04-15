-- Migration 00014: campaign_settings table + top_referrers() RPC
-- Supports Artifact 15 §10 (Settings) and §9 (Referrals dashboard).

-----------------------------------------------------------------------
-- 1. campaign_settings table
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_by  uuid REFERENCES admin_users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;

-- Admin can read settings
CREATE POLICY "admin_read_settings"
  ON campaign_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can update/insert settings
CREATE POLICY "admin_write_settings"
  ON campaign_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-----------------------------------------------------------------------
-- 2. Seed default campaign settings
-----------------------------------------------------------------------
INSERT INTO campaign_settings (key, value) VALUES
  ('signature_goal', '22000'::jsonb),
  ('milestone_thresholds', '[1000, 2500, 5000, 10000, 15000, 22000]'::jsonb),
  ('site_announcement', 'null'::jsonb),
  ('moderation_auto_approve_threshold', '0.85'::jsonb),
  ('moderation_auto_reject_threshold', '0.15'::jsonb),
  ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-----------------------------------------------------------------------
-- 3. top_referrers() — spec-named function (Artifact 15 §9)
--    Returns top referrers with click totals from the referrals table.
-----------------------------------------------------------------------
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
    COUNT(DISTINCT r2.id) AS referral_count,
    COALESCE(SUM(ref.clicks), 0) AS total_clicks
  FROM signatures s
  LEFT JOIN signatures r2
    ON r2.referred_by_id = s.id AND r2.deleted_at IS NULL
  LEFT JOIN referrals ref
    ON ref.referral_code = s.referral_code
  WHERE s.referral_code IS NOT NULL
    AND s.deleted_at IS NULL
  GROUP BY s.id, s.first_name, s.last_name, s.city, s.referral_code
  HAVING COUNT(DISTINCT r2.id) > 0
  ORDER BY referral_count DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION top_referrers TO authenticated;
