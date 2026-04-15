-- Migration 00006: Create utility functions and seed campaign_metrics
-- Includes next_signature_number() for atomic sequential numbering
-- and get_recent_signers() for the public signature ticker.

-- Atomic signature number generator
CREATE OR REPLACE FUNCTION next_signature_number()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  num integer;
BEGIN
  UPDATE signature_counter
  SET next_number = next_number + 1
  WHERE id = 1
  RETURNING next_number - 1 INTO num;
  RETURN num;
END;
$$;

-- Public-facing recent signers (no PII — first name and city only)
CREATE OR REPLACE FUNCTION get_recent_signers(limit_count integer DEFAULT 10)
RETURNS TABLE (first_name text, city text, signed_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.first_name, s.city, s.signed_at
  FROM signatures s
  WHERE s.verification_status IN ('verified', 'flagged')
    AND s.deleted_at IS NULL
  ORDER BY s.signed_at DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION get_recent_signers TO anon, authenticated;

-- Seed campaign_metrics with all metric types at zero
INSERT INTO campaign_metrics (metric, value) VALUES
  ('signature_count', 0),
  ('verified_signature_count', 0),
  ('email_subscriber_count', 0),
  ('volunteer_count', 0),
  ('voice_submission_count', 0),
  ('donation_total_cents', 0),
  ('referral_click_count', 0),
  ('referral_conversion_count', 0)
ON CONFLICT (metric) DO NOTHING;
