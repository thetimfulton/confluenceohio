import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { Signature, VerificationStatus } from '@confluenceohio/db/types';

// ---------------------------------------------------------------------------
// PII masking
// ---------------------------------------------------------------------------

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.com';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
}

// ---------------------------------------------------------------------------
// PATCH body validation
// ---------------------------------------------------------------------------

const ActionSchema = z.object({
  action: z.enum(['flag', 'reject', 'restore']),
  note: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Route context type
// ---------------------------------------------------------------------------

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/admin/signatures/[id] — detail with referral chain
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await requireAdminFromRequest(request, ['admin', 'viewer']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServiceClient();
  const isViewer = admin.role === 'viewer';

  // Fetch signature
  const { data: signature, error: sigError } = await supabase
    .from('signatures')
    .select('*')
    .eq('id', id)
    .single();

  if (sigError || !signature) {
    return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
  }

  const sig = signature as Signature;

  // Fetch referrer (who referred this signer)
  let referrer: Pick<Signature, 'id' | 'first_name' | 'last_name' | 'signature_number' | 'referral_code'> | null = null;
  if (sig.referred_by_id) {
    const { data } = await supabase
      .from('signatures')
      .select('id, first_name, last_name, signature_number, referral_code')
      .eq('id', sig.referred_by_id)
      .single();
    referrer = data;
  }

  // Fetch referrals made (people this signer referred)
  let referrals: Pick<Signature, 'id' | 'first_name' | 'last_name' | 'signature_number' | 'signed_at'>[] = [];
  if (sig.referral_code) {
    const { data } = await supabase
      .from('signatures')
      .select('id, first_name, last_name, signature_number, signed_at')
      .eq('referred_by_code', sig.referral_code)
      .is('deleted_at', null)
      .order('signed_at', { ascending: false });
    referrals = data ?? [];
  }

  // Mask PII for viewer
  const result = isViewer
    ? { ...sig, email: maskEmail(sig.email) }
    : sig;

  return NextResponse.json({
    signature: result,
    referrer,
    referrals,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/signatures/[id] — flag, reject, restore
// ---------------------------------------------------------------------------

/** Status transitions that count toward the public signature_count metric */
const COUNTED_STATUSES: VerificationStatus[] = ['pending', 'verified', 'flagged'];

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdminFromRequest(request, ['admin']);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { action } = parsed.data;
  const supabase = createServiceClient();

  // Fetch current signature to check state transitions
  const { data: current, error: fetchError } = await supabase
    .from('signatures')
    .select('id, verification_status')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
  }

  const currentStatus = current.verification_status as VerificationStatus;
  let newStatus: VerificationStatus;
  let metricAdjustment = 0;

  switch (action) {
    case 'flag':
      newStatus = 'flagged';
      // Flagged signatures remain in public count — no metric adjustment
      break;

    case 'reject':
      if (currentStatus === 'rejected') {
        return NextResponse.json(
          { error: 'Signature is already rejected' },
          { status: 422 },
        );
      }
      newStatus = 'rejected';
      // Only decrement if the signature was previously counted
      if (COUNTED_STATUSES.includes(currentStatus)) {
        metricAdjustment = -1;
      }
      break;

    case 'restore':
      if (currentStatus !== 'rejected') {
        return NextResponse.json(
          { error: 'Only rejected signatures can be restored' },
          { status: 422 },
        );
      }
      newStatus = 'verified';
      metricAdjustment = 1;
      break;
  }

  // Update the signature
  const { data: updated, error: updateError } = await supabase
    .from('signatures')
    .update({
      verification_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    console.error('[Admin/Signatures] Update error:', updateError);
    return NextResponse.json(
      { error: 'Failed to update signature' },
      { status: 500 },
    );
  }

  // Adjust campaign metric if needed
  if (metricAdjustment !== 0) {
    const { error: rpcError } = await supabase.rpc('adjust_signature_count', {
      adjustment: metricAdjustment,
    });

    if (rpcError) {
      console.error('[Admin/Signatures] Metric adjustment error:', rpcError);
      // Non-fatal: the signature status was already updated
    }
  }

  return NextResponse.json({ signature: updated });
}
