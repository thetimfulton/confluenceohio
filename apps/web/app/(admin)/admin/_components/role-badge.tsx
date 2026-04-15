import type { VolunteerRole } from '@confluenceohio/db/types';

const ROLE_LABELS: Record<VolunteerRole, string> = {
  signature_collector: 'Signature Collector',
  social_amplifier: 'Social Amplifier',
  neighborhood_captain: 'Neighborhood Captain',
  event_organizer: 'Event Organizer',
  story_collector: 'Story Collector',
  design_content: 'Design & Content',
  outreach_liaison: 'Outreach Liaison',
};

export function RoleBadge({ role }: { role: VolunteerRole }) {
  return (
    <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export function RoleBadges({ roles }: { roles: VolunteerRole[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <RoleBadge key={role} role={role} />
      ))}
    </div>
  );
}
