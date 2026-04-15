import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { VoicePosition } from '@confluenceohio/core/voices/types';

// ---------------------------------------------------------------------------
// GET /api/voices — Public approved voices list (Artifact 10 §7.1)
// ---------------------------------------------------------------------------

const VALID_POSITIONS: VoicePosition[] = ['support', 'oppose', 'undecided'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Parse query params
  const position = searchParams.get('position') as VoicePosition | null;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)),
  );
  const offset = (page - 1) * limit;

  const supabase = createServiceClient();

  // Build query — only approved/auto_approved voices
  let query = supabase
    .from('voice_submissions')
    .select(
      'id, author_name, author_neighborhood, position, title, body, slug, featured, approved_at',
      { count: 'exact' },
    )
    .in('moderation_status', ['approved', 'auto_approved']);

  // Filter by position if provided
  if (position && VALID_POSITIONS.includes(position)) {
    query = query.eq('position', position);
  }

  // Order by featured first, then approved_at descending
  query = query
    .order('featured', { ascending: false })
    .order('approved_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data: voices, count, error } = await query;

  if (error) {
    console.error('[Voices] Public list query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      voices: voices ?? [],
      total: count ?? 0,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    },
  );
}
