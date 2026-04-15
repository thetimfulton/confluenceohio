import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { ModerationStatus, VoicePosition } from '@confluenceohio/db/types';

// ---------------------------------------------------------------------------
// Query param validation
// ---------------------------------------------------------------------------

const VALID_SORT_FIELDS = [
  'submitted_at',
  'author_name',
  'position',
  'moderation_status',
  'moderation_ai_at',
] as const;

const ListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.enum(VALID_SORT_FIELDS).default('submitted_at'),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().max(200).optional(),
  status: z.string().optional(),
  position: z.string().optional(),
  featured: z.enum(['true', 'false']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

// ---------------------------------------------------------------------------
// GET /api/admin/voices — list with pagination and filtering
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const admin = await requireAdminFromRequest(request, ['admin', 'moderator']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = ListParamsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const {
    page,
    per_page,
    sort,
    order,
    search,
    status,
    position,
    featured,
    date_from,
    date_to,
  } = parsed.data;

  const supabase = createServiceClient();

  let query = supabase.from('voice_submissions').select('*', { count: 'exact' });

  // ── Filters ──
  if (status) {
    const statuses = status.split(',').filter(Boolean) as ModerationStatus[];
    if (statuses.length === 1) {
      query = query.eq('moderation_status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('moderation_status', statuses);
    }
  }

  if (position) {
    const positions = position.split(',').filter(Boolean) as VoicePosition[];
    if (positions.length === 1) {
      query = query.eq('position', positions[0]);
    } else if (positions.length > 1) {
      query = query.in('position', positions);
    }
  }

  if (featured === 'true') {
    query = query.eq('featured', true);
  } else if (featured === 'false') {
    query = query.eq('featured', false);
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `author_name.ilike.${term},title.ilike.${term},body.ilike.${term},author_neighborhood.ilike.${term}`,
    );
  }

  if (date_from) {
    query = query.gte('submitted_at', date_from);
  }
  if (date_to) {
    query = query.lte('submitted_at', `${date_to}T23:59:59.999Z`);
  }

  // ── Sorting ──
  query = query.order(sort, { ascending: order === 'asc' });

  // ── Pagination ──
  const from = (page - 1) * per_page;
  query = query.range(from, from + per_page - 1);

  const { data: submissions, count, error } = await query;

  if (error) {
    console.error('[Admin/Voices] Query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice submissions' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: submissions,
    pagination: {
      page,
      per_page,
      total: count ?? 0,
    },
  });
}
