import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { EmailSubscriber, SubscriberSource } from '@confluenceohio/db/types';
import { EmailListClient } from './_components/email-list-client';

export const metadata: Metadata = { title: 'Email List' };

const VALID_SORT_FIELDS = ['email', 'source', 'status', 'subscribed_at'];

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EmailPage({ searchParams }: Props) {
  const admin = await requireAdmin(['admin']);
  if (!admin) redirect('/admin/login');

  const params = await searchParams;

  // Parse query params
  const page = Math.max(1, parseInt(String(params.page ?? '1'), 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(String(params.per_page ?? '25'), 10) || 25));
  const sortField = VALID_SORT_FIELDS.includes(String(params.sort))
    ? String(params.sort)
    : 'subscribed_at';
  const sortOrder = params.order === 'asc' ? 'asc' : 'desc';
  const search = typeof params.search === 'string' ? params.search.slice(0, 200) : undefined;
  const sourceFilter = typeof params.source === 'string' ? params.source : undefined;
  const statusFilter = typeof params.status === 'string' ? params.status : undefined;

  const supabase = createServiceClient();

  // ── Build query ──
  let query = supabase.from('email_subscribers').select('*', { count: 'exact' });

  if (search) {
    const term = `%${search}%`;
    query = query.or(`email.ilike.${term},first_name.ilike.${term}`);
  }

  if (sourceFilter) {
    query = query.eq('source', sourceFilter);
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  query = query.order(sortField, { ascending: sortOrder === 'asc' });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: subscribers, count } = await query;

  // ── Source breakdown ──
  const { data: allSources } = await supabase
    .from('email_subscribers')
    .select('source, status');

  const sourceCounts: Record<string, number> = {};
  let activeCount = 0;
  for (const s of allSources ?? []) {
    sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
    if (s.status === 'active') activeCount++;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Email List</h1>
          <p className="mt-1 text-sm text-gray-600">
            {activeCount} active subscriber{activeCount !== 1 ? 's' : ''} of {(allSources ?? []).length} total
          </p>
        </div>
      </div>

      <EmailListClient
        subscribers={(subscribers as EmailSubscriber[]) ?? []}
        total={count ?? 0}
        page={page}
        perPage={perPage}
        sortKey={sortField}
        sortDir={sortOrder as 'asc' | 'desc'}
        sourceCounts={sourceCounts}
        activeCount={activeCount}
        totalCount={(allSources ?? []).length}
      />
    </div>
  );
}
