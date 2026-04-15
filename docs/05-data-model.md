# Confluence Ohio — Data Model and Database Schema

**Artifact 05 · Prompt 5 Output**
**Date:** April 10, 2026
**Dependencies:** Artifact 02 (Site Architecture), Artifact 04 (Page Copy)

---

## 1. Schema Overview

The database is hosted on **Supabase (PostgreSQL) Pro tier** ($25/month — required for 8GB database, daily backups, 7-day log retention, no pause-after-inactivity). All tables use UUIDs as primary keys (generated via `gen_random_uuid()`). Row-Level Security (RLS) is enabled on every table. PII is encrypted at rest by Supabase's default AES-256 encryption (Vault skipped at launch — standard encryption sufficient given strict RLS; revisit if campaign handles more sensitive data).

**Blog content** is managed as MDX files in `content/blog/` (Git-managed, static). There is no `blog_posts` database table — all blog content lives in the filesystem per Prompt 4.

**Admin provisioning:** 1–2 super_admin users at launch (Tim + one other). Granular roles (moderator, viewer) deferred to Phase 2 when volunteer moderators join.

**Conventions:**
- All timestamps are `timestamptz` (UTC with timezone)
- All text fields use `text` (not `varchar` — Postgres treats them identically, `text` is simpler)
- Boolean fields default to `false`
- Soft deletes where applicable (retain `deleted_at` timestamp rather than hard-deleting rows with PII)
- JSONB for flexible structured data (volunteer roles, moderation metadata)

---

## 2. Enum Types

```sql
-- Verification status for petition signatures
CREATE TYPE verification_status AS ENUM (
  'pending',      -- Submitted, awaiting Smarty verification
  'verified',     -- Smarty confirmed valid Ohio residential address
  'flagged',      -- Passed basic checks but flagged (commercial address, CMRA, vacant)
  'rejected',     -- Invalid address, non-Ohio, or failed verification
  'duplicate'     -- Duplicate address_hash or email detected
);

-- Position for community voice submissions
CREATE TYPE voice_position AS ENUM (
  'support',
  'oppose',
  'undecided'
);

-- Moderation status for voice submissions
CREATE TYPE moderation_status AS ENUM (
  'pending',          -- Awaiting AI moderation
  'auto_approved',    -- AI approved with high confidence
  'needs_review',     -- AI flagged for human review
  'approved',         -- Human approved
  'rejected',         -- AI auto-rejected or human rejected
  'appealed'          -- Author appealed a rejection
);

-- Email subscriber status
CREATE TYPE subscriber_status AS ENUM (
  'active',
  'unsubscribed',
  'bounced',
  'complained'
);

-- Volunteer status
CREATE TYPE volunteer_status AS ENUM (
  'active',
  'inactive',
  'onboarded'
);

-- Admin role (Phase 2: add 'moderator', 'viewer' when volunteer moderators join)
CREATE TYPE admin_role AS ENUM (
  'admin'         -- Full access (1-2 super_admins at launch)
);

-- Referral platform
CREATE TYPE referral_platform AS ENUM (
  'facebook',
  'twitter',
  'whatsapp',
  'email',
  'copy',
  'other'
);

-- Email subscriber source
CREATE TYPE subscriber_source AS ENUM (
  'petition',
  'standalone',
  'volunteer',
  'blog',
  'footer',
  'event'
);

-- Campaign metric type
CREATE TYPE metric_type AS ENUM (
  'signature_count',
  'verified_signature_count',
  'email_subscriber_count',
  'volunteer_count',
  'voice_submission_count',
  'donation_total_cents',
  'referral_click_count',
  'referral_conversion_count'
);
```

---

## 3. Table Definitions

### 3.1 `signatures` — Petition Signatures

The most critical table. Contains PII — locked down with strict RLS. Sequential signature numbers are user-facing ("You're signer #4,217!").

```sql
CREATE TABLE signatures (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal information
  first_name            text NOT NULL,
  last_name             text NOT NULL,
  email                 text NOT NULL,
  
  -- Address (Smarty-normalized)
  address_line_1        text NOT NULL,
  address_line_2        text,
  city                  text NOT NULL,
  state                 text NOT NULL DEFAULT 'OH' CHECK (state = 'OH'),
  zip_code              text NOT NULL,
  zip_plus_4            text,
  
  -- Deduplication and verification
  address_hash          text NOT NULL,  -- SHA-256 of canonical Smarty-normalized address
  email_hash            text NOT NULL,  -- SHA-256 of lowercased email
  
  -- Smarty verification results
  smarty_dpv_match_code text,           -- Y=confirmed, S=secondary (apt), D=missing secondary, N=not confirmed
  smarty_rdi            text,           -- Residential / Commercial
  smarty_dpv_cmra       text,           -- Y=commercial mail receiving agency (flag)
  smarty_dpv_vacant     text,           -- Y=vacant address (flag)
  smarty_latitude       numeric(10,7),
  smarty_longitude      numeric(10,7),
  
  verification_status   verification_status NOT NULL DEFAULT 'pending',
  
  -- Anti-fraud
  ip_hash               text,           -- SHA-256 of IP address (never store raw IP)
  user_agent            text,
  turnstile_token_valid boolean NOT NULL DEFAULT false,
  honeypot_clean        boolean NOT NULL DEFAULT true,
  
  -- Referral tracking
  referral_code         text,           -- This signer's own referral code (for sharing)
  referred_by_code      text,           -- The referral code that brought them here
  referred_by_id        uuid REFERENCES signatures(id),
  
  -- Sequential numbering
  signature_number      integer NOT NULL,  -- User-facing: "You're signer #X!"
  
  -- Email verification
  email_verified        boolean NOT NULL DEFAULT false,
  email_token_hash      text,           -- SHA-256 of email verification token
  email_token_expires   timestamptz,
  email_verified_at     timestamptz,
  
  -- Email opt-in
  email_opt_in          boolean NOT NULL DEFAULT true,
  
  -- Timestamps
  signed_at             timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,      -- Soft delete for removal requests
  
  -- Constraints
  CONSTRAINT unique_email UNIQUE (email),
  CONSTRAINT unique_address_hash UNIQUE (address_hash),
  CONSTRAINT unique_signature_number UNIQUE (signature_number),
  CONSTRAINT unique_referral_code UNIQUE (referral_code)
);
```

**Sequential numbering implementation:**

```sql
-- Counter table for gapless sequential signature numbers
CREATE TABLE signature_counter (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Singleton row
  next_number integer NOT NULL DEFAULT 1
);

INSERT INTO signature_counter (id, next_number) VALUES (1, 1);

-- Function to atomically get and increment the next signature number
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
```

---

### 3.2 `email_subscribers` — Email List

May overlap with signatures (a signer who opts in is also a subscriber). Brevo is the source of truth for email delivery status; this table tracks the relationship.

```sql
CREATE TABLE email_subscribers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  email_hash        text NOT NULL,           -- SHA-256 for dedup across tables
  first_name        text,
  source            subscriber_source NOT NULL,
  brevo_contact_id  text,                    -- Brevo's internal contact ID
  status            subscriber_status NOT NULL DEFAULT 'active',
  subscribed_at     timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_subscriber_email UNIQUE (email)
);
```

---

### 3.3 `volunteers` — Volunteer Signups

```sql
CREATE TABLE volunteers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  phone           text,                      -- Optional
  neighborhood    text,                      -- Columbus neighborhood
  roles           jsonb NOT NULL DEFAULT '[]',  -- Array of role strings
  availability    text,                      -- "weekdays" | "weekends" | "evenings" | "flexible"
  notes           text,                      -- Free-text "anything else?"
  status          volunteer_status NOT NULL DEFAULT 'active',
  signed_up_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_volunteer_email UNIQUE (email)
);

COMMENT ON COLUMN volunteers.roles IS 
  'JSON array of role strings: signature_collector, social_amplifier, event_organizer, story_collector, neighborhood_captain, design_content';
```

---

### 3.4 `voice_submissions` — Community Perspectives

Includes AI moderation fields per Artifact 02 decision (Claude API moderation with auto_approve / needs_review / auto_reject).

```sql
CREATE TABLE voice_submissions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Author info
  author_name           text NOT NULL,
  author_email          text NOT NULL,
  author_neighborhood   text,
  
  -- Content
  position              voice_position NOT NULL,
  title                 text NOT NULL,
  body                  text NOT NULL CHECK (length(body) <= 5000),  -- ~500 words max
  photo_url             text,
  slug                  text NOT NULL,
  
  -- Moderation
  moderation_status     moderation_status NOT NULL DEFAULT 'pending',
  moderation_ai_result  jsonb,            -- { decision, confidence, reasoning, flagged_issues[] }
  moderation_ai_at      timestamptz,
  moderated_by          uuid REFERENCES admin_users(id),
  moderation_note       text,             -- Human moderator's note
  
  -- Publishing
  featured              boolean NOT NULL DEFAULT false,
  approved_at           timestamptz,
  rejected_at           timestamptz,
  rejection_reason      text,
  
  -- Timestamps
  submitted_at          timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_voice_slug UNIQUE (slug)
);
```

---

### 3.5 `donations` — ActBlue Webhook Data

Populated entirely by ActBlue webhooks — no direct user writes.

```sql
CREATE TABLE donations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actblue_order_id      text NOT NULL,
  donor_email           text,
  donor_name            text,
  amount_cents          integer NOT NULL CHECK (amount_cents > 0),
  recurring             boolean NOT NULL DEFAULT false,
  refcode               text,             -- Campaign refcode for attribution
  refcode2              text,             -- Secondary refcode
  express_lane          boolean NOT NULL DEFAULT false,  -- ActBlue Express Lane user
  line_items            jsonb,            -- Full line item data from webhook
  donated_at            timestamptz NOT NULL,
  webhook_received_at   timestamptz NOT NULL DEFAULT now(),
  webhook_payload_hash  text,             -- SHA-256 of webhook payload for idempotency
  created_at            timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_actblue_order UNIQUE (actblue_order_id)
);
```

---

### 3.6 `referrals` — Social Sharing Tracking

One row per signer per platform. Created when a signer shares their referral link.

```sql
CREATE TABLE referrals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_signature_id uuid NOT NULL REFERENCES signatures(id),
  referral_code         text NOT NULL,
  platform              referral_platform NOT NULL,
  clicks                integer NOT NULL DEFAULT 0,
  conversions           integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_referral_code_platform UNIQUE (referral_code, platform)
);
```

---

### 3.7 `admin_users` — Admin Access

Tied to Supabase Auth users. Admin dashboard access controlled via this table. Launch with 1–2 `admin` accounts; add granular roles in Phase 2.

```sql
CREATE TABLE admin_users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  email       text NOT NULL,
  role        admin_role NOT NULL DEFAULT 'admin',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_admin_email UNIQUE (email)
);
```

---

### 3.8 `campaign_metrics` — Aggregated Metrics

Denormalized counters updated via triggers. The real-time signature counter subscribes to this table (not to `signatures` directly) for performance.

```sql
CREATE TABLE campaign_metrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric        metric_type NOT NULL,
  value         bigint NOT NULL DEFAULT 0,
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_metric UNIQUE (metric)
);

-- Seed initial metric rows
INSERT INTO campaign_metrics (metric, value) VALUES
  ('signature_count', 0),
  ('verified_signature_count', 0),
  ('email_subscriber_count', 0),
  ('volunteer_count', 0),
  ('voice_submission_count', 0),
  ('donation_total_cents', 0),
  ('referral_click_count', 0),
  ('referral_conversion_count', 0);
```

---

### 3.9 `email_verification_tokens` — Signature Email Verification

Separate from Supabase Auth (signers do not create Auth accounts). Tokens are hashed; raw tokens are sent via email only.

```sql
CREATE TABLE email_verification_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id    uuid NOT NULL REFERENCES signatures(id) ON DELETE CASCADE,
  token_hash      text NOT NULL,           -- SHA-256 of the raw token
  expires_at      timestamptz NOT NULL,    -- Default: 72 hours from creation
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_token_hash UNIQUE (token_hash)
);
```

---

### 3.10 `moderation_log` — Audit Trail for Voice Moderation

Records every moderation action (AI and human) for transparency and improvement.

```sql
CREATE TABLE moderation_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_submission_id uuid NOT NULL REFERENCES voice_submissions(id),
  action              text NOT NULL,       -- 'ai_auto_approve', 'ai_needs_review', 'ai_auto_reject', 'human_approve', 'human_reject', 'human_override'
  actor_type          text NOT NULL,       -- 'ai' | 'human'
  actor_id            uuid,                -- admin_users.id if human
  ai_confidence       numeric(4,3),        -- 0.000 to 1.000
  reasoning           text,
  metadata            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
```

---

## 4. Database Triggers

### 4.1 Signature Count Trigger

Updates `campaign_metrics` whenever a signature is inserted, keeping the real-time counter in sync.

```sql
CREATE OR REPLACE FUNCTION update_signature_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment total signature count
  UPDATE campaign_metrics
  SET value = value + 1, recorded_at = now()
  WHERE metric = 'signature_count';
  
  -- If verified, also increment verified count
  IF NEW.verification_status = 'verified' THEN
    UPDATE campaign_metrics
    SET value = value + 1, recorded_at = now()
    WHERE metric = 'verified_signature_count';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_signature_insert
  AFTER INSERT ON signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_count();
```

### 4.2 Signature Verification Status Change Trigger

Updates the verified count when a signature's status changes to or from 'verified'.

```sql
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

CREATE TRIGGER on_signature_status_change
  AFTER UPDATE OF verification_status ON signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_verified_count_on_status_change();
```

### 4.3 Email Subscriber Count Trigger

```sql
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

CREATE TRIGGER on_subscriber_change
  AFTER INSERT OR UPDATE OF status ON email_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_count();
```

### 4.4 Volunteer Count Trigger

```sql
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

CREATE TRIGGER on_volunteer_insert
  AFTER INSERT ON volunteers
  FOR EACH ROW
  EXECUTE FUNCTION update_volunteer_count();
```

### 4.5 Donation Total Trigger

```sql
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

CREATE TRIGGER on_donation_insert
  AFTER INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donation_total();
```

### 4.6 Updated_at Auto-Trigger

Applied to all tables with an `updated_at` column.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON signatures FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON email_subscribers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON volunteers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON voice_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 5. Indexes

```sql
-- signatures
CREATE INDEX idx_signatures_email ON signatures (email);
CREATE INDEX idx_signatures_email_hash ON signatures (email_hash);
CREATE INDEX idx_signatures_address_hash ON signatures (address_hash);
CREATE INDEX idx_signatures_referral_code ON signatures (referral_code);
CREATE INDEX idx_signatures_referred_by_code ON signatures (referred_by_code);
CREATE INDEX idx_signatures_verification_status ON signatures (verification_status);
CREATE INDEX idx_signatures_signed_at ON signatures (signed_at DESC);
CREATE INDEX idx_signatures_not_deleted ON signatures (id) WHERE deleted_at IS NULL;

-- email_subscribers
CREATE INDEX idx_subscribers_email ON email_subscribers (email);
CREATE INDEX idx_subscribers_email_hash ON email_subscribers (email_hash);
CREATE INDEX idx_subscribers_status ON email_subscribers (status);
CREATE INDEX idx_subscribers_source ON email_subscribers (source);

-- volunteers
CREATE INDEX idx_volunteers_email ON volunteers (email);
CREATE INDEX idx_volunteers_neighborhood ON volunteers (neighborhood);

-- voice_submissions
CREATE INDEX idx_voices_slug ON voice_submissions (slug);
CREATE INDEX idx_voices_status ON voice_submissions (moderation_status);
CREATE INDEX idx_voices_position ON voice_submissions (position);
CREATE INDEX idx_voices_featured ON voice_submissions (featured) WHERE featured = true;
CREATE INDEX idx_voices_approved ON voice_submissions (approved_at DESC) WHERE moderation_status IN ('auto_approved', 'approved');

-- donations
CREATE INDEX idx_donations_refcode ON donations (refcode);
CREATE INDEX idx_donations_donor_email ON donations (donor_email);
CREATE INDEX idx_donations_donated_at ON donations (donated_at DESC);

-- referrals
CREATE INDEX idx_referrals_code ON referrals (referral_code);
CREATE INDEX idx_referrals_signature ON referrals (referrer_signature_id);

-- email_verification_tokens
CREATE INDEX idx_verification_tokens_signature ON email_verification_tokens (signature_id);
CREATE INDEX idx_verification_tokens_expires ON email_verification_tokens (expires_at) WHERE used_at IS NULL;

-- moderation_log
CREATE INDEX idx_moderation_log_submission ON moderation_log (voice_submission_id);
```

---

## 6. Row-Level Security Policies

RLS is enabled on every table. The principle: **anonymous users see only public aggregate data and published content. Authenticated admin users see everything their role permits. Server-side API routes (using the service_role key) bypass RLS for write operations.**

### 6.1 Enable RLS on All Tables

```sql
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
```

### 6.2 Policies

```sql
-- ============================================
-- campaign_metrics: PUBLIC READ (real-time counter)
-- ============================================
CREATE POLICY "Anyone can read campaign metrics"
  ON campaign_metrics FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can update (manual corrections)
CREATE POLICY "Admins can update metrics"
  ON campaign_metrics FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ============================================
-- signatures: ADMIN READ ONLY (PII protection)
-- ============================================
-- No anon SELECT policy — anonymous users cannot read signatures
-- The live counter comes from campaign_metrics, not this table

CREATE POLICY "Admins can read all signatures"
  ON signatures FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- All writes happen via service_role key in API routes (bypasses RLS)

-- ============================================
-- Recent signers: public function (not direct table access)
-- ============================================
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

-- ============================================
-- voice_submissions: PUBLIC READ when approved, ADMIN FULL
-- ============================================
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

-- INSERT via service_role (form submission API route)

-- ============================================
-- email_subscribers: ADMIN ONLY
-- ============================================
CREATE POLICY "Admins can read subscribers"
  ON email_subscribers FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ============================================
-- volunteers: ADMIN ONLY
-- ============================================
CREATE POLICY "Admins can read volunteers"
  ON volunteers FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ============================================
-- donations: ADMIN ONLY
-- ============================================
CREATE POLICY "Admins can read donations"
  ON donations FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ============================================
-- referrals: ADMIN ONLY
-- ============================================
CREATE POLICY "Admins can read referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ============================================
-- admin_users: SELF READ + ADMIN MANAGE
-- ============================================
CREATE POLICY "Admins can read admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- moderation_log: ADMIN ONLY
-- ============================================
CREATE POLICY "Admins can read moderation log"
  ON moderation_log FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ============================================
-- email_verification_tokens: NO DIRECT ACCESS
-- ============================================
-- All access via service_role in API routes
-- No RLS SELECT policies for anon or authenticated
```

---

## 7. Supabase Real-Time Configuration

### 7.1 Real-Time Subscription for Signature Counter

The frontend subscribes to `campaign_metrics` for the live counter — NOT to `signatures` (which would be both a privacy issue and a performance problem).

```typescript
// Client-side subscription
const channel = supabase
  .channel('signature-counter')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'campaign_metrics',
      filter: 'metric=eq.signature_count'
    },
    (payload) => {
      setSignatureCount(payload.new.value);
    }
  )
  .subscribe();
```

**Supabase Realtime publication config:**

```sql
-- Enable Realtime on campaign_metrics only
-- Do NOT enable on signatures, email_subscribers, volunteers, or donations (PII)
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_metrics;
```

### 7.2 Recent Signers Feed

The recent signers feed uses polling (not real-time subscription) to call the `get_recent_signers` function every 30 seconds. This avoids exposing the `signatures` table to Realtime and keeps the subscription surface minimal.

```typescript
// Client-side polling for recent signers
const fetchRecentSigners = async () => {
  const { data } = await supabase.rpc('get_recent_signers', { limit_count: 10 });
  setRecentSigners(data);
};

// Poll every 30 seconds
useEffect(() => {
  fetchRecentSigners();
  const interval = setInterval(fetchRecentSigners, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## 8. TypeScript Types

```typescript
// packages/db/types.ts

// ============================================
// Enum Types
// ============================================

export type VerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected' | 'duplicate';
export type VoicePosition = 'support' | 'oppose' | 'undecided';
export type ModerationStatus = 'pending' | 'auto_approved' | 'needs_review' | 'approved' | 'rejected' | 'appealed';
export type SubscriberStatus = 'active' | 'unsubscribed' | 'bounced' | 'complained';
export type VolunteerStatus = 'active' | 'inactive' | 'onboarded';
export type AdminRole = 'admin';  // Phase 2: add 'moderator' | 'viewer'
export type ReferralPlatform = 'facebook' | 'twitter' | 'whatsapp' | 'email' | 'copy' | 'other';
export type SubscriberSource = 'petition' | 'standalone' | 'volunteer' | 'blog' | 'footer' | 'event';
export type MetricType =
  | 'signature_count'
  | 'verified_signature_count'
  | 'email_subscriber_count'
  | 'volunteer_count'
  | 'voice_submission_count'
  | 'donation_total_cents'
  | 'referral_click_count'
  | 'referral_conversion_count';

// ============================================
// Volunteer Roles
// ============================================

export type VolunteerRole =
  | 'signature_collector'
  | 'social_amplifier'
  | 'event_organizer'
  | 'story_collector'
  | 'neighborhood_captain'
  | 'design_content';

// ============================================
// Table Types
// ============================================

export interface Signature {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: 'OH';
  zip_code: string;
  zip_plus_4: string | null;
  address_hash: string;
  email_hash: string;
  smarty_dpv_match_code: string | null;
  smarty_rdi: string | null;
  smarty_dpv_cmra: string | null;
  smarty_dpv_vacant: string | null;
  smarty_latitude: number | null;
  smarty_longitude: number | null;
  verification_status: VerificationStatus;
  ip_hash: string | null;
  user_agent: string | null;
  turnstile_token_valid: boolean;
  honeypot_clean: boolean;
  referral_code: string | null;
  referred_by_code: string | null;
  referred_by_id: string | null;
  signature_number: number;
  email_verified: boolean;
  email_token_hash: string | null;
  email_token_expires: string | null;
  email_verified_at: string | null;
  email_opt_in: boolean;
  signed_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  email_hash: string;
  first_name: string | null;
  source: SubscriberSource;
  brevo_contact_id: string | null;
  status: SubscriberStatus;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Volunteer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  neighborhood: string | null;
  roles: VolunteerRole[];
  availability: string | null;
  notes: string | null;
  status: VolunteerStatus;
  signed_up_at: string;
  created_at: string;
  updated_at: string;
}

export interface VoiceSubmission {
  id: string;
  author_name: string;
  author_email: string;
  author_neighborhood: string | null;
  position: VoicePosition;
  title: string;
  body: string;
  photo_url: string | null;
  slug: string;
  moderation_status: ModerationStatus;
  moderation_ai_result: {
    decision: 'auto_approve' | 'needs_review' | 'auto_reject';
    confidence: number;
    reasoning: string;
    flagged_issues: string[];
  } | null;
  moderation_ai_at: string | null;
  moderated_by: string | null;
  moderation_note: string | null;
  featured: boolean;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  actblue_order_id: string;
  donor_email: string | null;
  donor_name: string | null;
  amount_cents: number;
  recurring: boolean;
  refcode: string | null;
  refcode2: string | null;
  express_lane: boolean;
  line_items: Record<string, unknown> | null;
  donated_at: string;
  webhook_received_at: string;
  webhook_payload_hash: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_signature_id: string;
  referral_code: string;
  platform: ReferralPlatform;
  clicks: number;
  conversions: number;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetric {
  id: string;
  metric: MetricType;
  value: number;
  recorded_at: string;
}

export interface EmailVerificationToken {
  id: string;
  signature_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface ModerationLogEntry {
  id: string;
  voice_submission_id: string;
  action: string;
  actor_type: 'ai' | 'human';
  actor_id: string | null;
  ai_confidence: number | null;
  reasoning: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// Public-facing types (no PII)
// ============================================

export interface PublicRecentSigner {
  first_name: string;
  city: string;
  signed_at: string;
}

export interface PublicVoiceSubmission {
  id: string;
  author_name: string;
  author_neighborhood: string | null;
  position: VoicePosition;
  title: string;
  body: string;
  photo_url: string | null;
  slug: string;
  featured: boolean;
  approved_at: string | null;
}

```

---

## 9. Seed Data

```typescript
// packages/db/seed.ts

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role bypasses RLS
);

function sha256(input: string): string {
  return createHash('sha256').update(input.toLowerCase().trim()).digest('hex');
}

async function seed() {
  console.log('Seeding database...');

  // ---- Admin Users ----
  // Note: Create these users in Supabase Auth first, then insert admin records
  // For development, use supabase auth admin API
  
  // ---- Sample Signatures ----
  const sampleSignatures = [
    { first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@example.com', city: 'Clintonville', address: '123 High St' },
    { first_name: 'Marcus', last_name: 'Williams', email: 'marcus.w@example.com', city: 'Franklinton', address: '456 Sullivant Ave' },
    { first_name: 'Priya', last_name: 'Patel', email: 'priya.p@example.com', city: 'Dublin', address: '789 Dublin Rd' },
    { first_name: 'James', last_name: 'O\'Brien', email: 'james.ob@example.com', city: 'German Village', address: '101 Mohawk St' },
    { first_name: 'Amina', last_name: 'Hassan', email: 'amina.h@example.com', city: 'Northland', address: '202 Morse Rd' },
    { first_name: 'Tom', last_name: 'Kowalski', email: 'tom.k@example.com', city: 'Upper Arlington', address: '303 Tremont Rd' },
    { first_name: 'Jasmine', last_name: 'Wright', email: 'jasmine.w@example.com', city: 'Clintonville', address: '404 Indianola Ave' },
    { first_name: 'David', last_name: 'Rivera', email: 'david.r@example.com', city: 'Westerville', address: '505 State St' },
    { first_name: 'Chen', last_name: 'Wei', email: 'chen.w@example.com', city: 'Dublin', address: '606 Sawmill Rd' },
    { first_name: 'Maria', last_name: 'Santos', email: 'maria.s@example.com', city: 'Franklinton', address: '707 W Broad St' },
  ];

  for (let i = 0; i < sampleSignatures.length; i++) {
    const sig = sampleSignatures[i];
    const referralCode = randomUUID().slice(0, 8).toUpperCase();
    
    await supabase.from('signatures').insert({
      first_name: sig.first_name,
      last_name: sig.last_name,
      email: sig.email,
      address_line_1: sig.address,
      city: sig.city,
      state: 'OH',
      zip_code: '43201',
      address_hash: sha256(sig.address + sig.city + 'OH'),
      email_hash: sha256(sig.email),
      verification_status: 'verified',
      turnstile_token_valid: true,
      referral_code: referralCode,
      signature_number: i + 1,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      email_opt_in: true,
    });
  }

  // ---- Sample Voice Submissions ----
  const sampleVoices = [
    {
      author_name: 'Maria S.', author_email: 'maria.s@example.com',
      author_neighborhood: 'Franklinton', position: 'support' as const,
      title: 'The rivers were here first',
      body: 'I grew up in Franklinton, a block from the Scioto. My grandmother told me stories about the floods, the cleanup, the way the neighborhood rebuilt itself around that river. Confluence just feels right. It is what this place has always been — a meeting point.',
      slug: 'maria-s-the-rivers-were-here-first',
      moderation_status: 'approved' as const, featured: true,
    },
    {
      author_name: 'Tom K.', author_email: 'tom.k@example.com',
      author_neighborhood: 'Upper Arlington', position: 'oppose' as const,
      title: 'Columbus is my city',
      body: 'I get the argument. I really do. But I have been a Columbusite for 40 years. The name means something to me that has nothing to do with the explorer. It is my city, my home, my identity. I am not ready to give that up for a word that sounds like a software product.',
      slug: 'tom-k-columbus-is-my-city',
      moderation_status: 'approved' as const, featured: true,
    },
    {
      author_name: 'Jasmine W.', author_email: 'jasmine.w@example.com',
      author_neighborhood: 'Clintonville', position: 'undecided' as const,
      title: 'I keep going back and forth',
      body: 'Some days I think Confluence is beautiful and obvious. Other days I think: is this really the best use of civic energy right now? I signed up to follow the campaign because I genuinely do not know yet. I appreciate that they publish all sides.',
      slug: 'jasmine-w-i-keep-going-back-and-forth',
      moderation_status: 'approved' as const, featured: true,
    },
  ];

  for (const voice of sampleVoices) {
    await supabase.from('voice_submissions').insert({
      ...voice,
      approved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    });
  }

  // Blog content is MDX-only (content/blog/) — no database seeding needed

  // ---- Reset campaign_metrics to match seed data ----
  await supabase.from('campaign_metrics').update({ value: 10 }).eq('metric', 'signature_count');
  await supabase.from('campaign_metrics').update({ value: 10 }).eq('metric', 'verified_signature_count');
  await supabase.from('campaign_metrics').update({ value: 3 }).eq('metric', 'voice_submission_count');

  console.log('Seed complete.');
}

seed().catch(console.error);
```

---

## Claude Code Handoff

### Prompt for `packages/db/migrations/`

```
Create Supabase migration files in `packages/db/migrations/` with the following structure:

packages/db/migrations/
├── 00001_create_enums.sql
├── 00002_create_tables.sql
├── 00003_create_indexes.sql
├── 00004_create_triggers.sql
├── 00005_create_rls_policies.sql
├── 00006_create_functions.sql
└── 00007_enable_realtime.sql

Copy the exact SQL from artifact 05-data-model.md:

- 00001_create_enums.sql: All CREATE TYPE statements from Section 2
- 00002_create_tables.sql: All CREATE TABLE statements from Section 3 (10 tables + signature_counter singleton — no blog_posts table), including the signature_counter INSERT
- 00003_create_indexes.sql: All CREATE INDEX statements from Section 5
- 00004_create_triggers.sql: All trigger functions and CREATE TRIGGER statements from Section 4
- 00005_create_rls_policies.sql: All ALTER TABLE ENABLE ROW LEVEL SECURITY + CREATE POLICY statements from Section 6
- 00006_create_functions.sql: next_signature_number() from Section 3.1, get_recent_signers() from Section 6.2, and campaign_metrics seed INSERT from Section 3.9
- 00007_enable_realtime.sql: ALTER PUBLICATION from Section 7

Each migration file should be idempotent where possible (use IF NOT EXISTS). Include a comment header in each file with the migration number and description.

Do not modify any SQL. This is the approved schema.
```

### Prompt for `packages/db/types.ts`

```
Create the file `packages/db/types.ts` with the complete TypeScript type definitions from artifact 05-data-model.md Section 8. Include all enum types, table interfaces, and public-facing types exactly as written.

Also create `packages/db/index.ts` that re-exports all types:
export * from './types';
```

### Prompt for `packages/db/seed.ts`

```
Create the file `packages/db/seed.ts` with the seed script from artifact 05-data-model.md Section 9. Include the sha256 helper function, all sample signatures (10), and sample voice submissions (3). No blog post seed — blog content is MDX-only.

Also create a `packages/db/package.json` with a "seed" script:
{
  "name": "@confluence/db",
  "scripts": {
    "seed": "tsx seed.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2"
  },
  "devDependencies": {
    "tsx": "^4"
  }
}
```

### Prompt for downstream artifacts

```
Read the migration files in `packages/db/migrations/`, `packages/db/types.ts`, and `packages/db/seed.ts`. Confirm:
1. All 10 tables are created (no blog_posts — blog content is MDX-only)
2. All enum types exist
3. All indexes are in place
4. All RLS policies are applied
5. Real-time is enabled on campaign_metrics only
6. TypeScript types match the SQL schema

These are required before proceeding to Prompt 6 (Petition Signing Flow).
```

---

## Resolved Decisions

1. **Blog content storage:** MDX files only (`content/blog/`). No `blog_posts` table — all blog content is Git-managed and statically rendered. `post_status` enum removed.

2. **Supabase project tier:** Pro ($25/month) at launch. 8GB database, daily backups, 7-day log retention, no pause-after-inactivity.

3. **Vault for PII encryption:** Skipped at launch. Standard Supabase AES-256 encryption at rest is sufficient given strict RLS policies. Revisit if the campaign handles more sensitive data.

4. **Admin user provisioning:** 1–2 `admin` role users at launch (Tim + one other). Granular roles (`moderator`, `viewer`) deferred to Phase 2 when volunteer moderators join. `admin_role` enum simplified to single `admin` value.

---

*All questions resolved. Ready for Prompt 6 (Petition Signing Flow).*
