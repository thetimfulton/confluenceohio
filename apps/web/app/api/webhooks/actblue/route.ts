import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { parseActBlueWebhook } from '@confluenceohio/core/donations/parse-webhook';
import { inngest } from '@/inngest/client';
import { createServiceClient } from '@/lib/supabase/service';
import { captureServerEvent } from '@confluenceohio/core/analytics/posthog-server';

// ---------------------------------------------------------------------------
// Basic Auth Verification
// ---------------------------------------------------------------------------

function verifyBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) return false;

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [username, password] = decoded.split(':');

  return (
    username === process.env.ACTBLUE_WEBHOOK_USERNAME &&
    password === process.env.ACTBLUE_WEBHOOK_PASSWORD
  );
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/actblue
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Verify Basic Auth
  if (!verifyBasicAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate payload
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = parseActBlueWebhook(body);

  if (result.error) {
    console.error('[ActBlue Webhook] Invalid payload:', result.error);
    return NextResponse.json(
      { error: 'Invalid payload' },
      { status: 400 },
    );
  }

  const donation = result.event;

  // 3. Idempotency — check for existing order before insert
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('donations')
    .select('id')
    .eq('actblue_order_id', donation.orderNumber)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ status: 'already_processed' });
  }

  // 4. Compute payload hash for audit trail
  const payloadHash = createHash('sha256')
    .update(JSON.stringify(body))
    .digest('hex');

  // 5. Insert donation record
  // The DB trigger `on_donation_insert` automatically updates
  // campaign_metrics.donation_total_cents — no manual metrics update needed.
  const { error: insertError } = await supabase.from('donations').insert({
    actblue_order_id: donation.orderNumber,
    donor_email: donation.donorEmail,
    donor_name: donation.donorName,
    amount_cents: donation.amountCents,
    recurring: donation.recurring,
    refcode: donation.refcode,
    refcode2: donation.refcode2,
    express_lane: donation.expressLane,
    line_items: donation.lineItems,
    donated_at: donation.donatedAt,
    webhook_payload_hash: payloadHash,
  });

  if (insertError) {
    console.error('[ActBlue Webhook] Insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to process donation' },
      { status: 500 },
    );
  }

  // 6. Server-side analytics — donate_webhook_received (§3.2.3)
  captureServerEvent(donation.donorEmail, 'donate_webhook_received', {
    amount_cents: donation.amountCents,
    recurring: donation.recurring,
    refcode: donation.refcode,
    is_express_lane: donation.expressLane,
    order_number: donation.orderNumber,
  });

  // 7. Fire Inngest event for downstream processing
  //    (thank-you email, Brevo donor attribute update — see Artifact 07 §2.10)
  //    Returns 200 even if Inngest send fails — donation is already persisted.
  try {
    await inngest.send({
      name: 'donation/received',
      data: {
        email: donation.donorEmail,
        donorName: donation.donorName,
        amountCents: donation.amountCents,
        recurring: donation.recurring,
        refcode: donation.refcode,
        orderNumber: donation.orderNumber,
      },
    });
  } catch (error) {
    console.error('[ActBlue Webhook] Inngest send failed:', error);
    // Don't return error — the donation is recorded. Inngest retries independently.
  }

  return NextResponse.json({ status: 'ok' });
}
