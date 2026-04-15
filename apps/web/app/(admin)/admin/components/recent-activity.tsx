import {
  FileSignature,
  MessageSquare,
  DollarSign,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface ActivityItem {
  activity_type: string;
  description: string;
  detail: Record<string, unknown>;
  occurred_at: string;
}

const ACTIVITY_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; bg: string }
> = {
  signature: {
    icon: FileSignature,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  voice: {
    icon: MessageSquare,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  donation: {
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  volunteer: {
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface RecentActivityProps {
  items: ActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Recent Activity
        </h2>
        <p className="mt-4 text-sm text-gray-400">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Recent Activity
      </h2>

      <ul className="mt-4 divide-y divide-gray-100" role="list">
        {items.map((item, idx) => {
          const config = ACTIVITY_CONFIG[item.activity_type] ?? {
            icon: FileSignature,
            color: 'text-gray-600',
            bg: 'bg-gray-50',
          };
          const Icon = config.icon;

          return (
            <li key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bg}`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${config.color}`}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">{item.description}</p>
                <p className="text-xs text-gray-400">
                  {relativeTime(item.occurred_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
