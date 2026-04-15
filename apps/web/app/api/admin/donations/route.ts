// ---------------------------------------------------------------------------
// Admin Donations API — apps/web/app/api/admin/donations/route.ts
// ---------------------------------------------------------------------------
// GET: List donations with filters, aggregate stats, and CSV export.
//
// Query params:
//   page (default 1), per_page (default 25, max 100)
//   sort: donated_at | amount_cents | donor_name (default: donated_at)
//   order: asc | desc (default: desc)
//   date_from, date_to: ISO date strings for date range filter
//   recurring: "true" | "false" — filter by recurring status
//   refcode: filter by exact refcode match
//   search: partial match on donor_name or donor_email
//   format: "json" (default) | "csv" — CSV export (admin only)
//
// See Artifact 09 §5 and Artifact 15 §donations.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// PII masking (viewer role sees masked email)
// ---------------------------------------------------------------------------

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.com';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
}

// ---------------------------------------------------------------------------
// Query param validation
// ---------------------------------------------------------------------------

const VALID_SORT_FIELDS = ['donated_at', 'amount_cents', 'donor_name'] as const;

const ListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(VALID_SORT_FIELDS).default('donated_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
  recurring: z.enum(['true', 'false']).optional(),
  refcode: z.string().max(100).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

// ---------------------------------------------------------------------------
// GET /api/admin/donations
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const admin = await requireAdminFromRequest(request, ['admin', 'viewer']);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = ListParamsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const {
    page,
    per_page,
    sort,
    order,
    search,
    recurring,
    refcode,
    date_from,
    date_to,
    format,
  } = parsed.data;

  // CSV export requires admin role
  if (format === 'csv' && admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServiceClient();
  const isViewer = admin.role === 'viewer';

  // ── Build the list query ──

  let query = supabase
    .from('donations')
    .select(
      'id, actblue_order_id, donor_name, donor_email, amount_cents, recurring, refcode, refcode2, express_lane, donated_at',
      { count: 'exact' },
    );

  // Filters
  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `donor_name.ilike.${term},donor_email.ilike.${term}`,
    );
  }

  if (recurring !== undefined) {
    query = query.eq('recurring', recurring === 'true');
  }

  if (refcode) {
    query = query.eq('refcode', refcode);
  }

  if (date_from) {
    query = query.gte('donated_at', date_from);
  }
  if (date_to) {
    query = query.lte('donated_at', `${date_to}T23:59:59.999Z`);
  }

  // Sorting
  query = query.order(sort, { ascending: order === 'asc' });

  // Pagination (skip for CSV — fetch all matching rows)
  if (format !== 'csv') {
    const from = (page - 1) * per_page;
    query = query.range(from, from + per_page - 1);
  }

  const { data: donations, count, error } = await query;

  if (error) {
    console.error('[Admin/Donations] Query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donations' },
      { status: 500 },
    );
  }

  // ── CSV export ──

  if (format === 'csv') {
    return buildCsvResponse(donations ?? []);
  }

  // ── Compute aggregate stats ──

  const stats = await computeAggregateStats(supabase, {
    search,
    recurring,
    refcode,
    date_from,
    date_to,
  });

  // ── JSON response with PII masking for viewers ──

  const masked = isViewer
    ? (donations ?? []).map((d) => ({
        ...d,
        donor_email: d.donor_email ? maskEmail(d.donor_email) : null,
      }))
    : donations;

  return NextResponse.json({
    data: masked,
    stats,
    pagination: {
      page,
      per_page,
      total: count ?? 0,
    },
  });
}

// ---------------------------------------------------------------------------
// Aggregate stats
// ---------------------------------------------------------------------------

interface FilterParams {
  search?: string;
  recurring?: string;
  refcode?: string;
  date_from?: string;
  date_to?: string;
}

async function computeAggregateStats(
  supabase: ReturnType<typeof createServiceClient>,
  filters: FilterParams,
) {
  // Build the same filter set but fetch only the columns we need for stats
  let query = supabase
    .from('donations')
    .select('amount_cents, recurring, donor_email, express_lane, refcode');

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `donor_name.ilike.${term},donor_email.ilike.${term}`,
    );
  }
  if (filters.recurring !== undefined) {
    query = query.eq('recurring', filters.recurring === 'true');
  }
  if (filters.refcode) {
    query = query.eq('refcode', filters.refcode);
  }
  if (filters.date_from) {
    query = query.gte('donated_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('donated_at', `${filters.date_to}T23:59:59.999Z`);
  }

  const { data } = await query;

  if (!data || data.length === 0) {
    return {
      total_cents: 0,
      donation_count: 0,
      average_cents: 0,
      recurring_count: 0,
      recurring_percentage: 0,
      unique_donors: 0,
      express_lane_count: 0,
    };
  }

  const totalCents = data.reduce((sum, d) => sum + d.amount_cents, 0);
  const recurringCount = data.filter((d) => d.recurring).length;
  const uniqueDonors = new Set(data.map((d) => d.donor_email)).size;
  const expressLaneCount = data.filter((d) => d.express_lane).length;

  // Refcode breakdown
  const byRefcode = new Map<string, { count: number; total: number }>();
  for (const d of data) {
    const key = d.refcode ?? '(no refcode)';
    const existing = byRefcode.get(key) ?? { count: 0, total: 0 };
    byRefcode.set(key, {
      count: existing.count + 1,
      total: existing.total + d.amount_cents,
    });
  }

  const refcode_breakdown = Array.from(byRefcode.entries())
    .map(([rc, { count, total }]) => ({
      refcode: rc,
      count,
      total_cents: total,
      average_cents: Math.round(total / count),
    }))
    .sort((a, b) => b.total_cents - a.total_cents);

  return {
    total_cents: totalCents,
    donation_count: data.length,
    average_cents: Math.round(totalCents / data.length),
    recurring_count: recurringCount,
    recurring_percentage:
      data.length > 0
        ? Math.round((recurringCount / data.length) * 100)
        : 0,
    unique_donors: uniqueDonors,
    express_lane_count: expressLaneCount,
    refcode_breakdown,
  };
}

// ---------------------------------------------------------------------------
// CSV builder
// ---------------------------------------------------------------------------

function buildCsvResponse(
  donations: Array<{
    donated_at: string;
    actblue_order_id: string;
    donor_name: string | null;
    donor_email: string | null;
    amount_cents: number;
    recurring: boolean;
    refcode: string | null;
    refcode2: string | null;
    express_lane: boolean;
  }>,
): NextResponse {
  if (donations.length === 0) {
    return new NextResponse('', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="donations-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const headers = [
    'Date',
    'ActBlue Order ID',
    'Donor Name',
    'Donor Email',
    'Amount',
    'Recurring',
    'Refcode',
    'Refcode2',
    'Express Lane',
  ];

  const rows = donations.map((d) =>
    [
      csvEscape(new Date(d.donated_at).toISOString().split('T')[0]),
      csvEscape(d.actblue_order_id),
      csvEscape(d.donor_name ?? ''),
      csvEscape(d.donor_email ?? ''),
      csvEscape(`$${(d.amount_cents / 100).toFixed(2)}`),
      csvEscape(d.recurring ? 'Yes' : 'No'),
      csvEscape(d.refcode ?? ''),
      csvEscape(d.refcode2 ?? ''),
      csvEscape(d.express_lane ? 'Yes' : 'No'),
    ].join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="donations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
