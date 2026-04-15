import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateVerificationToken } from '@confluenceohio/core/petition/dedup';
import { inngest } from '@/inngest/client';
import { createServiceClient } from '@/lib/supabase/service';

const MAX_RESENDS = 3;

const bodySchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

/**
 * POST /api/petition/verify/resend
 *
 * Resends a verification email for an existing signature (Artifact 06 §5.2 Handoff 6).
 *
 * - Looks up the signature by email
 * - Rate-limits to 3 total verification tokens per signature
 * - Generates a new token (old tokens remain valid until their own expiry)
 * - Fires an Inngest event to send the verification email
 */
export async function POST(request: NextRequest) {
  // -------------------------------------------------------------------------
  // Parse body
  // -------------------------------------------------------------------------
  let data: z.infer<typeof bodySchema>;
  try {
    const body = await request.json();
    data = bodySchema.parse(body);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid email address.' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // -------------------------------------------------------------------------
  // Look up signature by email
  // -------------------------------------------------------------------------
  const { data: signature, error: sigError } = await supabase
    .from('signatures')
    .select('id, signature_number, first_name, email_verified, referral_code')
    .eq('email', data.email)
    .maybeSingle();

  if (sigError) {
    console.error('[Resend] Signature lookup error:', sigError);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  // Always return success to avoid leaking whether an email exists
  if (!signature) {
    return NextResponse.json({ success: true });
  }

  // Already verified — no need to resend
  if (signature.email_verified) {
    return NextResponse.json({ success: true });
  }

  // -------------------------------------------------------------------------
  // Rate limit: max 3 tokens per signature
  // -------------------------------------------------------------------------
  const { count, error: countError } = await supabase
    .from('email_verification_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('signature_id', signature.id);

  if (countError) {
    console.error('[Resend] Token count error:', countError);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= MAX_RESENDS) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Maximum verification emails reached. Please check your spam folder or contact us for help.',
      },
      { status: 429 },
    );
  }

  // -------------------------------------------------------------------------
  // Generate new token
  // -------------------------------------------------------------------------
  const { rawToken, tokenHash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  const { error: insertError } = await supabase
    .from('email_verification_tokens')
    .insert({
      signature_id: signature.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error('[Resend] Token insert error:', insertError);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  // Update signature's current token pointer
  await supabase
    .from('signatures')
    .update({
      email_token_hash: tokenHash,
      email_token_expires: expiresAt.toISOString(),
    })
    .eq('id', signature.id);

  // -------------------------------------------------------------------------
  // Fire Inngest event
  // -------------------------------------------------------------------------
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';
  const verificationUrl = `${siteUrl}/sign/verify?token=${rawToken}`;

  try {
    await inngest.send({
      name: 'petition/verification.resend',
      data: {
        signatureId: signature.id,
        signatureNumber: signature.signature_number,
        email: data.email,
        firstName: signature.first_name,
        referralCode: signature.referral_code,
        verificationUrl,
      },
    });
  } catch (error) {
    // Non-fatal — token is created; if Inngest fails, admin can manually resend
    console.error('[Resend] Inngest send failed:', error);
  }

  return NextResponse.json({ success: true });
}
