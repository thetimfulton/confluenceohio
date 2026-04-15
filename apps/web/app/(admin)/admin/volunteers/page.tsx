import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { Volunteer, VolunteerRole, VolunteerStatus } from '@confluenceohio/db/types';
import { VolunteerListClient } from './_components/volunteer-list-client';

export const metadata: Metadata = { title: 'Volunteers' };

const VALID_SORT_FIELDS = [
  'first_name',
  'last_name',
  'neighborhood',
  'status',
  'signed_up_at',
];

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VolunteersPage({ searchParams }: Props) {
  const admin = await requireAdmin(['admin', 'viewer']);
  if (!admin) redirect('/admin/login');

  const params = await searchParams;

  // Parse query params
  const page = Math.max(1, parseInt(String(params.page ?? '1'), 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(String(params.per_page ?? '25'), 10) || 25));
  const sortField = VALID_SORT_FIELDS.includes(String(params.sort))
    ? String(params.sort)
    : 'signed_up_at';
  const sortOrder = params.order === 'asc' ? 'asc' : 'desc';
  const search = typeof params.search === 'string' ? params.search.slice(0, 200) : undefined;
  const statusFilter = typeof params.status === 'string' ? params.status : undefined;
  const rolesFilter = typeof params.roles === 'string' ? params.roles : undefined;
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : undefined;
  const dateTo = typeof params.date_to === 'string' ? params.date_to : undefined;

  const supabase = createServiceClient();

  // ── Build query ──
  let query = supabase.from('volunteers').select('*', { count: 'exact' });

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},neighborhood.ilike.${term}`,
    );
  }

  if (statusFilter) {
    const statuses = statusFilter.split(',').filter(Boolean) as VolunteerStatus[];
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('status', statuses);
    }
  }

  if (rolesFilter) {
    const roleList = rolesFilter.split(',').filter(Boolean) as VolunteerRole[];
    for (const role of roleList) {
      query = query.contains('roles', [role]);
    }
  }

  if (dateFrom) query = query.gte('signed_up_at', dateFrom);
  if (dateTo) query = query.lte('signed_up_at', `${dateTo}T23:59:59.999Z`);

  query = query.order(sortField, { ascending: sortOrder === 'asc' });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: volunteers, count } = await query;

  // ── Role breakdown ──
  const { data: allVolunteers } = await supabase
    .from('volunteers')
    .select('roles');

  const roleCounts: Record<string, number> = {};
  for (const v of (allVolunteers ?? []) as { roles: VolunteerRole[] }[]) {
    for (const role of v.roles ?? []) {
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
  }

  // ── PII masking for viewer ──
  const isViewer = admin.role === 'viewer';
  const maskedVolunteers = isViewer
    ? (volunteers as Volunteer[])?.map((v) => ({
        ...v,
        email: maskEmail(v.email),
        phone: maskPhone(v.phone),
      }))
    : (volunteers as Volunteer[]) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Volunteers</h1>
          <p className="mt-1 text-sm text-gray-600">
            {count ?? 0} total volunteer{(count ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <VolunteerListClient
        volunteers={maskedVolunteers}
        total={count ?? 0}
        page={page}
        perPage={perPage}
        sortKey={sortField}
        sortDir={sortOrder as 'asc' | 'desc'}
        roleCounts={roleCounts}
        adminRole={admin.role}
      />
    </div>
  );
}

// ── Helpers ──

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.com';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\d(?=.{4})/g, '*');
}
