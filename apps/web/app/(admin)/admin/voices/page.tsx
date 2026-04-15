import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { ModerationStatus, VoicePosition } from '@confluenceohio/db/types';
import { VoiceListClient } from './_components/voice-list-client';

export const metadata: Metadata = { title: 'Voices | Admin' };

const VALID_SORT_FIELDS = [
  'submitted_at',
  'author_name',
  'position',
  'moderation_status',
];

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VoicesPage({ searchParams }: Props) {
  const admin = await requireAdmin(['admin', 'moderator']);
  if (!admin) redirect('/admin/login');

  const params = await searchParams;

  // Parse query params
  const page = Math.max(1, parseInt(String(params.page ?? '1'), 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(String(params.per_page ?? '50'), 10) || 50));
  const sortField = VALID_SORT_FIELDS.includes(String(params.sort))
    ? String(params.sort)
    : 'submitted_at';
  const sortOrder = params.order === 'desc' ? 'desc' : 'asc';
  const search = typeof params.search === 'string' ? params.search.slice(0, 200) : undefined;
  const statusFilter = typeof params.status === 'string' ? params.status : 'needs_review';
  const positionFilter = typeof params.position === 'string' ? params.position : undefined;
  const featuredFilter = typeof params.featured === 'string' ? params.featured : undefined;
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : undefined;
  const dateTo = typeof params.date_to === 'string' ? params.date_to : undefined;

  const supabase = createServiceClient();

  // ── Build query ──
  let query = supabase.from('voice_submissions').select('*', { count: 'exact' });

  // Status filter (default: needs_review)
  if (statusFilter && statusFilter !== 'all') {
    const statuses = statusFilter.split(',').filter(Boolean) as ModerationStatus[];
    if (statuses.length === 1) {
      query = query.eq('moderation_status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('moderation_status', statuses);
    }
  }

  if (positionFilter) {
    const positions = positionFilter.split(',').filter(Boolean) as VoicePosition[];
    if (positions.length === 1) {
      query = query.eq('position', positions[0]);
    } else if (positions.length > 1) {
      query = query.in('position', positions);
    }
  }

  if (featuredFilter === 'true') {
    query = query.eq('featured', true);
  } else if (featuredFilter === 'false') {
    query = query.eq('featured', false);
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `author_name.ilike.${term},title.ilike.${term},body.ilike.${term},author_neighborhood.ilike.${term}`,
    );
  }

  if (dateFrom) query = query.gte('submitted_at', dateFrom);
  if (dateTo) query = query.lte('submitted_at', `${dateTo}T23:59:59.999Z`);

  query = query.order(sortField, { ascending: sortOrder === 'asc' });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: submissions, count } = await query;

  // ── Fetch counts per status for tab badges ──
  const STATUS_VALUES: ModerationStatus[] = [
    'needs_review',
    'pending',
    'auto_approved',
    'approved',
    'rejected',
  ];

  const countResults = await Promise.all(
    STATUS_VALUES.map(async (s) => {
      const { count: c } = await supabase
        .from('voice_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('moderation_status', s);
      return { status: s, count: c ?? 0 };
    }),
  );

  const counts: Record<string, number> = {};
  for (const row of countResults) {
    counts[row.status] = row.count;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Voices</h1>
        <p className="mt-1 text-sm text-gray-600">
          {count ?? 0} submission{(count ?? 0) !== 1 ? 's' : ''}
          {statusFilter && statusFilter !== 'all' ? ` matching "${statusFilter}"` : ''}
        </p>
      </div>

      <VoiceListClient
        submissions={submissions ?? []}
        total={count ?? 0}
        page={page}
        perPage={perPage}
        sortKey={sortField}
        sortDir={sortOrder as 'asc' | 'desc'}
        currentStatus={statusFilter}
        adminRole={admin.role}
        statusCounts={counts}
      />
    </div>
  );
}
