// packages/db/types.ts
// Complete TypeScript type definitions matching the Supabase schema.
// Generated from Artifact 05 Section 8. Do not hand-edit — regenerate
// from schema when columns change.

// ============================================
// Enum Types
// ============================================

export type VerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected' | 'duplicate';
export type VoicePosition = 'support' | 'oppose' | 'undecided';
export type ModerationStatus = 'pending_email' | 'pending' | 'auto_approved' | 'needs_review' | 'approved' | 'rejected' | 'appealed';
export type SubscriberStatus = 'active' | 'unsubscribed' | 'bounced' | 'complained';
export type VolunteerStatus = 'active' | 'inactive' | 'onboarded';
export type AdminRole = 'admin' | 'moderator' | 'viewer';
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
  | 'neighborhood_captain'
  | 'event_organizer'
  | 'story_collector'
  | 'design_content'
  | 'outreach_liaison';

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
  onboarded_at: string | null;
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
  email_verified: boolean;
  email_token_hash: string | null;
  email_token_expires: string | null;
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

export interface VolunteerAdminNote {
  id: string;
  volunteer_id: string;
  admin_id: string;
  admin_email: string;
  content: string;
  created_at: string;
}

export interface CampaignSetting {
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export type CampaignSettingKey =
  | 'signature_goal'
  | 'milestone_thresholds'
  | 'site_announcement'
  | 'moderation_auto_approve_threshold'
  | 'moderation_auto_reject_threshold'
  | 'maintenance_mode';

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
