-- Migration 00004: Create trigger functions and triggers
-- Maintains denormalized campaign_metrics and updated_at timestamps.

-- 4.1 Signature count trigger
CREATE OR REPLACE FUNCTION update_signature_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaign_metrics
  SET value = value + 1, recorded_at = now()
  WHERE metric = 'signature_count';

  IF NEW.verification_status = 'verified' THEN
    UPDATE campaign_metrics
    SET value = value + 1, recorded_at = now()
    WHERE metric = 'verified_signature_count';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_signature_insert ON signatures;
CREATE TRIGGER on_signature_insert
  AFTER INSERT ON signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_count();

-- 4.2 Signature verification status change trigger
CREATE OR REPLACE FUNCTION update_verified_count_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.verification_status != 'verified' AND NEW.verification_status = 'verified' THEN
    UPDATE campaign_metrics
    SET value = value + 1, recorded_at = now()
    WHERE metric = 'verified_signature_count';
  ELSIF OLD.verification_status = 'verified' AND NEW.verification_status != 'verified' THEN
    UPDATE campaign_metrics
    SET value = value - 1, recorded_at = now()
    WHERE metric = 'verified_signature_count';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_signature_status_change ON signatures;
CREATE TRIGGER on_signature_status_change
  AFTER UPDATE OF verification_status ON signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_verified_count_on_status_change();

-- 4.3 Email subscriber count trigger
CREATE OR REPLACE FUNCTION update_subscriber_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE campaign_metrics SET value = value + 1, recorded_at = now()
    WHERE metric = 'email_subscriber_count';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE campaign_metrics SET value = value + 1, recorded_at = now()
      WHERE metric = 'email_subscriber_count';
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE campaign_metrics SET value = value - 1, recorded_at = now()
      WHERE metric = 'email_subscriber_count';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscriber_change ON email_subscribers;
CREATE TRIGGER on_subscriber_change
  AFTER INSERT OR UPDATE OF status ON email_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_count();

-- 4.4 Volunteer count trigger
CREATE OR REPLACE FUNCTION update_volunteer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE campaign_metrics SET value = value + 1, recorded_at = now()
    WHERE metric = 'volunteer_count';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_volunteer_insert ON volunteers;
CREATE TRIGGER on_volunteer_insert
  AFTER INSERT ON volunteers
  FOR EACH ROW
  EXECUTE FUNCTION update_volunteer_count();

-- 4.5 Donation total trigger
CREATE OR REPLACE FUNCTION update_donation_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaign_metrics
  SET value = value + NEW.amount_cents, recorded_at = now()
  WHERE metric = 'donation_total_cents';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_donation_insert ON donations;
CREATE TRIGGER on_donation_insert
  AFTER INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donation_total();

-- 4.6 Updated_at auto-trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON signatures;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON signatures FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON email_subscribers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON email_subscribers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON volunteers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON volunteers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON voice_submissions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON voice_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON referrals;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON admin_users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
