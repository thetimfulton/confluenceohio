import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// GET /api/voices/[slug] — Single approved voice by slug (Artifact 10 §7.1)
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const supabase = createServiceClient();

  const { data: voice, error } = await supabase
    .from('voice_submissions')
    .select(
      'id, author_name, author_neighborhood, position, title, body, slug, featured, approved_at, submitted_at',
    )
    .eq('slug', slug)
    .in('moderation_status', ['approved', 'auto_approved'])
    .maybeSingle();

  if (error) {
    console.error('[Voices] Slug lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice' },
      { status: 500 },
    );
  }

  if (!voice) {
    return NextResponse.json(
      { error: 'Voice not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { voice },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    },
  );
}
