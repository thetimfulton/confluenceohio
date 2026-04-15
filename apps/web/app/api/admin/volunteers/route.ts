import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { Volunteer, VolunteerRole, VolunteerStatus } from '@confluenceohio/db/types';

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
  // Keep last 4 digits visible
  return phone.replace(/\d(?=.{4})/g, '*');
}

// ---------------------------------------------------------------------------
// Query param validation
// ---------------------------------------------------------------------------

const VALID_SORT_FIELDS = [
  'first_name',
  'last_name',
  'neighborhood',
  'status',
  'signed_up_at',
] as const;

const ListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(VALID_SORT_FIELDS).default('signed_up_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
  status: z.string().optional(), // comma-separated
  roles: z.string().optional(), // comma-separated
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

// ---------------------------------------------------------------------------
// GET /api/admin/volunteers — list with pagination, filtering, CSV export
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
      { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { page, per_page, sort, order, search, status, roles, date_from, date_to, format } =
    parsed.data;

  // CSV export requires admin role
  if (format === 'csv' && admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServiceClient();
  const isViewer = admin.role === 'viewer';

  // Build the query
  let query = supabase.from('volunteers').select('*', { count: 'exact' });

  // ── Filters ──
  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},neighborhood.ilike.${term}`,
    );
  }

  if (status) {
    const statuses = status.split(',').filter(Boolean) as VolunteerStatus[];
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('status', statuses);
    }
  }

  if (roles) {
    // Filter by JSONB containment — each role is checked individually
    const roleList = roles.split(',').filter(Boolean) as VolunteerRole[];
    for (const role of roleList) {
      query = query.contains('roles', [role]);
    }
  }

  if (date_from) {
    query = query.gte('signed_up_at', date_from);
  }
  if (date_to) {
    query = query.lte('signed_up_at', `${date_to}T23:59:59.999Z`);
  }

  // ── Sorting ──
  query = query.order(sort, { ascending: order === 'asc' });

  // ── Pagination (skip for CSV — get all matching rows) ──
  if (format !== 'csv') {
    const from = (page - 1) * per_page;
    query = query.range(from, from + per_page - 1);
  }

  const { data: volunteers, count, error } = await query;

  if (error) {
    console.error('[Admin/Volunteers] Query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch volunteers' },
      { status: 500 },
    );
  }

  // ── CSV export ──
  if (format === 'csv') {
    return buildCsvResponse(volunteers as Volunteer[]);
  }

  // ── JSON response with PII masking ──
  const masked = isViewer
    ? (volunteers as Volunteer[]).map((v) => ({
        ...v,
        email: maskEmail(v.email),
        phone: maskPhone(v.phone),
      }))
    : volunteers;

  return NextResponse.json({
    data: masked,
    pagination: {
      page,
      per_page,
      total: count ?? 0,
    },
  });
}

// ---------------------------------------------------------------------------
// CSV builder
// ---------------------------------------------------------------------------

function buildCsvResponse(volunteers: Volunteer[]): NextResponse {
  const headers = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'neighborhood',
    'roles',
    'availability',
    'status',
    'signed_up_at',
  ];

  const rows = volunteers.map((v) =>
    [
      csvEscape(v.first_name),
      csvEscape(v.last_name),
      csvEscape(v.email),
      csvEscape(v.phone ?? ''),
      csvEscape(v.neighborhood ?? ''),
      csvEscape((v.roles || []).join('; ')),
      csvEscape(v.availability ?? ''),
      csvEscape(v.status),
      csvEscape(v.signed_up_at),
    ].join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="volunteers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
