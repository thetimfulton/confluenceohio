'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Clock, FileSignature } from 'lucide-react';
import type {
  AdminRole,
  Volunteer,
  VolunteerAdminNote,
  VolunteerRole,
} from '@confluenceohio/db/types';
import { StatusBadge } from '../../../_components/status-badge';
import { RoleBadges } from '../../../_components/role-badge';
import { StatusControls } from './status-controls';
import { AddNoteForm } from './add-note-form';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PetitionSignature {
  id: string;
  signature_number: number;
  signed_at: string;
  verification_status: string;
}

interface TimelineEntry {
  type: 'signup' | 'status_change' | 'note';
  date: string;
  description: string;
  actor?: string;
}

interface VolunteerDetailClientProps {
  volunteer: Volunteer;
  notes: VolunteerAdminNote[];
  petitionSignature: PetitionSignature | null;
  timeline: TimelineEntry[];
  adminRole: AdminRole;
}

// ---------------------------------------------------------------------------
// Availability display
// ---------------------------------------------------------------------------

const AVAILABILITY_LABELS: Record<string, string> = {
  weekday_mornings: 'Weekday mornings',
  weekday_evenings: 'Weekday evenings',
  weekends: 'Weekends',
  flexible: 'Flexible',
};

function formatAvailability(availability: string | null): string[] {
  if (!availability) return [];
  return availability
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => AVAILABILITY_LABELS[s] ?? s);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VolunteerDetailClient({
  volunteer,
  notes,
  petitionSignature,
  timeline,
  adminRole,
}: VolunteerDetailClientProps) {
  const isAdmin = adminRole === 'admin';
  const availabilityItems = formatAvailability(volunteer.availability);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/volunteers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to volunteers
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {volunteer.first_name} {volunteer.last_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Signed up{' '}
            {new Date(volunteer.signed_up_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <StatusBadge status={volunteer.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact info */}
          <Section title="Contact Information">
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoItem icon={Mail} label="Email" value={volunteer.email} />
              <InfoItem
                icon={Phone}
                label="Phone"
                value={volunteer.phone ?? 'Not provided'}
              />
              <InfoItem
                icon={MapPin}
                label="Neighborhood"
                value={volunteer.neighborhood ?? 'Not specified'}
              />
            </dl>
          </Section>

          {/* Roles */}
          <Section title="Roles">
            <RoleBadges roles={volunteer.roles ?? []} />
          </Section>

          {/* Availability */}
          {availabilityItems.length > 0 && (
            <Section title="Availability">
              <div className="flex flex-wrap gap-2">
                {availabilityItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Volunteer notes (from signup) */}
          {volunteer.notes && (
            <Section title="Volunteer Notes">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {volunteer.notes}
              </p>
            </Section>
          )}

          {/* Petition cross-reference */}
          <Section title="Petition Status">
            {petitionSignature ? (
              <div className="flex items-center gap-3">
                <FileSignature className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Signer #{petitionSignature.signature_number}
                  </p>
                  <p className="text-xs text-gray-500">
                    Signed{' '}
                    {new Date(petitionSignature.signed_at).toLocaleDateString()}{' '}
                    &middot; {petitionSignature.verification_status}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Not a petition signer (or signed with a different email).
              </p>
            )}
          </Section>

          {/* Status controls (admin only) */}
          {isAdmin && (
            <Section title="Manage Status">
              <StatusControls
                volunteerId={volunteer.id}
                currentStatus={volunteer.status}
              />
            </Section>
          )}
        </div>

        {/* Right column — notes + timeline */}
        <div className="space-y-6">
          {/* Admin notes */}
          <Section title="Admin Notes">
            {isAdmin && (
              <div className="mb-4">
                <AddNoteForm volunteerId={volunteer.id} />
              </div>
            )}
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-md border border-gray-200 bg-gray-50 p-3"
                  >
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {note.admin_email} &middot;{' '}
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Activity timeline */}
          <Section title="Activity Timeline">
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500">No activity.</p>
            ) : (
              <ul className="space-y-3">
                {timeline.map((entry, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-1">
                      <TimelineDot type={entry.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 break-words">
                        {entry.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleString()}
                        {entry.actor && ` \u00b7 ${entry.actor}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-gray-400" />
      <div>
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="text-sm text-gray-900">{value}</dd>
      </div>
    </div>
  );
}

function TimelineDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    signup: 'bg-green-500',
    status_change: 'bg-blue-500',
    note: 'bg-gray-400',
  };
  return (
    <span
      className={`block h-2.5 w-2.5 rounded-full ${colors[type] ?? 'bg-gray-400'}`}
    />
  );
}
