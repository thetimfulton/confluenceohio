// ---------------------------------------------------------------------------
// GET /api/email/unsubscribe — One-Click Unsubscribe Endpoint
// ---------------------------------------------------------------------------
// Handles direct unsubscribe links embedded in emails. Validates an HMAC
// token signed with EMAIL_VERIFICATION_SECRET, updates the subscriber
// record, and removes the contact from all Brevo marketing lists.
//
// URL format: /api/email/unsubscribe?email=...&token=...
//
// This is a supplementary mechanism. Primary unsubscribes flow through
// Brevo's built-in {{ unsubscribe }} tag + webhook. This endpoint handles
// our own direct unsubscribe links (e.g., in transactional emails or
// custom footers).
//
// See Artifact 07 §5.2 for unsubscribe handling specification.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getEmailAdapter } from '@confluenceohio/email';
import { createServiceClient } from '@/lib/supabase/service';
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe';

// ---------------------------------------------------------------------------
// Brevo list IDs for removal
// ---------------------------------------------------------------------------

function getAllMarketingListIds(): number[] {
  const envVars = [
    'BREVO_LIST_ALL',
    'BREVO_LIST_SIGNERS',
    'BREVO_LIST_VERIFIED',
    'BREVO_LIST_VOLUNTEERS',
    'BREVO_LIST_DONORS',
    'BREVO_LIST_ENGAGED',
    'BREVO_LIST_DISENGAGED',
    'BREVO_LIST_STANDALONE',
  ];

  return envVars
    .map((v) => parseInt(process.env[v] || '0', 10))
    .filter((id) => id > 0);
}

// ---------------------------------------------------------------------------
// Confirmation HTML page
// ---------------------------------------------------------------------------

function renderConfirmationPage(success: boolean, message: string): string {
  const title = success ? 'Unsubscribed' : 'Something went wrong';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - Confluence Ohio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        'Helvetica Neue', Arial, sans-serif;
      color: #333;
      background: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 2.5rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    h1 {
      color: #1e3a5f;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1rem;
      line-height: 1.6;
      color: #555;
      margin-bottom: 1.5rem;
    }
    a {
      color: #1e40af;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="/">Return to Confluence Ohio</a></p>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  // -- Validate params --
  if (!email || !token) {
    return new NextResponse(
      renderConfirmationPage(
        false,
        'Invalid unsubscribe link. If you need to unsubscribe, please use the link in your most recent email from us.',
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  // -- Validate HMAC token --
  const secret = process.env.EMAIL_VERIFICATION_SECRET;
  if (!secret) {
    console.error('[Unsubscribe] Missing EMAIL_VERIFICATION_SECRET');
    return new NextResponse(
      renderConfirmationPage(
        false,
        'Something went wrong on our end. Please try again later or use the unsubscribe link in your email.',
      ),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  const expectedToken = generateUnsubscribeToken(email, secret);

  // Timing-safe comparison to prevent timing attacks
  let tokensMatch = false;
  try {
    tokensMatch = timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex'),
    );
  } catch {
    tokensMatch = false;
  }

  if (!tokensMatch) {
    return new NextResponse(
      renderConfirmationPage(
        false,
        'This unsubscribe link is invalid or has expired. Please use the link in your most recent email from us.',
      ),
      { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  // -- Update database --
  const supabase = createServiceClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { error: updateError } = await supabase
    .from('email_subscribers')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('email', normalizedEmail);

  if (updateError) {
    console.error('[Unsubscribe] Database update error:', updateError);
    // Continue anyway — still try to update Brevo
  }

  // -- Remove from all Brevo marketing lists --
  try {
    const brevo = getEmailAdapter();
    const listIds = getAllMarketingListIds();

    for (const listId of listIds) {
      try {
        await brevo.removeContactFromList(normalizedEmail, listId);
      } catch {
        // Ignore errors for individual list removals — contact may not be on that list
      }
    }

    // Mark contact as unsubscribed in Brevo
    await brevo.updateContactAttribute(normalizedEmail, {
      UNSUBSCRIBED: true,
    });
  } catch (error) {
    console.error('[Unsubscribe] Brevo update error (non-fatal):', error);
  }

  // -- Return confirmation page --
  return new NextResponse(
    renderConfirmationPage(
      true,
      "You've been unsubscribed from all Confluence Ohio marketing emails. You may still receive transactional messages (like email verification confirmations). We're sorry to see you go.",
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
