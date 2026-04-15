'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, UserPlus, Shield, Eye, MessageSquare } from 'lucide-react';
import type { AdminRole, AdminUser } from '@confluenceohio/db/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SettingsClientProps {
  settings: Record<string, unknown>;
  adminUsers: AdminUser[];
  currentAdminId: string;
}

const ROLE_ICONS: Record<AdminRole, React.ElementType> = {
  admin: Shield,
  moderator: MessageSquare,
  viewer: Eye,
};

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  viewer: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  admin: 'Full access to all pages and settings',
  moderator: 'Voice moderation only',
  viewer: 'Read-only access with PII masking',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsClient({
  settings,
  adminUsers,
  currentAdminId,
}: SettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Setting state ──
  const [signatureGoal, setSignatureGoal] = useState(
    String(settings.signature_goal ?? '22000'),
  );
  const [milestones, setMilestones] = useState(
    JSON.stringify(settings.milestone_thresholds ?? [1000, 2500, 5000, 10000, 15000, 22000]),
  );
  const [announcement, setAnnouncement] = useState(
    settings.site_announcement && settings.site_announcement !== null
      ? String(settings.site_announcement)
      : '',
  );
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(
    String(settings.moderation_auto_approve_threshold ?? '0.85'),
  );
  const [autoRejectThreshold, setAutoRejectThreshold] = useState(
    String(settings.moderation_auto_reject_threshold ?? '0.15'),
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    settings.maintenance_mode === true,
  );

  // ── Invite state ──
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('viewer');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [inviteError, setInviteError] = useState('');

  // ── Save feedback ──
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'error' | null>>({});

  // ── Setting update handler ──

  const updateSetting = useCallback(
    async (key: string, value: unknown) => {
      setSaveStatus((prev) => ({ ...prev, [key]: null }));
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? 'Failed to save');
        }

        setSaveStatus((prev) => ({ ...prev, [key]: 'saved' }));
        setTimeout(() => {
          setSaveStatus((prev) => ({ ...prev, [key]: null }));
        }, 2000);

        startTransition(() => router.refresh());
      } catch (e) {
        setSaveStatus((prev) => ({ ...prev, [key]: 'error' }));
      }
    },
    [router],
  );

  // ── Invite handler ──

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviteStatus('sending');
    setInviteError('');

    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to send invite');
      }

      setInviteStatus('sent');
      setInviteEmail('');
      startTransition(() => router.refresh());

      setTimeout(() => setInviteStatus('idle'), 3000);
    } catch (e) {
      setInviteStatus('error');
      setInviteError(e instanceof Error ? e.message : 'Failed to send invite');
    }
  }, [inviteEmail, inviteRole, router]);

  // ── Save button helper ──

  function SaveButton({
    settingKey,
    onClick,
  }: {
    settingKey: string;
    onClick: () => void;
  }) {
    const status = saveStatus[settingKey];
    return (
      <button
        onClick={onClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" />
        {status === 'saved' ? 'Saved!' : status === 'error' ? 'Error' : 'Save'}
      </button>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Campaign Settings ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Campaign Settings
        </h2>
        <div className="space-y-6">
          {/* Signature Goal */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label
                htmlFor="signature-goal"
                className="block text-sm font-medium text-gray-700"
              >
                Signature Goal
              </label>
              <p className="text-xs text-gray-500">
                Target number of petition signatures. Updates the progress bar on the public site.
              </p>
              <input
                id="signature-goal"
                type="number"
                min="1"
                value={signatureGoal}
                onChange={(e) => setSignatureGoal(e.target.value)}
                className="mt-1 block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <SaveButton
              settingKey="signature_goal"
              onClick={() => updateSetting('signature_goal', Number(signatureGoal))}
            />
          </div>

          {/* Milestone Thresholds */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label
                htmlFor="milestones"
                className="block text-sm font-medium text-gray-700"
              >
                Milestone Thresholds
              </label>
              <p className="text-xs text-gray-500">
                JSON array of numbers. Milestone celebration emails fire when these are crossed.
              </p>
              <input
                id="milestones"
                type="text"
                value={milestones}
                onChange={(e) => setMilestones(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <SaveButton
              settingKey="milestone_thresholds"
              onClick={() => {
                try {
                  const parsed = JSON.parse(milestones);
                  if (!Array.isArray(parsed)) throw new Error('Must be an array');
                  updateSetting('milestone_thresholds', parsed);
                } catch {
                  setSaveStatus((prev) => ({ ...prev, milestone_thresholds: 'error' }));
                }
              }}
            />
          </div>

          {/* Site Announcement */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label
                htmlFor="announcement"
                className="block text-sm font-medium text-gray-700"
              >
                Site Announcement Banner
              </label>
              <p className="text-xs text-gray-500">
                Optional text shown on all public pages. Leave empty to hide.
              </p>
              <input
                id="announcement"
                type="text"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="No announcement"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <SaveButton
              settingKey="site_announcement"
              onClick={() =>
                updateSetting(
                  'site_announcement',
                  announcement.trim() || null,
                )
              }
            />
          </div>

          {/* AI Moderation Thresholds */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                AI Moderation Thresholds
              </label>
              <p className="text-xs text-gray-500">
                Auto-approve above first value, auto-reject below second value.
              </p>
              <div className="mt-1 flex gap-3">
                <div>
                  <label htmlFor="auto-approve" className="text-xs text-gray-500">
                    Auto-approve
                  </label>
                  <input
                    id="auto-approve"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={autoApproveThreshold}
                    onChange={(e) => setAutoApproveThreshold(e.target.value)}
                    className="block w-24 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="auto-reject" className="text-xs text-gray-500">
                    Auto-reject
                  </label>
                  <input
                    id="auto-reject"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={autoRejectThreshold}
                    onChange={(e) => setAutoRejectThreshold(e.target.value)}
                    className="block w-24 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <SaveButton
                settingKey="moderation_auto_approve_threshold"
                onClick={() =>
                  updateSetting(
                    'moderation_auto_approve_threshold',
                    Number(autoApproveThreshold),
                  )
                }
              />
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="flex items-center justify-between rounded-md border border-gray-200 p-4">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Maintenance Mode
              </p>
              <p className="text-xs text-gray-500">
                Shows maintenance page on public site. Admin dashboard remains accessible.
              </p>
            </div>
            <button
              onClick={() => {
                const newVal = !maintenanceMode;
                setMaintenanceMode(newVal);
                updateSetting('maintenance_mode', newVal);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={maintenanceMode}
              aria-label="Toggle maintenance mode"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ── Admin Team ── */}
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Admin Team
        </h2>

        {/* Current admins */}
        <div className="mb-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Added
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adminUsers.map((user) => {
                const Icon = ROLE_ICONS[user.role];
                return (
                  <tr key={user.id}>
                    <td className="py-2 text-sm text-gray-900">
                      {user.email}
                      {user.id === currentAdminId && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        <Icon className="h-3 w-3" />
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="py-2 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Invite form */}
        <div className="rounded-md border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-700">
            Invite new admin
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label htmlFor="invite-email" className="sr-only">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="sr-only">
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                className="block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              onClick={handleInvite}
              disabled={inviteStatus === 'sending' || !inviteEmail.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {inviteStatus === 'sending'
                ? 'Sending\u2026'
                : inviteStatus === 'sent'
                  ? 'Invite Sent!'
                  : 'Send Invite'}
            </button>
          </div>

          {inviteStatus === 'error' && inviteError && (
            <p className="mt-2 text-sm text-red-600">{inviteError}</p>
          )}

          <div className="mt-3 space-y-1">
            {(['admin', 'moderator', 'viewer'] as AdminRole[]).map((role) => (
              <p key={role} className="text-xs text-gray-500">
                <span className="font-medium">{ROLE_LABELS[role]}:</span>{' '}
                {ROLE_DESCRIPTIONS[role]}
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
