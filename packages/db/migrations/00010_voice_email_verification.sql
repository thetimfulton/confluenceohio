-- ---------------------------------------------------------------------------
-- Migration 00010: Voice Email Verification Addendum
-- ---------------------------------------------------------------------------
-- Adds email verification gate to voice_submissions per Artifact 10 §1.6.
-- This migration is additive — no existing data or columns are modified.
-- ---------------------------------------------------------------------------

-- 1. Add 'pending_email' to moderation_status enum (before 'pending')
ALTER TYPE moderation_status ADD VALUE IF NOT EXISTS 'pending_email' BEFORE 'pending';

-- 2. Add email verification columns to voice_submissions
ALTER TABLE voice_submissions ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE voice_submissions ADD COLUMN IF NOT EXISTS email_token_hash text;
ALTER TABLE voice_submissions ADD COLUMN IF NOT EXISTS email_token_expires timestamptz;

-- 3. Add index for the cleanup job that deletes unverified submissions
CREATE INDEX IF NOT EXISTS idx_voices_pending_email_cleanup
  ON voice_submissions (email_token_expires)
  WHERE moderation_status = 'pending_email';

-- 4. Add index for email rate-limiting lookups
CREATE INDEX IF NOT EXISTS idx_voices_author_email_submitted
  ON voice_submissions (author_email, submitted_at);

-- 5. Trigger to increment voice_submission_count when a voice is approved
CREATE OR REPLACE FUNCTION update_voice_count_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.moderation_status NOT IN ('approved', 'auto_approved')
     AND NEW.moderation_status IN ('approved', 'auto_approved') THEN
    INSERT INTO campaign_metrics (metric, value, recorded_at)
    VALUES ('voice_submission_count', 1, now())
    ON CONFLICT (metric)
    DO UPDATE SET value = campaign_metrics.value + 1, recorded_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_voice_approval
  AFTER UPDATE OF moderation_status ON voice_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_count_on_approval();
