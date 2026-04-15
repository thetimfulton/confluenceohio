-- Migration 00003: Create indexes
-- Performance indexes for common query patterns.

-- signatures
CREATE INDEX IF NOT EXISTS idx_signatures_email ON signatures (email);
CREATE INDEX IF NOT EXISTS idx_signatures_email_hash ON signatures (email_hash);
CREATE INDEX IF NOT EXISTS idx_signatures_address_hash ON signatures (address_hash);
CREATE INDEX IF NOT EXISTS idx_signatures_referral_code ON signatures (referral_code);
CREATE INDEX IF NOT EXISTS idx_signatures_referred_by_code ON signatures (referred_by_code);
CREATE INDEX IF NOT EXISTS idx_signatures_verification_status ON signatures (verification_status);
CREATE INDEX IF NOT EXISTS idx_signatures_signed_at ON signatures (signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_signatures_not_deleted ON signatures (id) WHERE deleted_at IS NULL;

-- email_subscribers
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON email_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_subscribers_email_hash ON email_subscribers (email_hash);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON email_subscribers (status);
CREATE INDEX IF NOT EXISTS idx_subscribers_source ON email_subscribers (source);

-- volunteers
CREATE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers (email);
CREATE INDEX IF NOT EXISTS idx_volunteers_neighborhood ON volunteers (neighborhood);

-- voice_submissions
CREATE INDEX IF NOT EXISTS idx_voices_slug ON voice_submissions (slug);
CREATE INDEX IF NOT EXISTS idx_voices_status ON voice_submissions (moderation_status);
CREATE INDEX IF NOT EXISTS idx_voices_position ON voice_submissions (position);
CREATE INDEX IF NOT EXISTS idx_voices_featured ON voice_submissions (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_voices_approved ON voice_submissions (approved_at DESC) WHERE moderation_status IN ('auto_approved', 'approved');

-- donations
CREATE INDEX IF NOT EXISTS idx_donations_refcode ON donations (refcode);
CREATE INDEX IF NOT EXISTS idx_donations_donor_email ON donations (donor_email);
CREATE INDEX IF NOT EXISTS idx_donations_donated_at ON donations (donated_at DESC);

-- referrals
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals (referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_signature ON referrals (referrer_signature_id);

-- email_verification_tokens
CREATE INDEX IF NOT EXISTS idx_verification_tokens_signature ON email_verification_tokens (signature_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON email_verification_tokens (expires_at) WHERE used_at IS NULL;

-- moderation_log
CREATE INDEX IF NOT EXISTS idx_moderation_log_submission ON moderation_log (voice_submission_id);
