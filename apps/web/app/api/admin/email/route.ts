// ---------------------------------------------------------------------------
// Admin Email Subscribers API — apps/web/app/api/admin/email/route.ts
// ---------------------------------------------------------------------------
// GET: List email subscribers with filters and CSV export.
//
// Admin only (PII sensitivity). See Artifact 15 §8.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminFromRequest } from '@/lib/admin/api-auth';
import { createServiceClient } from '@/lib/supabase/service';

const VALID_SORT_FIELDS = ['email', 'source', 'status', 'subscribed_at'] as const;

const ListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(VALID_SORT_FIELDS).default('subscribed_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

export async function GET(request: NextRequest) {
  const admin = await requireAdminFromRequest(request, ['admin']);
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

  const { page, per_page, sort, order, search, source, status, format } = parsed.data;

  const supabase = createServiceClient();

  let query = supabase
    .from('email_subscribers')
    .select('id, email, first_name, source, status, brevo_contact_id, subscribed_at, unsubscribed_at', { count: 'exact' });

  if (search) {
    const term = `%${search}%`;
    query = query.or(`email.ilike.${term},first_name.ilike.${term}`);
  }

  if (source) query = query.eq('source', source);
  if (status) query = query.eq('status', status);

  query = query.order(sort, { ascending: order === 'asc' });

  if (format !== 'csv') {
    const from = (page - 1) * per_page;
    query = query.range(from, from + per_page - 1);
  }

  const { data: subscribers, count, error } = await query;

  if (error) {
    console.error('[Admin/Email] Query error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
  }

  if (format === 'csv') {
    return buildCsvResponse(subscribers ?? []);
  }

  return NextResponse.json({
    data: subscribers,
    pagination: { page, per_page, total: count ?? 0 },
  });
}

// ---------------------------------------------------------------------------
// CSV builder
// ---------------------------------------------------------------------------

function buildCsvResponse(
  subscribers: Array<{
    email: string;
    first_name: string | null;
    source: string;
    status: string;
    brevo_contact_id: string | null;
    subscribed_at: string;
    unsubscribed_at: string | null;
  }>,
): NextResponse {
  const headers = ['Email', 'First Name', 'Source', 'Status', 'Brevo ID', 'Subscribed At', 'Unsubscribed At'];

  const rows = subscribers.map((s) =>
    [
      csvEscape(s.email),
      csvEscape(s.first_name ?? ''),
      csvEscape(s.source),
      csvEscape(s.status),
      csvEscape(s.brevo_contact_id ?? ''),
      csvEscape(new Date(s.subscribed_at).toISOString().split('T')[0]),
      csvEscape(s.unsubscribed_at ? new Date(s.unsubscribed_at).toISOString().split('T')[0] : ''),
    ].join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="email-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
