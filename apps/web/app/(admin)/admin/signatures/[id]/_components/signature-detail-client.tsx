'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Hash,
  CheckCircle,
  XCircle,
  Shield,
  Link2,
  Flag,
  Ban,
  RotateCcw,
  Globe,
} from 'lucide-react';
import type { AdminRole, Signature } from '@confluenceohio/db/types';
import { VerificationStatusBadge } from '../../../_components/verification-status-badge';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReferrerInfo {
  id: string;
  first_name: string;
  last_name: string;
  signature_number: number;
  referral_code: string | null;
}

interface ReferralInfo {
  id: string;
  first_name: string;
  last_name: string;
  signature_number: number;
  signed_at: string;
}

interface SignatureDetailClientProps {
  signature: Signature;
  referrer: ReferrerInfo | null;
  referrals: ReferralInfo[];
  adminRole: AdminRole;
}

// ---------------------------------------------------------------------------
// DPV match code descriptions
// ---------------------------------------------------------------------------

const DPV_MATCH_LABELS: Record<string, string> = {
  Y: 'Confirmed (valid address)',
  S: 'Secondary missing (e.g., apartment # needed)',
  D: 'Primary missing (street number not confirmed)',
  N: 'Not confirmed',
};

const RDI_LABELS: Record<string, string> = {
  Residential: 'Residential',
  Commercial: 'Commercial',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SignatureDetailClient({
  signature,
  referrer,
  referrals,
  adminRole,
}: SignatureDetailClientProps) {
  const router = useRouter();
  const isAdmin = adminRole === 'admin';
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (action: 'flag' | 'reject' | 'restore') => {
    if (!confirm(`Are you sure you want to ${action} this signature?`)) return;

    setActionLoading(action);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/signatures/${signature.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Action failed');
        return;
      }

      router.refresh();
    } catch {
      setActionError('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const fullAddress = [
    signature.address_line_1,
    signature.address_line_2,
    `${signature.city}, ${signature.state} ${signature.zip_code}${signature.zip_plus_4 ? `-${signature.zip_plus_4}` : ''}`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/signatures"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to signatures
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {signature.first_name} {signature.last_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Signer #{signature.signature_number} &middot; Signed{' '}
            {new Date(signature.signed_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <VerificationStatusBadge status={signature.verification_status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact info */}
          <Section title="Contact Information">
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoItem icon={Mail} label="Email" value={signature.email} />
              <InfoItem
                icon={MapPin}
                label="Address"
                value={fullAddress}
                preformatted
              />
            </dl>
          </Section>

          {/* Verification details */}
          <Section title="Verification Details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoItem
                icon={Shield}
                label="DPV Match"
                value={
                  signature.smarty_dpv_match_code
                    ? `${signature.smarty_dpv_match_code} — ${DPV_MATCH_LABELS[signature.smarty_dpv_match_code] ?? 'Unknown'}`
                    : 'N/A'
                }
              />
              <InfoItem
                icon={Shield}
                label="Address Type (RDI)"
                value={
                  signature.smarty_rdi
                    ? RDI_LABELS[signature.smarty_rdi] ?? signature.smarty_rdi
                    : 'N/A'
                }
              />
              <InfoItem
                icon={Shield}
                label="CMRA (Mail Agent)"
                value={signature.smarty_dpv_cmra === 'Y' ? 'Yes (commercial mail agent)' : 'No'}
              />
              <InfoItem
                icon={Shield}
                label="Vacant"
                value={signature.smarty_dpv_vacant === 'Y' ? 'Yes (vacant address)' : 'No'}
              />
              {signature.smarty_latitude && signature.smarty_longitude && (
                <InfoItem
                  icon={Globe}
                  label="Coordinates"
                  value={`${signature.smarty_latitude}, ${signature.smarty_longitude}`}
                />
              )}
              <InfoItem
                icon={Shield}
                label="Turnstile Valid"
                value={signature.turnstile_token_valid ? 'Yes' : 'No'}
              />
              <InfoItem
                icon={Shield}
                label="Honeypot Clean"
                value={signature.honeypot_clean ? 'Yes' : 'No'}
              />
            </dl>
          </Section>

          {/* Email verification */}
          <Section title="Email Verification">
            <div className="flex items-center gap-3">
              {signature.email_verified ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email verified</p>
                    {signature.email_verified_at && (
                      <p className="text-xs text-gray-500">
                        Verified{' '}
                        {new Date(signature.email_verified_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <p className="text-sm text-gray-500">Email not verified</p>
                </>
              )}
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500">
                Email opt-in: {signature.email_opt_in ? 'Yes' : 'No'}
              </p>
            </div>
          </Section>

          {/* Admin actions */}
          {isAdmin && (
            <Section title="Actions">
              {actionError && (
                <p className="mb-3 text-sm text-red-600" role="alert">{actionError}</p>
              )}
              <div className="flex flex-wrap gap-3">
                {signature.verification_status !== 'flagged' &&
                  signature.verification_status !== 'rejected' && (
                    <ActionButton
                      icon={Flag}
                      label="Flag"
                      variant="amber"
                      loading={actionLoading === 'flag'}
                      disabled={actionLoading !== null}
                      onClick={() => handleAction('flag')}
                    />
                  )}
                {signature.verification_status !== 'rejected' && (
                  <ActionButton
                    icon={Ban}
                    label="Reject"
                    variant="red"
                    loading={actionLoading === 'reject'}
                    disabled={actionLoading !== null}
                    onClick={() => handleAction('reject')}
                  />
                )}
                {signature.verification_status === 'rejected' && (
                  <ActionButton
                    icon={RotateCcw}
                    label="Restore"
                    variant="green"
                    loading={actionLoading === 'restore'}
                    disabled={actionLoading !== null}
                    onClick={() => handleAction('restore')}
                  />
                )}
              </div>
            </Section>
          )}
        </div>

        {/* Right column — referral info */}
        <div className="space-y-6">
          {/* Referral info */}
          <Section title="Referral Information">
            <dl className="space-y-3">
              <InfoItem
                icon={Hash}
                label="Referral Code"
                value={signature.referral_code ?? 'None'}
              />
              <InfoItem
                icon={Link2}
                label="Referred By"
                value={
                  referrer
                    ? `${referrer.first_name} ${referrer.last_name} (#${referrer.signature_number})`
                    : signature.referred_by_code ?? 'Direct'
                }
              />
            </dl>
            {referrer && (
              <Link
                href={`/admin/signatures/${referrer.id}`}
                className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
              >
                View referrer &rarr;
              </Link>
            )}
          </Section>

          {/* Referrals made */}
          <Section title={`Referrals Made (${referrals.length})`}>
            {referrals.length === 0 ? (
              <p className="text-sm text-gray-500">No referrals yet.</p>
            ) : (
              <ul className="space-y-2">
                {referrals.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/signatures/${r.id}`}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {r.first_name} {r.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          #{r.signature_number}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(r.signed_at).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Metadata */}
          <Section title="Metadata">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Signed at</dt>
                <dd className="text-gray-900">
                  {new Date(signature.signed_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Last updated</dt>
                <dd className="text-gray-900">
                  {new Date(signature.updated_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">ID</dt>
                <dd className="font-mono text-xs text-gray-500 break-all">
                  {signature.id}
                </dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  preformatted,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  preformatted?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-gray-400" />
      <div>
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd
          className={`text-sm text-gray-900 ${preformatted ? 'whitespace-pre-line' : ''}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

const VARIANT_STYLES = {
  amber: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
  red: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
  green: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100',
};

function ActionButton({
  icon: Icon,
  label,
  variant,
  loading,
  disabled,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  variant: keyof typeof VARIANT_STYLES;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_STYLES[variant]}`}
    >
      <Icon className="h-4 w-4" />
      {loading ? `${label}ing\u2026` : label}
    </button>
  );
}
