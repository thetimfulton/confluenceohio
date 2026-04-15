import type { VolunteerStatus } from '@confluenceohio/db/types';

const STATUS_STYLES: Record<VolunteerStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-700',
  onboarded: 'bg-blue-100 text-blue-800',
};

const STATUS_LABELS: Record<VolunteerStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  onboarded: 'Onboarded',
};

export function StatusBadge({ status }: { status: VolunteerStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
