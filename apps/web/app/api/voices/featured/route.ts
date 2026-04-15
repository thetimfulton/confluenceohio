import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// GET /api/voices/featured — Featured approved voices (Artifact 10 §7.1)
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = createServiceClient();

  const { data: voices, error } = await supabase
    .from('voice_submissions')
    .select(
      'id, author_name, author_neighborhood, position, title, body, slug, featured, approved_at',
    )
    .eq('featured', true)
    .in('moderation_status', ['approved', 'auto_approved'])
    .order('approved_at', { ascending: false, nullsFirst: false })
    .limit(6);

  if (error) {
    console.error('[Voices] Featured query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured voices' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { voices: voices ?? [] },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    },
  );
}
