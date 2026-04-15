import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { VoiceSubmission, ModerationLogEntry } from '@confluenceohio/db/types';
import { VoiceDetailClient } from './_components/voice-detail-client';

export const metadata: Metadata = { title: 'Voice Detail | Admin' };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VoiceDetailPage({ params, searchParams }: Props) {
  const admin = await requireAdmin(['admin', 'moderator']);
  if (!admin) redirect('/admin/login');

  const { id } = await params;
  const sp = await searchParams;
  const editMode = sp.edit === 'true' && admin.role === 'admin';

  const supabase = createServiceClient();

  // Fetch submission
  const { data: submission, error: subError } = await supabase
    .from('voice_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (subError || !submission) notFound();

  // Fetch moderation log
  const { data: moderationLog } = await supabase
    .from('moderation_log')
    .select('*')
    .eq('voice_submission_id', id)
    .order('created_at', { ascending: false });

  return (
    <VoiceDetailClient
      submission={submission as VoiceSubmission}
      moderationLog={(moderationLog as ModerationLogEntry[]) ?? []}
      adminRole={admin.role}
      adminId={admin.id}
      initialEditMode={editMode}
    />
  );
}
