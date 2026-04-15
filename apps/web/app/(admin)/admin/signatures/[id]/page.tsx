import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { Signature } from '@confluenceohio/db/types';
import { SignatureDetailClient } from './_components/signature-detail-client';

export const metadata: Metadata = { title: 'Signature Detail' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SignatureDetailPage({ params }: Props) {
  const admin = await requireAdmin(['admin', 'viewer']);
  if (!admin) redirect('/admin/login');

  const { id } = await params;
  const supabase = createServiceClient();
  const isViewer = admin.role === 'viewer';

  // Fetch signature
  const { data: signature, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !signature) notFound();

  const sig = signature as Signature;

  // Fetch referrer (who referred this signer)
  let referrer: {
    id: string;
    first_name: string;
    last_name: string;
    signature_number: number;
    referral_code: string | null;
  } | null = null;

  if (sig.referred_by_id) {
    const { data } = await supabase
      .from('signatures')
      .select('id, first_name, last_name, signature_number, referral_code')
      .eq('id', sig.referred_by_id)
      .single();
    referrer = data;
  }

  // Fetch referrals made (people this signer referred)
  let referrals: {
    id: string;
    first_name: string;
    last_name: string;
    signature_number: number;
    signed_at: string;
  }[] = [];

  if (sig.referral_code) {
    const { data } = await supabase
      .from('signatures')
      .select('id, first_name, last_name, signature_number, signed_at')
      .eq('referred_by_code', sig.referral_code)
      .is('deleted_at', null)
      .order('signed_at', { ascending: false });
    referrals = data ?? [];
  }

  // PII masking for viewer
  const displaySignature = isViewer
    ? { ...sig, email: maskEmail(sig.email) }
    : sig;

  return (
    <SignatureDetailClient
      signature={displaySignature}
      referrer={referrer}
      referrals={referrals}
      adminRole={admin.role}
    />
  );
}

// ── Helpers ──

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.com';
  return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
}
