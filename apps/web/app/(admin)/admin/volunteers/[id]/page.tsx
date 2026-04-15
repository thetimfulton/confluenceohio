import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { Volunteer, VolunteerAdminNote } from '@confluenceohio/db/types';
import { VolunteerDetailClient } from './_components/volunteer-detail-client';

export const metadata: Metadata = { title: 'Volunteer Detail' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VolunteerDetailPage({ params }: Props) {
  const admin = await requireAdmin(['admin', 'viewer']);
  if (!admin) redirect('/admin/login');

  const { id } = await params;
  const supabase = createServiceClient();
  const isViewer = admin.role === 'viewer';

  // Fetch volunteer
  const { data: volunteer, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !volunteer) notFound();

  // Fetch admin notes
  const { data: notes } = await supabase
    .from('volunteer_admin_notes')
    .select('*')
    .eq('volunteer_id', id)
    .order('created_at', { ascending: false });

  // Cross-reference petition signature
  const { data: signature } = await supabase
    .from('signatures')
    .select('id, signature_number, signed_at, verification_status')
    .eq('email', volunteer.email)
    .maybeSingle();

  // Build timeline
  const timeline = buildTimeline(
    volunteer as Volunteer,
    (notes as VolunteerAdminNote[]) ?? [],
  );

  // PII masking for viewer
  const displayVolunteer = isViewer
    ? {
        ...(volunteer as Volunteer),
        email: maskEmail(volunteer.email),
        phone: maskPhone(volunteer.phone),
      }
    : (volunteer as Volunteer);

  return (
    <VolunteerDetailClient
      volunteer={displayVolunteer}
      notes={(notes as VolunteerAdminNote[]) ?? []}
      petitionSignature={signature}
      timeline={timeline}
      adminRole={admin.role}
    />
  );
}

// ── Helpers ──

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

  entries.push({
    type: 'signup',
    date: volunteer.signed_up_at,
    description: `Signed up as volunteer (${(volunteer.roles || []).join(', ')})`,
  });

  if (volunteer.onboarded_at) {
    entries.push({
      type: 'status_change',
      date: volunteer.onboarded_at,
      description: 'Status changed to onboarded',
    });
  }

  for (const note of notes) {
    entries.push({
      type: 'note',
      date: note.created_at,
      description: note.content,
      actor: note.admin_email,
    });
  }

  entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return entries;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.com';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\d(?=.{4})/g, '*');
}
