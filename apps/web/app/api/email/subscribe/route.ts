// ---------------------------------------------------------------------------
// POST /api/email/subscribe — Email Subscription Endpoint
// ---------------------------------------------------------------------------
// Handles footer/page email signups. Validates input, checks Turnstile,
// inserts into email_subscribers, and fires Inngest event for welcome +
// nurture sequence.
//
// See Artifact 07 §4.2 for the full specification.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateEmailHash,
  generateIpHash,
} from '@confluenceohio/core/petition/dedup';
import { inngest } from '@/inngest/client';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Schema (Artifact 07 §4.2)
// ---------------------------------------------------------------------------

const SubscribeSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address.')
    .max(254)
    .trim()
    .transform((v) => v.toLowerCase()),
  firstName: z.string().max(100).trim().optional(),
  source: z.enum(['footer', 'blog', 'standalone', 'event']),
  turnstileToken: z.string().optional(),
  website: z.string().optional(), // Honeypot
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

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
    console.error('[Subscribe] Missing TURNSTILE_SECRET_KEY');
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
    console.error('[Subscribe] Turnstile verification failed:', error);
    return { valid: false, missing: true };
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // -- Parse body --
  let rawBody: Record<string, unknown>;
  try {
    rawBody = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  // -- Honeypot check --
  const honeypotValue = rawBody.website as string | undefined;
  if (honeypotValue && honeypotValue.trim() !== '') {
    // Return fake success to bots
    return NextResponse.json({ success: true });
  }

  // -- Turnstile verification --
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

  // -- Rate limiting --
  const rateLimitSalt = process.env.RATE_LIMIT_SALT;
  if (!rateLimitSalt) {
    console.error('[Subscribe] Missing RATE_LIMIT_SALT');
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  const ipHash = generateIpHash(clientIp, rateLimitSalt);
  const supabase = createServiceClient();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentSubmissions, error: rateLimitError } = await supabase
    .from('email_subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', oneHourAgo);

  if (rateLimitError) {
    console.error('[Subscribe] Rate limit query error:', rateLimitError);
    // Don't fail open — proceed but log the error
  }

  const maxAttempts = turnstile.valid ? 5 : 2;
  if ((recentSubmissions ?? 0) >= maxAttempts) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  }

  // -- Validate --
  const parsed = SubscribeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 422 },
    );
  }

  const { email, firstName, source } = parsed.data;
  const emailHash = generateEmailHash(email);

  // -- Check for existing subscriber --
  const { data: existing, error: existingError } = await supabase
    .from('email_subscribers')
    .select('id, status')
    .eq('email_hash', emailHash)
    .maybeSingle();

  if (existingError) {
    console.error('[Subscribe] Existing check error:', existingError);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  if (existing) {
    if (existing.status === 'unsubscribed') {
      // Re-subscribe: update status back to active
      const { error: resubError } = await supabase
        .from('email_subscribers')
        .update({
          status: 'active',
          unsubscribed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (resubError) {
        console.error('[Subscribe] Re-subscribe error:', resubError);
      }

      // Fire event for re-subscribed users too — they get a fresh welcome
      try {
        await inngest.send({
          name: 'subscriber/created',
          data: {
            subscriberId: existing.id,
            email,
            firstName: firstName || '',
            source,
          },
        });
      } catch (error) {
        console.error('[Subscribe] Inngest send failed (non-fatal):', error);
      }
    }

    // Return success regardless (no information leakage about existing subscribers)
    return NextResponse.json({ success: true });
  }

  // -- Insert new subscriber --
  const { data: subscriber, error: insertError } = await supabase
    .from('email_subscribers')
    .insert({
      email,
      email_hash: emailHash,
      first_name: firstName || null,
      source,
      status: 'active',
    })
    .select('id')
    .single();

  if (insertError || !subscriber) {
    console.error('[Subscribe] Insert error:', insertError);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  // -- Fire Inngest event for welcome + nurture sequence --
  try {
    await inngest.send({
      name: 'subscriber/created',
      data: {
        subscriberId: subscriber.id,
        email,
        firstName: firstName || '',
        source,
      },
    });
  } catch (error) {
    console.error('[Subscribe] Inngest send failed (non-fatal):', error);
  }

  return NextResponse.json({ success: true });
}
