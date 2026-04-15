// ---------------------------------------------------------------------------
// Inngest Client — apps/web/inngest/client.ts
// ---------------------------------------------------------------------------
// Typed Inngest client with event schemas for all Confluence Ohio workflows.
// See Artifact 07 §2.1 for the full event type definitions.
// ---------------------------------------------------------------------------

import { EventSchemas, Inngest } from 'inngest';

/**
 * Event type map for all Inngest events in the Confluence Ohio application.
 * Each key is an event name; its value defines the `data` payload shape.
 *
 * Types must match what the senders (API routes, other Inngest functions)
 * actually emit. When adding a new event, check the sender to ensure the
 * shape is correct.
 */
type Events = {
  // ── Petition ──
  'petition/signature.created': {
    data: {
      signatureId: string;
      signatureNumber: number;
      email: string;
      firstName: string;
      referralCode: string;
      referredByCode: string | null;
      emailOptIn: boolean;
      verificationUrl: string;
      verificationStatus: string; // VerificationStatus from DB — includes 'pending', 'verified', etc.
    };
  };
  'petition/email.verified': {
    data: {
      signatureId: string;
      email: string;
      firstName: string;
      referralCode: string;
      signatureNumber: number;
    };
  };
  'petition/verification.resend': {
    data: {
      signatureId: string;
      signatureNumber: number;
      email: string;
      firstName: string;
      referralCode: string;
      verificationUrl: string;
    };
  };

  // ── Donations ──
  'donation/received': {
    data: {
      email: string;
      donorName: string;
      amountCents: number;
      recurring: boolean;
      refcode?: string | null;
      orderNumber: string;
    };
  };
  'donation/milestone.check': {
    data: {
      amountCents: number;
      orderNumber: string;
    };
  };
  'donation/milestone.reached': {
    data: {
      milestoneCents: number;
      milestoneDollars: number;
      milestoneLabel: string;
      currentTotalCents: number;
    };
  };
  'donation/milestone.notify': {
    data: {
      milestone: string;
      totalCents: number;
    };
  };

  // ── Volunteers ──
  'volunteer/signup': {
    data: {
      volunteerId: string;
      email: string;
      firstName: string;
      lastName: string;
      roles: string[];
      neighborhood?: string | null;
    };
  };
  'volunteer/signup.created': {
    data: {
      volunteerId: string;
      email: string;
      firstName: string;
      lastName: string;
      roles: string[];
      neighborhood?: string | null;
    };
  };
  'volunteer/signup.updated': {
    data: {
      volunteerId: string;
      email: string;
      firstName: string;
      lastName: string;
      roles: string[];
      newRoles: string[];
      neighborhood?: string | null;
    };
  };

  // ── Community Voices ──
  'voice/submitted': {
    data: {
      submission: {
        id: string;
        author_name: string;
        author_email: string;
        author_neighborhood: string | null;
        position: string;
        title: string;
        body: string;
        slug: string;
      };
    };
  };
  'voice/auto-approved': {
    data: {
      submissionId: string;
    };
  };
  'voice/needs-review': {
    data: {
      submissionId: string;
    };
  };
  'voice/human-approved': {
    data: {
      submissionId: string;
    };
  };
  'voice/ai-rejected': {
    data: {
      submissionId: string;
      aiResult?: unknown;
    };
  };
  'voice/human-rejected': {
    data: {
      submissionId: string;
      adminId?: string;
      reason?: string;
    };
  };
  'voice/edited': {
    data: {
      submissionId: string;
      adminId: string;
      editNote: string;
    };
  };

  // ── Email / Subscribers ──
  'subscriber/created': {
    data: {
      subscriberId: string;
      email: string;
      firstName: string;
      source: string; // 'footer' | 'newsletter' | 'blog' | 'event'
    };
  };
  'email/verification.resend': {
    data: {
      signatureId: string;
      email: string;
      firstName: string;
      verificationUrl: string;
    };
  };

  // ── Referrals ──
  'referral/click': {
    data: {
      referralCode: string;
      platform: string;
      landingPage: string;
      utmSource: string;
      utmMedium: string;
      ipHash: string;
    };
  };
  'referral/conversion.notify': {
    data: {
      referrerEmail: string;
      referrerFirstName: string;
      newSignerFirstName: string;
      newSignerCity: string;
      totalReferrals: number;
    };
  };
  'referral/digest.queued': {
    data: {
      referrerEmail: string;
      referrerFirstName: string;
      referralCode: string;
    };
  };

  // ── Campaign ──
  'campaign/milestone.reached': {
    data: {
      milestone: number;
      currentCount: number;
    };
  };
  'engagement/check.daily': {
    data: Record<string, never>;
  };
};

export const inngest = new Inngest({
  id: 'confluence-ohio',
  schemas: new EventSchemas().fromRecord<Events>(),
});
