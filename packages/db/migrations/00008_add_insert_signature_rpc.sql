-- Migration 00008: Add insert_signature RPC function
-- Atomic petition signing: gets next signature number, resolves referrer,
-- inserts the full signature record, and returns the new id + number + referral code.
-- Called only from API routes using service_role key — not exposed to anon/authenticated.

CREATE OR REPLACE FUNCTION insert_signature(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_address_line_1 text,
  p_address_line_2 text,
  p_city text,
  p_state text,
  p_zip_code text,
  p_zip_plus_4 text,
  p_address_hash text,
  p_email_hash text,
  p_smarty_dpv_match_code text,
  p_smarty_rdi text,
  p_smarty_dpv_cmra text,
  p_smarty_dpv_vacant text,
  p_smarty_latitude numeric,
  p_smarty_longitude numeric,
  p_verification_status verification_status,
  p_ip_hash text,
  p_user_agent text,
  p_turnstile_token_valid boolean,
  p_referral_code text,
  p_referred_by_code text,
  p_email_opt_in boolean
)
RETURNS TABLE (id uuid, signature_number integer, referral_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sig_number integer;
  v_id uuid;
  v_referred_by_id uuid;
BEGIN
  -- Get next sequential number (atomically updates signature_counter)
  SELECT next_signature_number() INTO v_sig_number;

  -- Resolve referrer if ref code provided
  IF p_referred_by_code IS NOT NULL THEN
    SELECT s.id INTO v_referred_by_id
    FROM signatures s
    WHERE s.referral_code = p_referred_by_code
    AND s.deleted_at IS NULL;
  END IF;

  -- Insert the signature
  INSERT INTO signatures (
    first_name, last_name, email,
    address_line_1, address_line_2, city, state, zip_code, zip_plus_4,
    address_hash, email_hash,
    smarty_dpv_match_code, smarty_rdi, smarty_dpv_cmra, smarty_dpv_vacant,
    smarty_latitude, smarty_longitude,
    verification_status,
    ip_hash, user_agent, turnstile_token_valid,
    referral_code, referred_by_code, referred_by_id,
    signature_number, email_opt_in
  ) VALUES (
    p_first_name, p_last_name, p_email,
    p_address_line_1, p_address_line_2, p_city, p_state, p_zip_code, p_zip_plus_4,
    p_address_hash, p_email_hash,
    p_smarty_dpv_match_code, p_smarty_rdi, p_smarty_dpv_cmra, p_smarty_dpv_vacant,
    p_smarty_latitude, p_smarty_longitude,
    p_verification_status,
    p_ip_hash, p_user_agent, p_turnstile_token_valid,
    p_referral_code, p_referred_by_code, v_referred_by_id,
    v_sig_number, p_email_opt_in
  )
  RETURNING signatures.id INTO v_id;

  RETURN QUERY SELECT v_id, v_sig_number, p_referral_code;
END;
$$;

-- Only callable via service_role (from API routes), not from client-side
REVOKE EXECUTE ON FUNCTION insert_signature FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_signature TO service_role;
