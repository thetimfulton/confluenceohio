import { z } from 'zod';

// ---------------------------------------------------------------------------
// ActBlue Webhook Payload Types
// ---------------------------------------------------------------------------
// Reconstructed from ActBlue integration partner docs and embed JS API.
// Fields marked [VERIFY] should be confirmed against ActBlue's authenticated
// webhook docs at secure.actblue.com/docs/webhooks before going live.

export interface ActBlueContributor {
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  addr1?: string;
  addr2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  employerName?: string;
  occupation?: string;
  isEligibleForExpressLane: boolean;
}

export interface ActBlueLineItem {
  sequence?: number;
  entityId?: number;
  fecId?: string;
  committeeName?: string;
  amount: string; // Dollar amount as string, e.g. "25.00"
  paidAt: string; // ISO 8601 timestamp
  recurringPeriod?: string; // "once" | "monthly" | "weekly"
  recurringDuration?: number;
}

export interface ActBlueWebhookPayload {
  donor: ActBlueContributor;
  orderNumber: string;
  contribution: {
    createdAt: string;
    refcode?: string;
    refcode2?: string;
  };
  lineitems: ActBlueLineItem[];
}

// ---------------------------------------------------------------------------
// Zod Schemas (used by parse-webhook)
// ---------------------------------------------------------------------------

export const contributorSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  addr1: z.string().optional(),
  addr2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  employerName: z.string().optional(),
  occupation: z.string().optional(),
  isEligibleForExpressLane: z.boolean().default(false),
});

export const lineItemSchema = z.object({
  sequence: z.number().optional(),
  entityId: z.number().optional(),
  fecId: z.string().optional(),
  committeeName: z.string().optional(),
  amount: z.string(),
  paidAt: z.string(),
  recurringPeriod: z.string().optional(),
  recurringDuration: z.number().optional(),
});

export const webhookPayloadSchema = z.object({
  donor: contributorSchema,
  orderNumber: z.string(),
  contribution: z.object({
    createdAt: z.string(),
    refcode: z.string().optional(),
    refcode2: z.string().optional(),
  }),
  lineitems: z.array(lineItemSchema).min(1),
});

// ---------------------------------------------------------------------------
// Internal Domain Types (infrastructure-free)
// ---------------------------------------------------------------------------

export interface DonationEvent {
  type: 'contribution';
  orderNumber: string;
  donorEmail: string;
  donorName: string;
  amountCents: number;
  recurring: boolean;
  refcode: string | null;
  refcode2: string | null;
  expressLane: boolean;
  lineItems: ActBlueLineItem[];
  donatedAt: string;
}

export interface RefundEvent {
  type: 'refund';
  orderNumber: string;
  amountCents: number;
  refundedAt: string;
}
