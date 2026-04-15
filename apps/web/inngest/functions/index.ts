// ---------------------------------------------------------------------------
// Inngest Function Registry — apps/web/inngest/functions/index.ts
// ---------------------------------------------------------------------------
// Re-exports all Inngest functions for use by the serve handler in
// apps/web/app/api/inngest/route.ts.
// ---------------------------------------------------------------------------

export { moderateVoiceSubmission } from './voice-ai-moderation';
export {
  voiceAutoApproveNotify,
  voiceRejectionNotify,
  voiceHumanApprovalNotify,
  voiceEditNotify,
} from './voice-notifications';
export { voiceAdminDigest } from './voice-admin-digest';
export { voiceCleanupUnverified } from './voice-cleanup-unverified';
export { petitionWelcome } from './petition-welcome';
export { petitionVerified } from './petition-verified';
export { referralTracking } from './referral-tracking';
export { trackReferralConversion } from './track-referral-conversion';
export { processDonation } from './process-donation';
export {
  donationMilestoneCheck,
  donationMilestoneNotify,
} from './donation-milestones';
export { nurturePostSignature } from './nurture-post-signature';
export { nurtureSubscriber } from './nurture-subscriber';
export { nurtureVolunteer } from './nurture-volunteer';
export { emailSubscriberWelcome } from './email-subscriber-welcome';
