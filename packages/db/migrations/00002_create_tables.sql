-- Migration 00002: Create tables
-- 10 tables + signature_counter singleton. No blog_posts table (blog is MDX-only).

-- admin_users must be created before voice_submissions (which references it)
CREATE TABLE IF NOT EXISTS admin_users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  email       text NOT NULL,
  role        admin_role NOT NULL DEFAULT 'admin',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_admin_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS signatures (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name            text NOT NULL,
  last_name             text NOT NULL,
  email                 text NOT NULL,
  address_line_1        text NOT NULL,
  address_line_2        text,
  city                  text NOT NULL,
  state                 text NOT NULL DEFAULT 'OH' CHECK (state = 'OH'),
  zip_code              text NOT NULL,
  zip_plus_4            text,
  address_hash          text NOT NULL,
  email_hash            text NOT NULL,
  smarty_dpv_match_code text,
  smarty_rdi            text,
  smarty_dpv_cmra       text,
  smarty_dpv_vacant     text,
  smarty_latitude       numeric(10,7),
  smarty_longitude      numeric(10,7),
  verification_status   verification_status NOT NULL DEFAULT 'pending',
  ip_hash               text,
  user_agent            text,
  turnstile_token_valid boolean NOT NULL DEFAULT false,
  honeypot_clean        boolean NOT NULL DEFAULT true,
  referral_code         text,
  referred_by_code      text,
  referred_by_id        uuid REFERENCES signatures(id),
  signature_number      integer NOT NULL,
  email_verified        boolean NOT NULL DEFAULT false,
  email_token_hash      text,
  email_token_expires   timestamptz,
  email_verified_at     timestamptz,
  email_opt_in          boolean NOT NULL DEFAULT true,
  signed_at             timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  CONSTRAINT unique_email UNIQUE (email),
  CONSTRAINT unique_address_hash UNIQUE (address_hash),
  CONSTRAINT unique_signature_number UNIQUE (signature_number),
  CONSTRAINT unique_referral_code UNIQUE (referral_code)
);

CREATE TABLE IF NOT EXISTS signature_counter (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  next_number integer NOT NULL DEFAULT 1
);

INSERT INTO signature_counter (id, next_number) VALUES (1, 1)
  ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS email_subscribers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  email_hash        text NOT NULL,
  first_name        text,
  source            subscriber_source NOT NULL,
  brevo_contact_id  text,
  status            subscriber_status NOT NULL DEFAULT 'active',
  subscribed_at     timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_subscriber_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS volunteers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  phone           text,
  neighborhood    text,
  roles           jsonb NOT NULL DEFAULT '[]',
  availability    text,
  notes           text,
  status          volunteer_status NOT NULL DEFAULT 'active',
  signed_up_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_volunteer_email UNIQUE (email)
);

COMMENT ON COLUMN volunteers.roles IS
  'JSON array of role strings: signature_collector, social_amplifier, event_organizer, story_collector, neighborhood_captain, design_content';

CREATE TABLE IF NOT EXISTS voice_submissions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name           text NOT NULL,
  author_email          text NOT NULL,
  author_neighborhood   text,
  position              voice_position NOT NULL,
  title                 text NOT NULL,
  body                  text NOT NULL CHECK (length(body) <= 5000),
  photo_url             text,
  slug                  text NOT NULL,
  moderation_status     moderation_status NOT NULL DEFAULT 'pending',
  moderation_ai_result  jsonb,
  moderation_ai_at      timestamptz,
  moderated_by          uuid REFERENCES admin_users(id),
  moderation_note       text,
  featured              boolean NOT NULL DEFAULT false,
  approved_at           timestamptz,
  rejected_at           timestamptz,
  rejection_reason      text,
  submitted_at          timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_voice_slug UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS donations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actblue_order_id      text NOT NULL,
  donor_email           text,
  donor_name            text,
  amount_cents          integer NOT NULL CHECK (amount_cents > 0),
  recurring             boolean NOT NULL DEFAULT false,
  refcode               text,
  refcode2              text,
  express_lane          boolean NOT NULL DEFAULT false,
  line_items            jsonb,
  donated_at            timestamptz NOT NULL,
  webhook_received_at   timestamptz NOT NULL DEFAULT now(),
  webhook_payload_hash  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_actblue_order UNIQUE (actblue_order_id)
);

CREATE TABLE IF NOT EXISTS referrals (
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

CREATE TABLE IF NOT EXISTS campaign_metrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric        metric_type NOT NULL,
  value         bigint NOT NULL DEFAULT 0,
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_metric UNIQUE (metric)
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id    uuid NOT NULL REFERENCES signatures(id) ON DELETE CASCADE,
  token_hash      text NOT NULL,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_token_hash UNIQUE (token_hash)
);

CREATE TABLE IF NOT EXISTS moderation_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_submission_id uuid NOT NULL REFERENCES voice_submissions(id),
  action              text NOT NULL,
  actor_type          text NOT NULL,
  actor_id            uuid,
  ai_confidence       numeric(4,3),
  reasoning           text,
  metadata            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
