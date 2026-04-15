import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateAddressHash,
  generateEmailHash,
  generateIpHash,
  generateReferralCode,
  generateVerificationToken,
} from '@confluenceohio/core/petition/dedup';
import { verifySmartyAddress, SmartyApiError } from '@confluenceohio/verification/smarty';
import type { SmartyVerificationResult } from '@confluenceohio/verification/smarty';
import type { VerificationStatus } from '@confluenceohio/db/types';
import { inngest } from '@/inngest/client';
import { createServiceClient } from '@/lib/supabase/service';
import { captureServerEvent } from '@confluenceohio/core/analytics/posthog-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Error codes matching Artifact 06 §6.1 error catalog. */
type ErrorCode =
  | 'TURNSTILE_FAILED'
  | 'TURNSTILE_EXPIRED'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'ADDRESS_INVALID'
  | 'ADDRESS_NOT_OHIO'
  | 'DUPLICATE_ADDRESS'
  | 'DUPLICATE_EMAIL'
  | 'SMARTY_API_ERROR'
  | 'DATABASE_ERROR'
  | 'INNGEST_ERROR';

interface ApiError {
  error: string;
  code: ErrorCode;
  field?: string;
  fields?: Record<string, string>;
}

interface ApiSuccess {
  success: true;
  signature_number: number;
  referral_code: string;
  redirect: string;
}

// ---------------------------------------------------------------------------
// Zod Schema (Artifact 06 §3.5)
// ---------------------------------------------------------------------------

const PetitionSignSchema = z.object({
  firstName: z.string().min(1, 'Please enter your first name').max(100).trim(),
  lastName: z.string().min(1, 'Please enter your last name').max(100).trim(),
  email: z.string().email('Please enter a valid email address').max(254).trim()
    .transform((v) => v.toLowerCase()),
  streetAddress: z.string().min(5, 'Please enter your street address').max(200).trim(),
  aptUnit: z.string().max(50).trim().optional().default(''),
  city: z.string().min(1, 'City is required').max(100).trim(),
  state: z.literal('OH', { errorMap: () => ({ message: 'This petition requires an Ohio address' }) }),
  zipCode: z.string().regex(/^\d{5}$/, 'Please enter a valid 5-digit ZIP code'),
  emailOptIn: z.preprocess(
    (v) => v === 'true' || v === true || v === 'on',
    z.boolean().default(true),
  ),
  turnstileToken: z.string().optional(),
  website: z.string().optional(), // Honeypot
  ref: z.string().max(20).optional(), // Referral code
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags from text input. */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/** Sanitize all string values in a record — strip HTML, normalize whitespace. */
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

/** Determine verification_status from Smarty result (Artifact 06 §3.9). */
function determineVerificationStatus(result: SmartyVerificationResult): VerificationStatus {
  if (!result.isValid || !result.isOhio) return 'rejected';
  if (result.isCMRA || result.isVacant || !result.isResidential || result.dpvMatchCode === 'D') {
    return 'flagged';
  }
  return 'verified';
}

/** Extract client IP from request headers. */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/** Detect whether this is a form-urlencoded POST (progressive enhancement). */
function isFormPost(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') || '';
  return contentType.includes('application/x-www-form-urlencoded');
}

/** Build an error response — JSON for JS clients, 302 redirect for form posts. */
function errorResponse(
  request: NextRequest,
  formPost: boolean,
  error: ApiError,
  status: number,
): NextResponse {
  if (formPost) {
    const url = new URL('/sign', request.url);
    url.searchParams.set('error', error.code);
    return NextResponse.redirect(url, 302);
  }
  return NextResponse.json(error, { status });
}

/** Build a success response — JSON for JS clients, 302 redirect for form posts. */
function successResponse(
  request: NextRequest,
  formPost: boolean,
  data: ApiSuccess,
): NextResponse {
  if (formPost) {
    return NextResponse.redirect(new URL(data.redirect, request.url), 302);
  }
  return NextResponse.json(data);
}

/** Error messages per code (Artifact 06 §6.1). */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  TURNSTILE_FAILED: 'Something went wrong. Please refresh the page and try again.',
  TURNSTILE_EXPIRED: 'Your session expired. Please refresh the page and try again.',
  RATE_LIMITED: "You've made too many attempts. Please try again in an hour.",
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  ADDRESS_INVALID:
    "We couldn't verify this address. Please check it and try again. Make sure to include your full street address.",
  ADDRESS_NOT_OHIO:
    'This petition requires an Ohio address. If you live in Ohio, please check your address and try again.',
  DUPLICATE_ADDRESS:
    'It looks like someone at this address has already signed! Share with friends to help us reach our goal.',
  DUPLICATE_EMAIL: "You've already signed! Share with friends to help us reach our goal.",
  SMARTY_API_ERROR:
    "We're having trouble verifying addresses right now. Please try again in a few minutes.",
  DATABASE_ERROR:
    'Something went wrong on our end. Your information was not saved. Please try again.',
  INNGEST_ERROR: '', // Silent — signature already saved
};

// ---------------------------------------------------------------------------
// Turnstile verification (Step 1)
// ---------------------------------------------------------------------------

interface TurnstileResult {
  valid: boolean;
  missing: boolean; // Token absent (e.g., ad blocker)
  errorCode?: string;
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
    console.error('[Petition] Missing TURNSTILE_SECRET_KEY');
    return { valid: false, missing: false, errorCode: 'config-error' };
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

    const data = await response.json() as {
      success: boolean;
      'error-codes'?: string[];
    };

    if (data.success) {
      return { valid: true, missing: false };
    }

    const errorCodes = data['error-codes'] || [];
    return {
      valid: false,
      missing: false,
      errorCode: errorCodes[0] || 'unknown',
    };
  } catch (error) {
    console.error('[Petition] Turnstile verification failed:', error);
    // Network error verifying — treat as missing (stricter rate limit applies)
    return { valid: false, missing: true };
  }
}

// ---------------------------------------------------------------------------
// Parse request body
// ---------------------------------------------------------------------------

async function parseBody(
  request: NextRequest,
  formPost: boolean,
): Promise<Record<string, unknown>> {
  if (formPost) {
    const formData = await request.formData();
    const body: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      // Map form field names to camelCase expected by schema
      body[camelCaseKey(key)] = value;
    }
    return body;
  }
  return (await request.json()) as Record<string, unknown>;
}

/** Convert form field names (kebab-case or snake_case) to camelCase. */
function camelCaseKey(key: string): string {
  // Map HTML form field names to the camelCase names the Zod schema expects.
  const map: Record<string, string> = {
    first_name: 'firstName',
    firstName: 'firstName',
    last_name: 'lastName',
    lastName: 'lastName',
    email: 'email',
    street_address: 'streetAddress',
    streetAddress: 'streetAddress',
    apt_unit: 'aptUnit',
    aptUnit: 'aptUnit',
    city: 'city',
    state: 'state',
    zip_code: 'zipCode',
    zipCode: 'zipCode',
    email_opt_in: 'emailOptIn',
    emailOptIn: 'emailOptIn',
    'cf-turnstile-response': 'turnstileToken',
    turnstileToken: 'turnstileToken',
    website: 'website',
    ref: 'ref',
  };
  return map[key] || key;
}

// ---------------------------------------------------------------------------
// POST /api/petition/sign
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const formPost = isFormPost(request);
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  // -----------------------------------------------------------------------
  // Step 1: Parse request body
  // -----------------------------------------------------------------------
  let rawBody: Record<string, unknown>;
  try {
    rawBody = await parseBody(request, formPost);
  } catch {
    return errorResponse(request, formPost, {
      error: 'Invalid request body',
      code: 'VALIDATION_ERROR',
    }, 400);
  }

  // -----------------------------------------------------------------------
  // Step 2: Validate Turnstile token
  // -----------------------------------------------------------------------
  const turnstile = await verifyTurnstile(
    rawBody.turnstileToken as string | undefined,
    clientIp,
  );

  if (!turnstile.valid && !turnstile.missing) {
    // Token was present but invalid
    const failureReason = turnstile.errorCode === 'timeout-or-duplicate'
      ? 'turnstile_expired' : 'turnstile_failed';
    captureServerEvent(
      generateIpHash(clientIp, process.env.RATE_LIMIT_SALT ?? 'fallback'),
      'petition_verification_failed',
      { failure_reason: failureReason },
    );
    if (turnstile.errorCode === 'timeout-or-duplicate') {
      return errorResponse(request, formPost, {
        error: ERROR_MESSAGES.TURNSTILE_EXPIRED,
        code: 'TURNSTILE_EXPIRED',
      }, 400);
    }
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.TURNSTILE_FAILED,
      code: 'TURNSTILE_FAILED',
    }, 400);
  }

  const turnstileValid = turnstile.valid;

  // -----------------------------------------------------------------------
  // Step 3: Check honeypot
  // -----------------------------------------------------------------------
  const honeypotValue = rawBody.website as string | undefined;
  if (honeypotValue && honeypotValue.trim() !== '') {
    // Bot detected — return fake success (Artifact 06 §3.3)
    return NextResponse.json({
      success: true,
      signature_number: Math.floor(Math.random() * 10000),
      referral_code: 'FAKE-CODE',
      redirect: '/sign/thank-you',
    });
  }

  // -----------------------------------------------------------------------
  // Step 4: Rate limit check
  // -----------------------------------------------------------------------
  const rateLimitSalt = process.env.RATE_LIMIT_SALT;
  if (!rateLimitSalt) {
    console.error('[Petition] Missing RATE_LIMIT_SALT');
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.DATABASE_ERROR,
      code: 'DATABASE_ERROR',
    }, 500);
  }

  const ipHash = generateIpHash(clientIp, rateLimitSalt);
  const supabase = createServiceClient();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentSubmissions, error: rateLimitError } = await supabase
    .from('signatures')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('signed_at', oneHourAgo);

  if (rateLimitError) {
    console.error('[Petition] Rate limit query error:', rateLimitError);
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.DATABASE_ERROR,
      code: 'DATABASE_ERROR',
    }, 500);
  }

  const maxSubmissions = turnstileValid ? 3 : 1;
  if ((recentSubmissions ?? 0) >= maxSubmissions) {
    captureServerEvent(ipHash, 'petition_verification_failed', {
      failure_reason: 'rate_limited',
    });
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.RATE_LIMITED,
      code: 'RATE_LIMITED',
    }, 429);
  }

  // -----------------------------------------------------------------------
  // Step 5: Input sanitization & Zod validation
  // -----------------------------------------------------------------------
  const sanitized = sanitizeInput(rawBody);
  const parsed = PetitionSignSchema.safeParse(sanitized);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.VALIDATION_ERROR,
      code: 'VALIDATION_ERROR',
      fields: fieldErrors,
    }, 422);
  }

  const data = parsed.data;

  // -----------------------------------------------------------------------
  // Step 6: Smarty US Street Address API verification
  // -----------------------------------------------------------------------
  let smartyResult: SmartyVerificationResult;
  try {
    smartyResult = await verifySmartyAddress(
      data.streetAddress,
      data.aptUnit || '',
      data.city,
      data.state,
      data.zipCode,
    );
  } catch (err) {
    if (err instanceof SmartyApiError) {
      console.error('[Petition] Smarty API error:', err.message, 'status:', err.statusCode);
    } else {
      console.error('[Petition] Smarty unexpected error:', err);
    }
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.SMARTY_API_ERROR,
      code: 'SMARTY_API_ERROR',
    }, 503);
  }

  // -----------------------------------------------------------------------
  // Step 7: Determine verification status
  // -----------------------------------------------------------------------
  const verificationStatus = determineVerificationStatus(smartyResult);

  if (!smartyResult.isValid) {
    captureServerEvent(ipHash, 'petition_verification_failed', {
      failure_reason: 'invalid_address',
    });
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.ADDRESS_INVALID,
      code: 'ADDRESS_INVALID',
      field: 'streetAddress',
    }, 422);
  }

  if (!smartyResult.isOhio) {
    captureServerEvent(ipHash, 'petition_verification_failed', {
      failure_reason: 'non_ohio',
    });
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.ADDRESS_NOT_OHIO,
      code: 'ADDRESS_NOT_OHIO',
      field: 'streetAddress',
    }, 422);
  }

  // -----------------------------------------------------------------------
  // Step 8: Generate address hash and email hash
  // -----------------------------------------------------------------------
  const addressHash = generateAddressHash({
    line1: smartyResult.canonicalAddress.line1,
    line2: smartyResult.canonicalAddress.line2,
    city: smartyResult.canonicalAddress.city,
    state: smartyResult.canonicalAddress.state,
    zipCode: smartyResult.canonicalAddress.zipCode,
  });

  const emailHash = generateEmailHash(data.email);

  // -----------------------------------------------------------------------
  // Step 9: Duplicate detection
  // -----------------------------------------------------------------------
  const [addressDupeResult, emailDupeResult] = await Promise.all([
    supabase
      .from('signatures')
      .select('id, first_name, signature_number')
      .eq('address_hash', addressHash)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('signatures')
      .select('id, first_name, signature_number')
      .eq('email', data.email)
      .is('deleted_at', null)
      .maybeSingle(),
  ]);

  if (emailDupeResult.data) {
    captureServerEvent(emailHash, 'petition_verification_failed', {
      failure_reason: 'duplicate_email',
    });
    return errorResponse(request, formPost, {
      error: `You've already signed as signer #${emailDupeResult.data.signature_number}! Share with friends to help us reach our goal.`,
      code: 'DUPLICATE_EMAIL',
    }, 409);
  }

  if (addressDupeResult.data) {
    captureServerEvent(ipHash, 'petition_verification_failed', {
      failure_reason: 'duplicate_address',
    });
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.DUPLICATE_ADDRESS,
      code: 'DUPLICATE_ADDRESS',
    }, 409);
  }

  // -----------------------------------------------------------------------
  // Step 10: Insert signature record via RPC
  // -----------------------------------------------------------------------
  const referralCode = generateReferralCode();

  const { data: signatureRows, error: insertError } = await supabase.rpc(
    'insert_signature',
    {
      p_first_name: data.firstName,
      p_last_name: data.lastName,
      p_email: data.email,
      p_address_line_1: smartyResult.canonicalAddress.line1,
      p_address_line_2: smartyResult.canonicalAddress.line2,
      p_city: smartyResult.canonicalAddress.city,
      p_state: 'OH',
      p_zip_code: smartyResult.canonicalAddress.zipCode,
      p_zip_plus_4: smartyResult.canonicalAddress.zipPlus4,
      p_address_hash: addressHash,
      p_email_hash: emailHash,
      p_smarty_dpv_match_code: smartyResult.dpvMatchCode,
      p_smarty_rdi: smartyResult.isResidential ? 'Residential' : 'Commercial',
      p_smarty_dpv_cmra: smartyResult.isCMRA ? 'Y' : 'N',
      p_smarty_dpv_vacant: smartyResult.isVacant ? 'Y' : 'N',
      p_smarty_latitude: smartyResult.latitude,
      p_smarty_longitude: smartyResult.longitude,
      p_verification_status: verificationStatus,
      p_ip_hash: ipHash,
      p_user_agent: userAgent,
      p_turnstile_token_valid: turnstileValid,
      p_referral_code: referralCode,
      p_referred_by_code: data.ref || null,
      p_email_opt_in: data.emailOptIn,
    },
  );

  if (insertError || !signatureRows || signatureRows.length === 0) {
    console.error('[Petition] Insert error:', insertError);
    return errorResponse(request, formPost, {
      error: ERROR_MESSAGES.DATABASE_ERROR,
      code: 'DATABASE_ERROR',
    }, 500);
  }

  const signature = signatureRows[0] as {
    id: string;
    signature_number: number;
    referral_code: string;
  };

  // -----------------------------------------------------------------------
  // Step 11: Create email verification token
  // -----------------------------------------------------------------------
  const { rawToken, tokenHash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  // Insert into email_verification_tokens table
  const { error: tokenInsertError } = await supabase
    .from('email_verification_tokens')
    .insert({
      signature_id: signature.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (tokenInsertError) {
    console.error('[Petition] Token insert error:', tokenInsertError);
    // Non-fatal — signature is recorded, verification can be resent
  }

  // Update signature record with token hash for quick lookup
  const { error: tokenUpdateError } = await supabase
    .from('signatures')
    .update({
      email_token_hash: tokenHash,
      email_token_expires: expiresAt.toISOString(),
    })
    .eq('id', signature.id);

  if (tokenUpdateError) {
    console.error('[Petition] Token update on signature error:', tokenUpdateError);
    // Non-fatal
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';
  const verificationUrl = `${siteUrl}/sign/verify?token=${rawToken}`;

  // -----------------------------------------------------------------------
  // Step 11b: Server-side analytics — petition_verification_success (§3.2.2)
  // -----------------------------------------------------------------------
  captureServerEvent(emailHash, 'petition_verification_success', {
    verification_status: verificationStatus,
    signature_number: signature.signature_number,
    is_referred: !!data.ref,
  });

  // -----------------------------------------------------------------------
  // Step 12: Fire Inngest event for async processing
  // -----------------------------------------------------------------------
  try {
    await inngest.send({
      name: 'petition/signature.created',
      data: {
        signatureId: signature.id,
        signatureNumber: signature.signature_number,
        email: data.email,
        firstName: data.firstName,
        referralCode: signature.referral_code,
        referredByCode: data.ref || null,
        emailOptIn: data.emailOptIn,
        verificationUrl,
        verificationStatus,
      },
    });
  } catch (error) {
    // Non-fatal — signature is recorded (Artifact 06 §6.1: INNGEST_ERROR is silent)
    console.error('[Petition] Inngest send failed:', error);
  }

  // -----------------------------------------------------------------------
  // Step 13: Return success
  // -----------------------------------------------------------------------
  const redirectUrl = `/sign/thank-you?n=${signature.signature_number}&ref=${signature.referral_code}`;

  return successResponse(request, formPost, {
    success: true,
    signature_number: signature.signature_number,
    referral_code: signature.referral_code,
    redirect: redirectUrl,
  });
}
