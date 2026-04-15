// ---------------------------------------------------------------------------
// Admin Donations Refcode Performance — .../donations/refcodes/route.ts
// ---------------------------------------------------------------------------
// GET: Returns refcode attribution data — which refcodes generated donations,
// grouped by refcode with count, total, and average.
//
// Query params:
//   date_from, date_to: ISO date strings for date range filter
//   sort: total | count | average (default: total)
//   order: asc | desc (default: desc)
//   limit: max refcodes to return (default 50, max 200)
//
// See Artifact 09 §5.2 refcode performance table.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Query param validation
// ---------------------------------------------------------------------------

const RefcodeParamsSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort: z.enum(['total', 'count', 'average']).default('total'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------
// GET /api/admin/donations/refcodes
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const admin = await requireAdminFromRequest(request, ['admin', 'viewer']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = RefcodeParamsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { date_from, date_to, sort, order, limit } = parsed.data;

  const supabase = createServiceClient();

  // Fetch donations with just the fields needed for aggregation
  let query = supabase
    .from('donations')
    .select('refcode, amount_cents');

  if (date_from) {
    query = query.gte('donated_at', date_from);
  }
  if (date_to) {
    query = query.lte('donated_at', `${date_to}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Admin/Donations/Refcodes] Query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refcode data' },
      { status: 500 },
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ data: [], total_donations: 0 });
  }

  // ── Aggregate by refcode ──

  const byRefcode = new Map<string, { count: number; totalCents: number }>();

  for (const donation of data) {
    const key = donation.refcode ?? '(no refcode)';
    const existing = byRefcode.get(key) ?? { count: 0, totalCents: 0 };
    byRefcode.set(key, {
      count: existing.count + 1,
      totalCents: existing.totalCents + donation.amount_cents,
    });
  }

  let results = Array.from(byRefcode.entries()).map(
    ([refcode, { count, totalCents }]) => ({
      refcode,
      count,
      total_cents: totalCents,
      average_cents: Math.round(totalCents / count),
    }),
  );

  // ── Sort ──

  const sortKey =
    sort === 'total'
      ? 'total_cents'
      : sort === 'count'
        ? 'count'
        : 'average_cents';

  results.sort((a, b) =>
    order === 'desc'
      ? b[sortKey] - a[sortKey]
      : a[sortKey] - b[sortKey],
  );

  // ── Limit ──

  results = results.slice(0, limit);

  return NextResponse.json({
    data: results,
    total_donations: data.length,
  });
}
