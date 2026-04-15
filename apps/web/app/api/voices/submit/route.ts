import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, createHash } from 'crypto';
import { voiceSubmitSchema, sanitizeInput, MIN_TIME_ON_PAGE_MS } from '@confluenceohio/core/voices/validation';
import { generateVoiceSlug } from '@confluenceohio/core/voices/slug';
import { generateIpHash } from '@confluenceohio/core/petition/dedup';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Always return 200 with this shape to avoid leaking validation state (§7.2). */
const SUCCESS_RESPONSE = {
  success: true,
  message: 'Thanks! Check your email to verify your submission.',
};

// ---------------------------------------------------------------------------
// Turnstile verification
// ---------------------------------------------------------------------------

async function verifyTurnstile(
  token: string | undefined,
  clientIp: string,
): Promise<{ valid: boolean; missing: boolean }> {
  if (!token || token.trim() === '') {
    return { valid: false, missing: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('[Voices] Missing TURNSTILE_SECRET_KEY');
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

    const data = (await response.json()) as { success: boolean };
    return { valid: data.success, missing: false };
  } catch (error) {
    console.error('[Voices] Turnstile verification failed:', error);
    return { valid: false, missing: true };
  }
}

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

function isFormPost(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') || '';
  return contentType.includes('application/x-www-form-urlencoded');
}

/** Generate a SHA-256 hash of a verification token. */
function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

// ---------------------------------------------------------------------------
// POST /api/voices/submit (Artifact 10 §7.2)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const formPost = isFormPost(request);

  // ── Step 1: Parse request body ──
  let rawBody: Record<string, unknown>;
  try {
    if (formPost) {
      const formData = await request.formData();
      const body: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
      rawBody = body;
    } else {
      rawBody = (await request.json()) as Record<string, unknown>;
    }
  } catch {
    // Even on parse error, return success shape (§7.2: never leak validation state)
    return NextResponse.json(SUCCESS_RESPONSE);
  }

  // ── Step 2: Check honeypot (silent reject with fake success) ──
  const honeypotValue = rawBody.website as string | undefined;
  if (honeypotValue && honeypotValue.trim() !== '') {
    console.log('[Voices] Honeypot triggered');
    return NextResponse.json(SUCCESS_RESPONSE);
  }

  // ── Step 3: Validate Turnstile token ──
  const turnstile = await verifyTurnstile(
    (rawBody.cf_turnstile_response || rawBody['cf-turnstile-response']) as string | undefined,
    clientIp,
  );

  if (!turnstile.valid && !turnstile.missing) {
    // Token present but invalid — still return fake success (§7.2)
    console.log('[Voices] Turnstile validation failed');
    return NextResponse.json(SUCCESS_RESPONSE);
  }

  // ── Step 4: Check time-on-page (< 30s = bot) ──
  const formLoadedAt = rawBody.form_loaded_at;
  if (formLoadedAt) {
    const loadedTs = typeof formLoadedAt === 'string' ? parseInt(formLoadedAt, 10) : formLoadedAt as number;
    if (!isNaN(loadedTs) && Date.now() - loadedTs < MIN_TIME_ON_PAGE_MS) {
      console.log('[Voices] Time-on-page check failed');
      return NextResponse.json(SUCCESS_RESPONSE);
    }
  }

  // ── Step 5: Sanitize & validate input ──
  const sanitized = sanitizeInput(rawBody);
  const parsed = voiceSubmitSchema.safeParse(sanitized);

  if (!parsed.success) {
    if (formPost) {
      const url = new URL('/voices/share', request.url);
      url.searchParams.set('error', 'validation');
      return NextResponse.redirect(url, 302);
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Please check the highlighted fields.',
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const supabase = createServiceClient();

  // ── Step 6: Email rate limit (1 submission per email per 24h) ──
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentByEmail, error: emailRateError } = await supabase
    .from('voice_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('author_email', data.author_email)
    .gte('submitted_at', twentyFourHoursAgo);

  if (emailRateError) {
    console.error('[Voices] Email rate limit query error:', emailRateError);
    return NextResponse.json(SUCCESS_RESPONSE);
  }

  if ((recentByEmail ?? 0) >= 1) {
    if (formPost) {
      const url = new URL('/voices/share', request.url);
      url.searchParams.set('error', 'rate_limited');
      return NextResponse.redirect(url, 302);
    }
    return NextResponse.json({
      success: false,
      error: "You've already submitted a perspective today. Please try again tomorrow.",
    }, { status: 429 });
  }

  // ── Step 7: IP rate limit (5 per hour) ──
  const rateLimitSalt = process.env.RATE_LIMIT_SALT;
  if (rateLimitSalt) {
    const ipHash = generateIpHash(clientIp, rateLimitSalt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentByIp } = await supabase
      .from('voice_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('submitted_at', oneHourAgo);

    if ((recentByIp ?? 0) >= 5) {
      console.log('[Voices] IP rate limit exceeded');
      return NextResponse.json(SUCCESS_RESPONSE);
    }
  }

  // ── Step 8: Generate slug ──
  const slug = generateVoiceSlug(data.title, data.body);

  // ── Step 9: Generate email verification token ──
  const rawToken = randomUUID();
  const tokenHash = hashToken(rawToken);
  const tokenExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  // ── Step 10: Build IP hash for the record ──
  const ipHash = rateLimitSalt ? generateIpHash(clientIp, rateLimitSalt) : null;

  // ── Step 11: Insert into voice_submissions (status: pending_email) ──
  const { error: insertError } = await supabase
    .from('voice_submissions')
    .insert({
      author_name: data.author_name,
      author_email: data.author_email,
      author_neighborhood: data.author_neighborhood || null,
      position: data.position,
      title: data.title || '',
      body: data.body,
      slug,
      moderation_status: 'pending_email',
      email_verified: false,
      email_token_hash: tokenHash,
      email_token_expires: tokenExpires.toISOString(),
      ip_hash: ipHash,
      submitted_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('[Voices] Insert error:', insertError);
    if (formPost) {
      const url = new URL('/voices/share', request.url);
      url.searchParams.set('error', 'server');
      return NextResponse.redirect(url, 302);
    }
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  // ── Step 12: Send verification email via Brevo ──
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';
  const verifyUrl = `${siteUrl}/api/voices/verify?token=${rawToken}`;

  try {
    const email = getEmailAdapter();
    await email.sendTransactional({
      templateId: getTemplateId('VOICE_EMAIL_VERIFY'),
      to: data.author_email,
      toName: data.author_name,
      params: {
        DISPLAY_NAME: data.author_name,
        VERIFY_URL: verifyUrl,
      },
      tags: ['voice-verification'],
    });
  } catch (error) {
    console.error('[Voices] Verification email send error (non-fatal):', error);
    // Non-fatal — the submission is recorded. User can request a resend.
  }

  // ── Step 13: Return success ──
  if (formPost) {
    return NextResponse.redirect(
      new URL('/voices/share/confirmed', request.url),
      302,
    );
  }

  return NextResponse.json(SUCCESS_RESPONSE);
}
