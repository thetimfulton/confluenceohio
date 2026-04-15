import { NextRequest, NextResponse } from 'next/server';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/admin/voices/[id] — submission detail with moderation history
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await requireAdminFromRequest(request, ['admin', 'moderator']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServiceClient();

  // Fetch submission
  const { data: submission, error: subError } = await supabase
    .from('voice_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (subError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  // Fetch moderation log
  const { data: moderationLog } = await supabase
    .from('moderation_log')
    .select('*')
    .eq('voice_submission_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    submission,
    moderation_log: moderationLog ?? [],
  });
}
