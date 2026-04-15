import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { Donation } from '@confluenceohio/db/types';
import { DonationListClient } from './_components/donation-list-client';

export const metadata: Metadata = { title: 'Donations' };

const VALID_SORT_FIELDS = ['donated_at', 'amount_cents', 'donor_name'];

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DonationsPage({ searchParams }: Props) {
  const admin = await requireAdmin(['admin', 'viewer']);
  if (!admin) redirect('/admin/login');

  const params = await searchParams;

  // Parse query params
  const page = Math.max(1, parseInt(String(params.page ?? '1'), 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(String(params.per_page ?? '25'), 10) || 25));
  const sortField = VALID_SORT_FIELDS.includes(String(params.sort))
    ? String(params.sort)
    : 'donated_at';
  const sortOrder = params.order === 'asc' ? 'asc' : 'desc';
  const search = typeof params.search === 'string' ? params.search.slice(0, 200) : undefined;
  const recurringFilter = typeof params.recurring === 'string' ? params.recurring : undefined;
  const refcodeFilter = typeof params.refcode === 'string' ? params.refcode : undefined;
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : undefined;
  const dateTo = typeof params.date_to === 'string' ? params.date_to : undefined;

  const supabase = createServiceClient();

  // ── Build query ──
  let query = supabase.from('donations').select('*', { count: 'exact' });

  if (search) {
    const term = `%${search}%`;
    query = query.or(`donor_name.ilike.${term},donor_email.ilike.${term}`);
  }

  if (recurringFilter === 'true') {
    query = query.eq('recurring', true);
  } else if (recurringFilter === 'false') {
    query = query.eq('recurring', false);
  }

  if (refcodeFilter) {
    query = query.eq('refcode', refcodeFilter);
  }

  if (dateFrom) query = query.gte('donated_at', dateFrom);
  if (dateTo) query = query.lte('donated_at', `${dateTo}T23:59:59.999Z`);

  query = query.order(sortField, { ascending: sortOrder === 'asc' });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: donations, count } = await query;

  // ── Aggregate stats (global, not filtered) ──
  const [
    { data: allDonations },
    { data: refcodePerf },
  ] = await Promise.all([
    supabase.from('donations').select('amount_cents, recurring, donor_email'),
    supabase.rpc('donation_refcode_performance'),
  ]);

  const stats = computeStats(allDonations ?? []);

  // ── PII masking for viewer ──
  const isViewer = admin.role === 'viewer';
  const maskedDonations = isViewer
    ? (donations as Donation[])?.map((d) => ({
        ...d,
        donor_email: d.donor_email ? maskEmail(d.donor_email) : null,
      }))
    : (donations as Donation[]) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Donations</h1>
          <p className="mt-1 text-sm text-gray-600">
            {count ?? 0} total donation{(count ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <DonationListClient
        donations={maskedDonations}
        total={count ?? 0}
        page={page}
        perPage={perPage}
        sortKey={sortField}
        sortDir={sortOrder as 'asc' | 'desc'}
        stats={stats}
        refcodePerformance={(refcodePerf ?? []) as RefcodePerf[]}
        adminRole={admin.role}
      />
    </div>
  );
}

// ── Types ──

export interface DonationStats {
  totalRaised: number;
  donorCount: number;
  avgDonation: number;
  recurringPct: number;
  largest: number;
}

export interface RefcodePerf {
  refcode: string;
  donation_count: number;
  total_cents: number;
  avg_cents: number;
  recurring_count: number;
}

// ── Helpers ──

function computeStats(
  data: { amount_cents: number; recurring: boolean; donor_email: string | null }[],
): DonationStats {
  if (data.length === 0) {
    return { totalRaised: 0, donorCount: 0, avgDonation: 0, recurringPct: 0, largest: 0 };
  }

  const totalCents = data.reduce((sum, d) => sum + d.amount_cents, 0);
  const recurringCount = data.filter((d) => d.recurring).length;
  const uniqueDonors = new Set(data.map((d) => d.donor_email).filter(Boolean)).size;
  const largest = Math.max(...data.map((d) => d.amount_cents));

  return {
    totalRaised: totalCents,
    donorCount: uniqueDonors,
    avgDonation: Math.round(totalCents / data.length),
    recurringPct: data.length > 0 ? Math.round((recurringCount / data.length) * 100) : 0,
    largest,
  };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.com';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
}
