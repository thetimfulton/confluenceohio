import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';
import type {
  Volunteer,
  VolunteerAdminNote,
  VolunteerRole,
  VolunteerStatus,
} from '@confluenceohio/db/types';

// ---------------------------------------------------------------------------
// PII masking
// ---------------------------------------------------------------------------

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.com';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\d(?=.{4})/g, '*');
}

// ---------------------------------------------------------------------------
// PATCH body validation
// ---------------------------------------------------------------------------

const VALID_ROLES: VolunteerRole[] = [
  'signature_collector',
  'social_amplifier',
  'neighborhood_captain',
  'event_organizer',
  'story_collector',
  'design_content',
  'outreach_liaison',
];

const UpdateSchema = z
  .object({
    status: z.enum(['active', 'inactive', 'onboarded'] as const).optional(),
    roles: z
      .array(z.enum(VALID_ROLES as [VolunteerRole, ...VolunteerRole[]]))
      .min(1)
      .optional(),
    availability: z.string().max(200).optional(),
    neighborhood: z.string().max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// ---------------------------------------------------------------------------
// Route context type
// ---------------------------------------------------------------------------

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/admin/volunteers/[id] — detail with notes and petition cross-ref
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await requireAdminFromRequest(request, ['admin', 'viewer']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServiceClient();
  const isViewer = admin.role === 'viewer';

  // Fetch volunteer
  const { data: volunteer, error: volError } = await supabase
    .from('volunteers')
    .select('*')
    .eq('id', id)
    .single();

  if (volError || !volunteer) {
    return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });
  }

  // Fetch admin notes
  const { data: notes } = await supabase
    .from('volunteer_admin_notes')
    .select('*')
    .eq('volunteer_id', id)
    .order('created_at', { ascending: false });

  // Cross-reference: did this volunteer sign the petition?
  const { data: signature } = await supabase
    .from('signatures')
    .select('id, signature_number, signed_at, verification_status')
    .eq('email', volunteer.email)
    .maybeSingle();

  // Build activity timeline
  const timeline = buildTimeline(
    volunteer as Volunteer,
    (notes as VolunteerAdminNote[]) ?? [],
  );

  // Mask PII for viewer
  const result = isViewer
    ? {
        ...volunteer,
        email: maskEmail(volunteer.email),
        phone: maskPhone(volunteer.phone),
      }
    : volunteer;

  return NextResponse.json({
    volunteer: result,
    notes: notes ?? [],
    petition_signature: signature ?? null,
    timeline,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/volunteers/[id] — update status, roles, etc.
// ---------------------------------------------------------------------------

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

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  // Set onboarded_at when status changes to 'onboarded'
  if (parsed.data.status === 'onboarded') {
    updates.onboarded_at = new Date().toISOString();
  }

  const supabase = createServiceClient();

  const { data: updated, error } = await supabase
    .from('volunteers')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('[Admin/Volunteers] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update volunteer' },
      { status: 500 },
    );
  }

  if (!updated) {
    return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });
  }

  return NextResponse.json({ volunteer: updated });
}

// ---------------------------------------------------------------------------
// Timeline builder
// ---------------------------------------------------------------------------

interface TimelineEntry {
  type: 'signup' | 'status_change' | 'note';
  date: string;
  description: string;
  actor?: string;
}

function buildTimeline(
  volunteer: Volunteer,
  notes: VolunteerAdminNote[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Signup event
  entries.push({
    type: 'signup',
    date: volunteer.signed_up_at,
    description: `Signed up as volunteer (${(volunteer.roles || []).join(', ')})`,
  });

  // Onboarded event (if applicable)
  if (volunteer.onboarded_at) {
    entries.push({
      type: 'status_change',
      date: volunteer.onboarded_at,
      description: 'Status changed to onboarded',
    });
  }

  // Admin notes
  for (const note of notes) {
    entries.push({
      type: 'note',
      date: note.created_at,
      description: note.content,
      actor: note.admin_email,
    });
  }

  // Sort chronologically (newest first)
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return entries;
}
