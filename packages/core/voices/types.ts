// ---------------------------------------------------------------------------
// Voice Submission Types — packages/core/voices/types.ts
// ---------------------------------------------------------------------------
// Domain types for the community voices feature. These types are used by
// API routes, Inngest functions, and UI components. See Artifact 10 for
// the complete specification.
// ---------------------------------------------------------------------------

// ============================================
// Position & Status Enums
// ============================================

/** Position the voice author takes on renaming Columbus. */
export type VoicePosition = 'support' | 'oppose' | 'undecided';

/**
 * Moderation lifecycle status.
 *
 * pending_email → pending → auto_approved / needs_review → approved / rejected → appealed
 */
export type VoiceModerationStatus =
  | 'pending_email'
  | 'pending'
  | 'auto_approved'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'appealed';

// ============================================
// AI Moderation
// ============================================

/** Possible AI moderation decisions. */
export type AiDecision = 'approve' | 'reject' | 'flag_for_review';

/** Result returned by the Claude Haiku moderation call. */
export interface AiModerationResult {
  decision: AiDecision;
  confidence: number;
  reasoning: string;
  flagged_issues: string[];
}

// ============================================
// Submission Request (form input)
// ============================================

/** Shape of the validated form data from the submission form. */
export interface VoiceSubmitRequest {
  author_name: string;
  author_email: string;
  author_neighborhood?: string;
  position: VoicePosition;
  title?: string;
  body: string;
  guidelines_accepted: boolean;
  cf_turnstile_response?: string;
  website?: string; // Honeypot
  form_loaded_at?: number; // Unix timestamp ms
}

// ============================================
// Database Record
// ============================================

/** Full voice_submissions row including email verification fields. */
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
  moderation_status: VoiceModerationStatus;
  moderation_ai_result: AiModerationResult | null;
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

// ============================================
// Public-facing types (no PII)
// ============================================

/** Voice data safe for public API responses and rendering. */
export interface PublicVoice {
  id: string;
  author_name: string;
  author_neighborhood: string | null;
  position: VoicePosition;
  title: string;
  body: string;
  slug: string;
  featured: boolean;
  approved_at: string | null;
}

// ============================================
// Position Display Config
// ============================================

export interface PositionConfig {
  label: string;
  radioLabel: string;
  color: string;
  icon: string;
}

/** Position badge display configuration per Artifact 10 §3.1. */
export const POSITION_CONFIG: Record<VoicePosition, PositionConfig> = {
  support: {
    label: 'Supports renaming',
    radioLabel: 'I support renaming',
    color: '#16a34a',
    icon: '\u2713',
  },
  oppose: {
    label: 'Has concerns',
    radioLabel: 'I have concerns',
    color: '#d97706',
    icon: '\u2014',
  },
  undecided: {
    label: 'Still deciding',
    radioLabel: "I'm still deciding",
    color: '#2563eb',
    icon: '?',
  },
};
