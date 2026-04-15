import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { inngest } from '@/inngest/client';

/**
 * GET /sign/verify?token=[raw_token]
 *
 * Email verification endpoint (Artifact 06 §5.2).
 * Validates the token, marks it as used, sets email_verified on the signature,
 * and redirects to success or error pages.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(
      new URL('/sign/verify/error?reason=missing-token', request.url),
    );
  }

  // Hash the raw token to match against stored hash
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const supabase = createServiceClient();

  // Look up the verification token
  const { data: tokenRecord, error: lookupError } = await supabase
    .from('email_verification_tokens')
    .select('id, signature_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (lookupError) {
    console.error('[Verify] Token lookup error:', lookupError);
    return NextResponse.redirect(
      new URL('/sign/verify/error?reason=invalid-token', request.url),
    );
  }

  if (!tokenRecord) {
    return NextResponse.redirect(
      new URL('/sign/verify/error?reason=invalid-token', request.url),
    );
  }

  // Already used — redirect to success (idempotent)
  if (tokenRecord.used_at) {
    return NextResponse.redirect(
      new URL('/sign/verify/success?already=true', request.url),
    );
  }

  // Expired
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return NextResponse.redirect(
      new URL('/sign/verify/error?reason=expired-token', request.url),
    );
  }

  // Look up signature for PostHog event data and Inngest event payload
  const { data: signatureRecord } = await supabase
    .from('signatures')
    .select('signature_number, signed_at, email, first_name, referral_code')
    .eq('id', tokenRecord.signature_id)
    .maybeSingle();

  // Mark token as used
  const { error: tokenUpdateError } = await supabase
    .from('email_verification_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenRecord.id);

  if (tokenUpdateError) {
    console.error('[Verify] Token update error:', tokenUpdateError);
    return NextResponse.redirect(
      new URL('/sign/verify/error?reason=invalid-token', request.url),
    );
  }

  // Update signature record
  const { error: signatureUpdateError } = await supabase
    .from('signatures')
    .update({
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    })
    .eq('id', tokenRecord.signature_id);

  if (signatureUpdateError) {
    console.error('[Verify] Signature update error:', signatureUpdateError);
    // Token is already used; the user can retry via the idempotent path
  }

  // Fire Inngest event for post-verification workflows
  if (signatureRecord) {
    try {
      await inngest.send({
        name: 'petition/email.verified',
        data: {
          signatureId: tokenRecord.signature_id,
          email: signatureRecord.email,
          firstName: signatureRecord.first_name,
          referralCode: signatureRecord.referral_code,
          signatureNumber: signatureRecord.signature_number,
        },
      });
    } catch (error) {
      // Non-fatal — verification succeeded; nurture emails will be missed
      console.error('[Verify] Inngest send failed:', error);
    }
  }

  // Build redirect URL with signature number for PostHog on the success page
  const successUrl = new URL('/sign/verify/success', request.url);
  if (signatureRecord) {
    successUrl.searchParams.set('n', String(signatureRecord.signature_number));

    // Calculate hours to verify for analytics
    const hoursToVerify = Math.round(
      (Date.now() - new Date(signatureRecord.signed_at).getTime()) /
        (1000 * 60 * 60),
    );
    successUrl.searchParams.set('h', String(hoursToVerify));
  }

  return NextResponse.redirect(successUrl);
}
