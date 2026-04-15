// ---------------------------------------------------------------------------
// Admin Settings API — apps/web/app/api/admin/settings/route.ts
// ---------------------------------------------------------------------------
// GET:  Return all campaign settings as a keyed object.
// PATCH: Update a single setting by key.
//
// Requires admin role. See Artifact 15 §10.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';

const VALID_KEYS = [
  'signature_goal',
  'milestone_thresholds',
  'site_announcement',
  'moderation_auto_approve_threshold',
  'moderation_auto_reject_threshold',
  'maintenance_mode',
] as const;

const PatchSchema = z.object({
  key: z.enum(VALID_KEYS),
  value: z.unknown(),
});

// ---------------------------------------------------------------------------
// GET /api/admin/settings
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const admin = await requireAdminFromRequest(request, ['admin']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: settings, error } = await supabase
    .from('campaign_settings')
    .select('key, value, updated_by, updated_at');

  if (error) {
    console.error('[Admin/Settings] Query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    );
  }

  // Convert array to keyed object
  const result: Record<string, { value: unknown; updated_by: string | null; updated_at: string }> = {};
  for (const s of settings ?? []) {
    result[s.key] = {
      value: s.value,
      updated_by: s.updated_by,
      updated_at: s.updated_at,
    };
  }

  return NextResponse.json({ data: result });
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/settings
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminFromRequest(request, ['admin']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { key, value } = parsed.data;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('campaign_settings')
    .upsert(
      {
        key,
        value: value as never,
        updated_by: admin.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );

  if (error) {
    console.error('[Admin/Settings] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, key, value });
}
