// ---------------------------------------------------------------------------
// Email Port Interface — packages/email/types.ts
// ---------------------------------------------------------------------------
// Hexagonal architecture: this file defines the port interface for email
// operations. The BrevoAdapter (brevo.ts) implements this interface.
// Domain logic in packages/core depends on these types, not on Brevo directly.
// See Artifact 07 §1.5 for the full specification.
// ---------------------------------------------------------------------------

/**
 * Contact data for creating or updating a subscriber in the email provider.
 * Maps to Brevo custom attributes defined in Artifact 07 §1.2.
 */
export interface Contact {
  email: string;
  firstName: string;
  lastName?: string;
  source: 'petition' | 'standalone' | 'volunteer' | 'blog' | 'footer' | 'event';
  signatureNumber?: number;
  referralCode?: string;
  verificationStatus?: 'verified' | 'flagged' | 'rejected';
  city?: string;
  signedAt?: string; // ISO 8601 date
  isVolunteer?: boolean;
  volunteerRoles?: string[];
  neighborhood?: string;
  listIds: number[]; // Provider list IDs to add contact to on creation
}

/**
 * Transactional email sent via a provider template.
 * Template IDs are configured per email type in environment variables.
 */
export interface TransactionalEmail {
  templateId: number;
  to: string;
  toName?: string;
  params: Record<string, unknown>; // Template variables
  tags?: string[]; // For tracking/reporting in the email provider
}

/**
 * Campaign email sent to a list of subscribers.
 * Created as a draft first, then sent immediately or scheduled.
 */
export interface CampaignEmail {
  name: string; // Internal campaign name
  subject: string;
  templateId: number;
  listIds: number[]; // Recipient lists
  params?: Record<string, unknown>;
  tags?: string[];
  scheduledAt?: string; // ISO 8601 — omit for immediate send
}

/** Numeric list ID in the email provider. */
export type ListId = number;

/**
 * Email port interface. Any email service adapter (Brevo, Resend, etc.)
 * must implement this interface.
 */
export interface EmailPort {
  /**
   * Create or update a contact in the email provider.
   * If the email already exists, the contact is updated (not duplicated).
   * Returns the provider's contact ID.
   */
  createOrUpdateContact(contact: Contact): Promise<{ id: string }>;

  /**
   * Add a contact to one or more lists by email.
   */
  addContactToLists(email: string, listIds: number[]): Promise<void>;

  /**
   * Remove a contact from a single list by email.
   */
  removeContactFromList(email: string, listId: number): Promise<void>;

  /**
   * Send a transactional email using a provider template.
   * Returns the provider's message ID for tracking.
   */
  sendTransactional(email: TransactionalEmail): Promise<{ messageId: string }>;

  /**
   * Update one or more attributes on an existing contact.
   */
  updateContactAttribute(
    email: string,
    attributes: Record<string, unknown>,
  ): Promise<void>;

  /**
   * Create and send a campaign email to the specified lists.
   * Creates the campaign as a draft, then triggers send immediately
   * (or schedules if `scheduledAt` is set on the CampaignEmail).
   */
  sendCampaign(campaign: CampaignEmail): Promise<{ campaignId: string }>;
}
