import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';

const NoteSchema = z.object({
  content: z
    .string()
    .min(1, 'Note cannot be empty')
    .max(2000, 'Note must be under 2000 characters')
    .trim(),
});

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/admin/volunteers/[id]/notes — add timestamped admin note
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await requireAdminFromRequest(request, ['admin']);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: volunteerId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = NoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const supabase = createServiceClient();

  // Verify volunteer exists
  const { data: volunteer, error: volError } = await supabase
    .from('volunteers')
    .select('id')
    .eq('id', volunteerId)
    .single();

  if (volError || !volunteer) {
    return NextResponse.json(
      { error: 'Volunteer not found' },
      { status: 404 },
    );
  }

  // Insert note
  const { data: note, error: insertError } = await supabase
    .from('volunteer_admin_notes')
    .insert({
      volunteer_id: volunteerId,
      admin_id: admin.id,
      admin_email: admin.email,
      content: parsed.data.content,
    })
    .select('*')
    .single();

  if (insertError || !note) {
    console.error('[Admin/Volunteers] Note insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 },
    );
  }

  return NextResponse.json({ note }, { status: 201 });
}
