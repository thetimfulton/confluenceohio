import type { VerificationStatus } from '@confluenceohio/db/types';

const STATUS_STYLES: Record<VerificationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  verified: 'bg-green-100 text-green-800',
  flagged: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
  duplicate: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  flagged: 'Flagged',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
};

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
