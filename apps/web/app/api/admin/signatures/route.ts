import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { Signature, VerificationStatus } from '@confluenceohio/db/types';

// ---------------------------------------------------------------------------
// PII masking
// ---------------------------------------------------------------------------

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.com';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
}

// ---------------------------------------------------------------------------
// Query param validation
// ---------------------------------------------------------------------------

const VALID_SORT_FIELDS = [
  'signature_number',
  'first_name',
  'city',
  'verification_status',
  'email_verified',
  'signed_at',
] as const;

const ListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.enum(VALID_SORT_FIELDS).default('signed_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
  status: z.string().optional(),
  email_verified: z.enum(['true', 'false']).optional(),
  has_referral: z.enum(['true', 'false']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

// ---------------------------------------------------------------------------
// GET /api/admin/signatures — list with pagination, filtering, CSV export
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

  const {
    page,
    per_page,
    sort,
    order,
    search,
    status,
    email_verified,
    has_referral,
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

  // Build the query
  let query = supabase.from('signatures').select('*', { count: 'exact' });

  // Always exclude soft-deleted
  query = query.is('deleted_at', null);

  // ── Filters ──
  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},city.ilike.${term}`,
    );
  }

  if (status) {
    const statuses = status.split(',').filter(Boolean) as VerificationStatus[];
    if (statuses.length === 1) {
      query = query.eq('verification_status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('verification_status', statuses);
    }
  }

  if (email_verified === 'true') {
    query = query.eq('email_verified', true);
  } else if (email_verified === 'false') {
    query = query.eq('email_verified', false);
  }

  if (has_referral === 'true') {
    query = query.not('referred_by_code', 'is', null);
  } else if (has_referral === 'false') {
    query = query.is('referred_by_code', null);
  }

  if (date_from) {
    query = query.gte('signed_at', date_from);
  }
  if (date_to) {
    query = query.lte('signed_at', `${date_to}T23:59:59.999Z`);
  }

  // ── Sorting ──
  query = query.order(sort, { ascending: order === 'asc' });

  // ── Pagination (skip for CSV — get all matching rows) ──
  if (format !== 'csv') {
    const from = (page - 1) * per_page;
    query = query.range(from, from + per_page - 1);
  }

  const { data: signatures, count, error } = await query;

  if (error) {
    console.error('[Admin/Signatures] Query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signatures' },
      { status: 500 },
    );
  }

  // ── CSV export ──
  if (format === 'csv') {
    return buildCsvResponse(signatures as Signature[]);
  }

  // ── JSON response with PII masking ──
  const masked = isViewer
    ? (signatures as Signature[]).map((s) => ({
        ...s,
        email: maskEmail(s.email),
      }))
    : signatures;

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

function buildCsvResponse(signatures: Signature[]): NextResponse {
  const headers = [
    'signature_number',
    'first_name',
    'last_name',
    'email',
    'city',
    'zip_code',
    'verification_status',
    'email_verified',
    'signed_at',
    'referral_code',
    'referred_by_code',
  ];

  const rows = signatures.map((s) =>
    [
      String(s.signature_number),
      csvEscape(s.first_name),
      csvEscape(s.last_name),
      csvEscape(s.email),
      csvEscape(s.city),
      csvEscape(s.zip_code),
      csvEscape(s.verification_status),
      String(s.email_verified),
      csvEscape(s.signed_at),
      csvEscape(s.referral_code ?? ''),
      csvEscape(s.referred_by_code ?? ''),
    ].join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="signatures-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
