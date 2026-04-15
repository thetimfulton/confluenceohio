import type { ModerationStatus } from '@confluenceohio/db/types';

const STATUS_STYLES: Record<ModerationStatus, string> = {
  needs_review: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-700',
  pending_email: 'border border-gray-300 text-gray-500 bg-white',
  auto_approved: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  appealed: 'bg-orange-100 text-orange-800',
};

const STATUS_LABELS: Record<ModerationStatus, string> = {
  needs_review: 'Needs Review',
  pending: 'Pending',
  pending_email: 'Pending Email',
  auto_approved: 'Auto-Approved',
  approved: 'Approved',
  rejected: 'Rejected',
  appealed: 'Appealed',
};

export function ModerationStatusBadge({ status }: { status: ModerationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
