// ---------------------------------------------------------------------------
// Template ID Registry — packages/email/templates.ts
// ---------------------------------------------------------------------------
// Maps logical template names to environment variable names. Template IDs
// are stored as env vars so they can be updated in Brevo's dashboard
// without code changes. See Artifact 07 §3.2 for the full list.
// ---------------------------------------------------------------------------

/**
 * Maps each template name to the environment variable that holds its
 * numeric Brevo template ID.
 */
const TEMPLATE_IDS = {
  // Welcome series
  EMAIL_VERIFICATION: 'BREVO_TEMPLATE_EMAIL_VERIFY',
  WELCOME_1_CONFIRMATION: 'BREVO_TEMPLATE_WELCOME_1',
  WELCOME_2_STORY: 'BREVO_TEMPLATE_WELCOME_2',
  WELCOME_3_VOICES: 'BREVO_TEMPLATE_WELCOME_3',
  WELCOME_4_INVOLVE: 'BREVO_TEMPLATE_WELCOME_4',

  // Conversion
  SIGNER_TO_VOLUNTEER: 'BREVO_TEMPLATE_SIGNER_TO_VOLUNTEER',
  SIGNER_TO_DONOR: 'BREVO_TEMPLATE_SIGNER_TO_DONOR',

  // Milestone
  MILESTONE_CELEBRATION: 'BREVO_TEMPLATE_MILESTONE',

  // Re-engagement
  RE_ENGAGEMENT_1: 'BREVO_TEMPLATE_RE_ENGAGEMENT_1',
  RE_ENGAGEMENT_2: 'BREVO_TEMPLATE_RE_ENGAGEMENT_2',

  // Volunteer
  VOLUNTEER_CONFIRMATION: 'BREVO_TEMPLATE_VOLUNTEER_CONFIRM',
  VOLUNTEER_ONBOARDING_2: 'BREVO_TEMPLATE_VOLUNTEER_ONBOARD_2',

  // Standalone
  STANDALONE_WELCOME: 'BREVO_TEMPLATE_STANDALONE_WELCOME',

  // Donation
  DONATION_THANK_YOU: 'BREVO_TEMPLATE_DONATION_THANKS',
  DONATION_THANK_YOU_RECURRING: 'BREVO_TEMPLATE_DONATION_THANKS_RECURRING',

  // Admin
  ADMIN_NEW_VOLUNTEER: 'BREVO_TEMPLATE_ADMIN_NEW_VOLUNTEER',

  // Volunteer returning
  VOLUNTEER_ROLE_UPDATE: 'BREVO_TEMPLATE_VOLUNTEER_ROLE_UPDATE',

  // Volunteer nurture (Artifact 07 §4)
  VOLUNTEER_FIRST_TASK: 'BREVO_TEMPLATE_VOLUNTEER_FIRST_TASK',
  VOLUNTEER_CHECK_IN: 'BREVO_TEMPLATE_VOLUNTEER_CHECK_IN',

  // Non-signer subscriber nurture (Artifact 07 §4)
  SUBSCRIBER_CASE: 'BREVO_TEMPLATE_SUBSCRIBER_CASE',
  SUBSCRIBER_PETITION_CTA: 'BREVO_TEMPLATE_SUBSCRIBER_PETITION_CTA',
  SUBSCRIBER_VOICES_SHARE: 'BREVO_TEMPLATE_SUBSCRIBER_VOICES',

  // Transactional
  RESEND_VERIFICATION: 'BREVO_TEMPLATE_RESEND_VERIFY',

  // Petition verification (Artifact 07 §2.3)
  VERIFICATION_REMINDER: 'BREVO_TEMPLATE_VERIFY_REMINDER',
  VERIFIED_WELCOME: 'BREVO_TEMPLATE_VERIFIED_WELCOME',
  REFERRAL_NOTIFICATION: 'BREVO_TEMPLATE_REFERRAL_NOTIFY',

  // Community Voices (Artifact 10 §5)
  VOICE_EMAIL_VERIFY: 'BREVO_TEMPLATE_VOICE_EMAIL_VERIFY',
  VOICE_APPROVED: 'BREVO_TEMPLATE_VOICE_APPROVED',
  VOICE_REJECTED: 'BREVO_TEMPLATE_VOICE_REJECTED',
  VOICE_EDITED: 'BREVO_TEMPLATE_VOICE_EDITED',
  VOICE_ADMIN_DIGEST: 'BREVO_TEMPLATE_VOICE_ADMIN_DIGEST',
} as const;

export type TemplateName = keyof typeof TEMPLATE_IDS;

/**
 * Resolve a template name to its numeric Brevo template ID.
 * Reads the corresponding environment variable at runtime.
 *
 * @throws {Error} if the env var is not set or is not a valid number
 */
export function getTemplateId(key: TemplateName): number {
  const envVar = TEMPLATE_IDS[key];
  const value = process.env[envVar];

  if (!value) {
    throw new Error(
      `Missing Brevo template ID: environment variable ${envVar} is not set. ` +
        `Create the template in Brevo and add its numeric ID to your .env file.`,
    );
  }

  const id = parseInt(value, 10);
  if (Number.isNaN(id)) {
    throw new Error(
      `Invalid Brevo template ID: ${envVar}="${value}" is not a number.`,
    );
  }

  return id;
}
