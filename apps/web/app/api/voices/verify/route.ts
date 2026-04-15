import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { inngest } from '@/inngest/client';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// GET /api/voices/verify?token={raw_token}  (Artifact 10 §7.3)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get('token');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

  if (!rawToken) {
    return NextResponse.redirect(new URL('/voices/share/expired', siteUrl));
  }

  // ── Step 1: Hash the raw token ──
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const supabase = createServiceClient();

  // ── Step 2: Look up submission by token hash ──
  const { data: submission, error: lookupError } = await supabase
    .from('voice_submissions')
    .select('id, moderation_status, email_verified, email_token_expires, author_name, author_email, author_neighborhood, position, title, body, slug')
    .eq('email_token_hash', tokenHash)
    .maybeSingle();

  if (lookupError) {
    console.error('[Voices] Verify lookup error:', lookupError);
    return NextResponse.redirect(new URL('/voices/share/expired', siteUrl));
  }

  if (!submission) {
    return NextResponse.redirect(new URL('/voices/share/expired', siteUrl));
  }

  // ── Step 3: Check token expiry ──
  if (submission.email_token_expires && new Date(submission.email_token_expires) < new Date()) {
    return NextResponse.redirect(new URL('/voices/share/expired', siteUrl));
  }

  // ── Step 4: Idempotency — already verified ──
  if (submission.email_verified) {
    return NextResponse.redirect(new URL('/voices/share/confirmed', siteUrl));
  }

  // ── Step 5: Check submission is still in pending_email status ──
  if (submission.moderation_status !== 'pending_email') {
    // Submission has moved past pending_email (shouldn't happen, but handle gracefully)
    return NextResponse.redirect(new URL('/voices/share/confirmed', siteUrl));
  }

  // ── Step 6: Update — mark email as verified, advance to 'pending' ──
  const { error: updateError } = await supabase
    .from('voice_submissions')
    .update({
      email_verified: true,
      moderation_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', submission.id);

  if (updateError) {
    console.error('[Voices] Verify update error:', updateError);
    return NextResponse.redirect(new URL('/voices/share/expired', siteUrl));
  }

  // ── Step 7: Fire Inngest event for AI moderation pipeline ──
  try {
    await inngest.send({
      name: 'voice/submitted',
      data: {
        submission: {
          id: submission.id,
          author_name: submission.author_name,
          author_email: submission.author_email,
          author_neighborhood: submission.author_neighborhood,
          position: submission.position,
          title: submission.title,
          body: submission.body,
          slug: submission.slug,
        },
      },
    });
  } catch (error) {
    console.error('[Voices] Inngest event send failed (non-fatal):', error);
    // Non-fatal — submission is verified. AI moderation can be triggered manually.
  }

  // ── Step 8: Redirect to confirmed page ──
  return NextResponse.redirect(new URL('/voices/share/confirmed', siteUrl));
}
