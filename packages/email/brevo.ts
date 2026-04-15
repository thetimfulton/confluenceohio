// ---------------------------------------------------------------------------
// Brevo Email Adapter — packages/email/brevo.ts
// ---------------------------------------------------------------------------
// Hexagonal architecture: this adapter implements EmailPort for Brevo.
// All Brevo API v3 calls are encapsulated here. Swapping to another ESP
// means writing a new adapter, not changing domain logic.
// See Artifact 07 §1.4 for the full specification.
// ---------------------------------------------------------------------------

import type {
  EmailPort,
  Contact,
  TransactionalEmail,
  CampaignEmail,
} from './types';

const BREVO_API_URL = 'https://api.brevo.com/v3';

export class BrevoAdapter implements EmailPort {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T = unknown>(
    path: string,
    options: RequestInit = {},
  ): Promise<T | null> {
    const response = await fetch(`${BREVO_API_URL}${path}`, {
      ...options,
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new BrevoApiError(
        `Brevo API error: ${response.status} ${response.statusText}`,
        response.status,
        error,
      );
    }

    // 204 No Content (e.g., contact update, list add) returns no body
    if (response.status === 204) return null;
    return response.json() as Promise<T>;
  }

  /**
   * Create or update a contact in Brevo.
   * Uses updateEnabled=true so existing contacts are updated, not rejected.
   * Returns the Brevo contact ID.
   */
  async createOrUpdateContact(contact: Contact): Promise<{ id: string }> {
    const attributes: Record<string, unknown> = {
      FIRSTNAME: contact.firstName,
      SOURCE: contact.source,
    };

    // Only set optional attributes when provided (avoids clearing existing values)
    if (contact.lastName !== undefined) attributes.LASTNAME = contact.lastName;
    if (contact.signatureNumber !== undefined) attributes.SIGNATURE_NUMBER = contact.signatureNumber;
    if (contact.referralCode !== undefined) attributes.REFERRAL_CODE = contact.referralCode;
    if (contact.verificationStatus !== undefined) attributes.VERIFICATION_STATUS = contact.verificationStatus;
    if (contact.city !== undefined) attributes.CITY = contact.city;
    if (contact.signedAt !== undefined) attributes.SIGNED_AT = contact.signedAt;
    if (contact.isVolunteer !== undefined) attributes.VOLUNTEER = contact.isVolunteer;
    if (contact.volunteerRoles !== undefined) attributes.VOLUNTEER_ROLES = contact.volunteerRoles.join(', ');
    if (contact.neighborhood !== undefined) attributes.NEIGHBORHOOD = contact.neighborhood;

    const body = {
      email: contact.email,
      attributes,
      listIds: contact.listIds,
      updateEnabled: true,
    };

    const result = await this.request<{ id: number }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { id: result?.id?.toString() ?? '' };
  }

  /**
   * Add a contact to one or more lists.
   */
  async addContactToLists(email: string, listIds: number[]): Promise<void> {
    for (const listId of listIds) {
      await this.request(`/contacts/lists/${listId}/contacts/add`, {
        method: 'POST',
        body: JSON.stringify({ emails: [email] }),
      });
    }
  }

  /**
   * Remove a contact from a list (e.g., moving from Disengaged to Engaged).
   */
  async removeContactFromList(email: string, listId: number): Promise<void> {
    await this.request(`/contacts/lists/${listId}/contacts/remove`, {
      method: 'POST',
      body: JSON.stringify({ emails: [email] }),
    });
  }

  /**
   * Send a transactional email using a Brevo template.
   * Template ID is configured per email type in environment variables.
   */
  async sendTransactional(
    email: TransactionalEmail,
  ): Promise<{ messageId: string }> {
    const body: Record<string, unknown> = {
      templateId: email.templateId,
      to: [{ email: email.to, name: email.toName }],
      params: email.params,
    };

    if (email.tags && email.tags.length > 0) {
      body.tags = email.tags;
    }

    const result = await this.request<{ messageId: string }>('/smtp/email', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { messageId: result?.messageId ?? '' };
  }

  /**
   * Update one or more attributes on an existing contact.
   */
  async updateContactAttribute(
    email: string,
    attributes: Record<string, unknown>,
  ): Promise<void> {
    await this.request(`/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify({ attributes }),
    });
  }

  /**
   * Create and immediately send (or schedule) a campaign email.
   * 1. POST /emailCampaigns to create the campaign as a draft
   * 2. POST /emailCampaigns/:id/sendNow to trigger delivery
   *    (or POST /emailCampaigns/:id/schedule if scheduledAt is set)
   */
  async sendCampaign(campaign: CampaignEmail): Promise<{ campaignId: string }> {
    const createBody: Record<string, unknown> = {
      name: campaign.name,
      subject: campaign.subject,
      templateId: campaign.templateId,
      recipients: { listIds: campaign.listIds },
      sender: { email: 'hello@confluenceohio.org', name: 'Confluence Ohio' },
    };

    if (campaign.params) {
      createBody.params = campaign.params;
    }
    if (campaign.tags && campaign.tags.length > 0) {
      createBody.tag = campaign.tags[0]; // Brevo campaigns support a single tag
    }

    const created = await this.request<{ id: number }>('/emailCampaigns', {
      method: 'POST',
      body: JSON.stringify(createBody),
    });

    const campaignId = created?.id?.toString() ?? '';

    if (campaign.scheduledAt) {
      await this.request(`/emailCampaigns/${campaignId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ scheduledAt: campaign.scheduledAt }),
      });
    } else {
      await this.request(`/emailCampaigns/${campaignId}/sendNow`, {
        method: 'POST',
      });
    }

    return { campaignId };
  }
}

/**
 * Structured error for Brevo API failures.
 * Preserves the HTTP status code and the raw error body from Brevo.
 */
export class BrevoApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = 'BrevoApiError';
  }
}
