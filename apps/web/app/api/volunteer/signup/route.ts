import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateEmailHash,
  generateIpHash,
} from '@confluenceohio/core/petition/dedup';
import type { VolunteerRole } from '@confluenceohio/db/types';
import { getEmailAdapter } from '@confluenceohio/email';
import { inngest } from '@/inngest/client';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Constants (Artifact 08 §1, §2.3, §2.5)
// ---------------------------------------------------------------------------

const VALID_ROLES = [
  'signature_collector',
  'social_amplifier',
  'neighborhood_captain',
  'event_organizer',
  'story_collector',
  'design_content',
  'outreach_liaison',
] as const;

const VALID_AVAILABILITY = [
  'weekday_mornings',
  'weekday_evenings',
  'weekends',
  'flexible',
] as const;

const VALID_REFERRAL_SOURCES = [
  'petition',
  'social_media',
  'friend_family',
  'news',
  'community_event',
  'search',
  'other',
] as const;

/** Display names for roles (Artifact 08 §1.1–§1.7). */
const ROLE_DISPLAY_NAMES: Record<VolunteerRole, string> = {
  signature_collector: 'Signature Collector',
  social_amplifier: 'Social Amplifier',
  neighborhood_captain: 'Neighborhood Captain',
  event_organizer: 'Event Organizer',
  story_collector: 'Story Collector',
  design_content: 'Design & Content Creator',
  outreach_liaison: 'Outreach Liaison',
};

// ---------------------------------------------------------------------------
// Zod Schema (Artifact 08 §2.3)
// ---------------------------------------------------------------------------

const VolunteerSignupSchema = z.object({
  firstName: z.string().min(1, 'Please enter your first name').max(100).trim(),
  lastName: z.string().min(1, 'Please enter your last name').max(100).trim(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254)
    .trim()
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  neighborhood: z.string().max(100).trim().optional(),
  roles: z
    .array(z.enum(VALID_ROLES))
    .min(1, 'Please select at least one role'),
  availability: z.array(z.enum(VALID_AVAILABILITY)).optional().default([]),
  referralSource: z.enum(VALID_REFERRAL_SOURCES).optional(),
  notes: z.string().max(500).trim().optional().default(''),
  turnstileToken: z.string().optional(),
  website: z.string().optional(), // Honeypot
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

function sanitizeInput(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = stripHtml(value).replace(/\s+/g, ' ').trim();
    } else {
      result[key] = value;
    }
  }
  return result;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function formatRoleNames(roles: VolunteerRole[]): string {
  return roles.map((r) => ROLE_DISPLAY_NAMES[r]).join(', ');
}

// ---------------------------------------------------------------------------
// Turnstile verification (same pattern as petition route)
// ---------------------------------------------------------------------------

interface TurnstileResult {
  valid: boolean;
  missing: boolean;
}

async function verifyTurnstile(
  token: string | undefined,
  clientIp: string,
): Promise<TurnstileResult> {
  if (!token || token.trim() === '') {
    return { valid: false, missing: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('[Volunteer] Missing TURNSTILE_SECRET_KEY');
    return { valid: false, missing: false };
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          response: token,
          remoteip: clientIp,
        }),
      },
    );

    const data = (await response.json()) as {
      success: boolean;
      'error-codes'?: string[];
    };

    return { valid: data.success, missing: false };
  } catch (error) {
    console.error('[Volunteer] Turnstile verification failed:', error);
    return { valid: false, missing: true };
  }
}

// ---------------------------------------------------------------------------
// POST /api/volunteer/signup (Artifact 08 §3.1)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // ── Parse body ──
  let rawBody: Record<string, unknown>;
  try {
    rawBody = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  // ── Honeypot check ──
  const honeypotValue = rawBody.website as string | undefined;
  if (honeypotValue && honeypotValue.trim() !== '') {
    return NextResponse.json({
      success: true,
      returning: false,
      redirect: '/volunteer/thank-you',
    });
  }

  // ── Turnstile verification ──
  const turnstile = await verifyTurnstile(
    rawBody.turnstileToken as string | undefined,
    clientIp,
  );

  if (!turnstile.valid && !turnstile.missing) {
    return NextResponse.json(
      { error: 'Verification failed. Please refresh the page and try again.' },
      { status: 400 },
    );
  }

  // ── Rate limiting ──
  const rateLimitSalt = process.env.RATE_LIMIT_SALT;
  if (!rateLimitSalt) {
    console.error('[Volunteer] Missing RATE_LIMIT_SALT');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  const ipHash = generateIpHash(clientIp, rateLimitSalt);
  const supabase = createServiceClient();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentSubmissions, error: rateLimitError } = await supabase
    .from('volunteers')
    .select('id', { count: 'exact', head: true })
    .gte('signed_up_at', oneHourAgo);

  if (rateLimitError) {
    console.error('[Volunteer] Rate limit query error:', rateLimitError);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  // Stricter limit without valid Turnstile (Artifact 08 §2.8)
  const maxAttempts = turnstile.valid ? 3 : 1;
  if ((recentSubmissions ?? 0) >= maxAttempts) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  }

  // ── Sanitize & validate ──
  const sanitized = sanitizeInput(rawBody);
  const parsed = VolunteerSignupSchema.safeParse(sanitized);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      {
        error: 'Please check the highlighted fields.',
        fields: fieldErrors,
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // ── Duplicate check — merge roles if returning volunteer (§3.1) ──
  const { data: existing, error: dupeError } = await supabase
    .from('volunteers')
    .select('id, first_name, roles')
    .eq('email', data.email)
    .maybeSingle();

  if (dupeError) {
    console.error('[Volunteer] Duplicate check error:', dupeError);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  if (existing) {
    // Returning volunteer — merge roles
    const existingRoles: string[] = existing.roles || [];
    const mergedRoles = [...new Set([...existingRoles, ...data.roles])];
    const newRoles = data.roles.filter((r) => !existingRoles.includes(r));

    const { error: updateError } = await supabase
      .from('volunteers')
      .update({
        roles: mergedRoles,
        availability: data.availability.join(', ') || null,
        neighborhood: data.neighborhood || null,
        phone: data.phone || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('[Volunteer] Update error:', updateError);
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 },
      );
    }

    // Update Brevo contact with new roles
    try {
      const email = getEmailAdapter();
      const volunteerListId = parseInt(process.env.BREVO_LIST_VOLUNTEERS || '0', 10);
      await email.createOrUpdateContact({
        email: data.email,
        firstName: existing.first_name,
        lastName: data.lastName,
        source: 'volunteer',
        isVolunteer: true,
        volunteerRoles: mergedRoles,
        neighborhood: data.neighborhood,
        listIds: volunteerListId ? [volunteerListId] : [],
      });
    } catch (error) {
      console.error('[Volunteer] Brevo update error (non-fatal):', error);
    }

    // Fire update event (§3.2)
    try {
      await inngest.send({
        name: 'volunteer/signup.updated',
        data: {
          volunteerId: existing.id,
          email: data.email,
          firstName: existing.first_name,
          lastName: data.lastName,
          roles: mergedRoles,
          newRoles,
          neighborhood: data.neighborhood || null,
        },
      });
    } catch (error) {
      console.error('[Volunteer] Inngest send failed (non-fatal):', error);
    }

    return NextResponse.json({
      success: true,
      returning: true,
      newRoles: formatRoleNames(newRoles as VolunteerRole[]),
      redirect: '/volunteer/thank-you?returning=true',
    });
  }

  // ── Insert new volunteer ──
  const { data: volunteer, error: insertError } = await supabase
    .from('volunteers')
    .insert({
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
      neighborhood: data.neighborhood || null,
      roles: data.roles,
      availability: data.availability.join(', ') || null,
      notes: data.notes || null,
      status: 'active',
    })
    .select('id')
    .single();

  if (insertError || !volunteer) {
    console.error('[Volunteer] Insert error:', insertError);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  // ── Create/update email subscriber (upsert) ──
  const emailHash = generateEmailHash(data.email);
  const { error: subscriberError } = await supabase
    .from('email_subscribers')
    .upsert(
      {
        email: data.email,
        email_hash: emailHash,
        first_name: data.firstName,
        source: 'volunteer' as const,
        status: 'active' as const,
      },
      { onConflict: 'email_hash', ignoreDuplicates: true },
    );

  if (subscriberError) {
    console.error('[Volunteer] Subscriber upsert error (non-fatal):', subscriberError);
  }

  // ── Create/update Brevo contact ──
  try {
    const email = getEmailAdapter();
    const allListId = parseInt(process.env.BREVO_LIST_ALL || '0', 10);
    const volunteerListId = parseInt(process.env.BREVO_LIST_VOLUNTEERS || '0', 10);
    const listIds = [allListId, volunteerListId].filter((id) => id > 0);

    await email.createOrUpdateContact({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      source: 'volunteer',
      isVolunteer: true,
      volunteerRoles: data.roles,
      neighborhood: data.neighborhood,
      listIds,
    });
  } catch (error) {
    console.error('[Volunteer] Brevo contact creation error (non-fatal):', error);
  }

  // ── Fire Inngest event for onboarding (§3.2) ──
  try {
    await inngest.send({
      name: 'volunteer/signup.created',
      data: {
        volunteerId: volunteer.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: data.roles,
        neighborhood: data.neighborhood || null,
      },
    });
  } catch (error) {
    console.error('[Volunteer] Inngest send failed (non-fatal):', error);
  }

  return NextResponse.json({
    success: true,
    returning: false,
    redirect: '/volunteer/thank-you',
  });
}
