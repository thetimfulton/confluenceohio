-- Migration 00005: Enable Row-Level Security and create policies
-- Default deny on every table. Explicit policies grant access.

-- Enable RLS on all tables
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

-- campaign_metrics: public read, admin write
CREATE POLICY "Anyone can read campaign metrics"
  ON campaign_metrics FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update metrics"
  ON campaign_metrics FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- signatures: admin-only read
CREATE POLICY "Admins can read all signatures"
  ON signatures FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- voice_submissions: public read (approved only), admin read/write all
CREATE POLICY "Anyone can read approved voices"
  ON voice_submissions FOR SELECT
  TO anon, authenticated
  USING (moderation_status IN ('auto_approved', 'approved'));

CREATE POLICY "Admins can read all voices"
  ON voice_submissions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can update voices"
  ON voice_submissions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- email_subscribers: admin-only
CREATE POLICY "Admins can read subscribers"
  ON email_subscribers FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- volunteers: admin-only
CREATE POLICY "Admins can read volunteers"
  ON volunteers FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- donations: admin-only
CREATE POLICY "Admins can read donations"
  ON donations FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- referrals: admin-only
CREATE POLICY "Admins can read referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- admin_users: self or admin
CREATE POLICY "Admins can read admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'admin'));

-- moderation_log: admin-only
CREATE POLICY "Admins can read moderation log"
  ON moderation_log FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
