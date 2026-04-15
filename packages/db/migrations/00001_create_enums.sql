-- Migration 00001: Create enum types
-- All enum types used across the Confluence Ohio schema.

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM (
    'pending',
    'verified',
    'flagged',
    'rejected',
    'duplicate'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE voice_position AS ENUM (
    'support',
    'oppose',
    'undecided'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE moderation_status AS ENUM (
    'pending',
    'auto_approved',
    'needs_review',
    'approved',
    'rejected',
    'appealed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscriber_status AS ENUM (
    'active',
    'unsubscribed',
    'bounced',
    'complained'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE volunteer_status AS ENUM (
    'active',
    'inactive',
    'onboarded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM (
    'admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE referral_platform AS ENUM (
    'facebook',
    'twitter',
    'whatsapp',
    'email',
    'copy',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscriber_source AS ENUM (
    'petition',
    'standalone',
    'volunteer',
    'blog',
    'footer',
    'event'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
