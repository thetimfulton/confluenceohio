// ---------------------------------------------------------------------------
// Inngest Serve Handler — apps/web/app/api/inngest/route.ts
// ---------------------------------------------------------------------------
// Registers all Inngest functions and exposes them via the Next.js API route.
// Inngest Dev Server and production both hit this endpoint.
// ---------------------------------------------------------------------------

import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  petitionWelcome,
  petitionVerified,
  referralTracking,
  moderateVoiceSubmission,
  voiceAutoApproveNotify,
  voiceRejectionNotify,
  voiceHumanApprovalNotify,
  voiceEditNotify,
  voiceAdminDigest,
  voiceCleanupUnverified,
  processDonation,
  donationMilestoneCheck,
  donationMilestoneNotify,
  nurturePostSignature,
  nurtureSubscriber,
  nurtureVolunteer,
  emailSubscriberWelcome,
} from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Petition workflows
    petitionWelcome,
    petitionVerified,
    referralTracking,
    // Voice workflows
    moderateVoiceSubmission,
    voiceAutoApproveNotify,
    voiceRejectionNotify,
    voiceHumanApprovalNotify,
    voiceEditNotify,
    voiceAdminDigest,
    voiceCleanupUnverified,
    // Donation workflows
    processDonation,
    donationMilestoneCheck,
    donationMilestoneNotify,
    // Nurture workflows
    nurturePostSignature,
    nurtureSubscriber,
    nurtureVolunteer,
    // Email subscriber workflows
    emailSubscriberWelcome,
  ],
});
