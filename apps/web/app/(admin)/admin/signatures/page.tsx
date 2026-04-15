import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { Signature, VerificationStatus } from '@confluenceohio/db/types';
import { SignatureListClient } from './_components/signature-list-client';

export const metadata: Metadata = { title: 'Signatures' };

const VALID_SORT_FIELDS = [
  'signature_number',
  'first_name',
  'city',
  'verification_status',
  'email_verified',
  'signed_at',
];

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignaturesPage({ searchParams }: Props) {
  const admin = await requireAdmin(['admin', 'viewer']);
  if (!admin) redirect('/admin/login');

  const params = await searchParams;

  // Parse query params
  const page = Math.max(1, parseInt(String(params.page ?? '1'), 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(String(params.per_page ?? '50'), 10) || 50));
  const sortField = VALID_SORT_FIELDS.includes(String(params.sort))
    ? String(params.sort)
    : 'signed_at';
  const sortOrder = params.order === 'asc' ? 'asc' : 'desc';
  const search = typeof params.search === 'string' ? params.search.slice(0, 200) : undefined;
  const statusFilter = typeof params.status === 'string' ? params.status : undefined;
  const emailVerified = typeof params.email_verified === 'string' ? params.email_verified : undefined;
  const hasReferral = typeof params.has_referral === 'string' ? params.has_referral : undefined;
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : undefined;
  const dateTo = typeof params.date_to === 'string' ? params.date_to : undefined;

  const supabase = createServiceClient();

  // ── Build query ──
  let query = supabase.from('signatures').select('*', { count: 'exact' });

  // Exclude soft-deleted
  query = query.is('deleted_at', null);

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},city.ilike.${term}`,
    );
  }

  if (statusFilter) {
    const statuses = statusFilter.split(',').filter(Boolean) as VerificationStatus[];
    if (statuses.length === 1) {
      query = query.eq('verification_status', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in('verification_status', statuses);
    }
  }

  if (emailVerified === 'true') {
    query = query.eq('email_verified', true);
  } else if (emailVerified === 'false') {
    query = query.eq('email_verified', false);
  }

  if (hasReferral === 'true') {
    query = query.not('referred_by_code', 'is', null);
  } else if (hasReferral === 'false') {
    query = query.is('referred_by_code', null);
  }

  if (dateFrom) query = query.gte('signed_at', dateFrom);
  if (dateTo) query = query.lte('signed_at', `${dateTo}T23:59:59.999Z`);

  query = query.order(sortField, { ascending: sortOrder === 'asc' });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: signatures, count } = await query;

  // ── PII masking for viewer ──
  const isViewer = admin.role === 'viewer';
  const maskedSignatures = isViewer
    ? (signatures as Signature[])?.map((s) => ({
        ...s,
        email: maskEmail(s.email),
      }))
    : (signatures as Signature[]) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Signatures</h1>
          <p className="mt-1 text-sm text-gray-600">
            {count ?? 0} total signature{(count ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <SignatureListClient
        signatures={maskedSignatures}
        total={count ?? 0}
        page={page}
        perPage={perPage}
        sortKey={sortField}
        sortDir={sortOrder as 'asc' | 'desc'}
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
