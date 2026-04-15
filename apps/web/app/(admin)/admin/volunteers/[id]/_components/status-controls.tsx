'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VolunteerStatus } from '@confluenceohio/db/types';

const STATUS_OPTIONS: { value: VolunteerStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'onboarded', label: 'Onboarded' },
];

export function StatusControls({
  volunteerId,
  currentStatus,
}: {
  volunteerId: string;
  currentStatus: VolunteerStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOnboard, setConfirmOnboard] = useState(false);

  const hasChanged = status !== currentStatus;

  async function saveStatus(newStatus: VolunteerStatus) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/volunteers/${volunteerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to update status.');
        setSaving(false);
        return;
      }

      setSaving(false);
      setConfirmOnboard(false);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  function handleChange(newStatus: VolunteerStatus) {
    setStatus(newStatus);

    if (newStatus === 'onboarded' && currentStatus !== 'onboarded') {
      setConfirmOnboard(true);
    } else {
      setConfirmOnboard(false);
    }
  }

  function handleSave() {
    saveStatus(status);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => handleChange(e.target.value as VolunteerStatus)}
          disabled={saving}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasChanged && !confirmOnboard && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving\u2026' : 'Save'}
          </button>
        )}
      </div>

      {confirmOnboard && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">
            Mark this volunteer as onboarded? This records the completion date.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving\u2026' : 'Confirm'}
            </button>
            <button
              onClick={() => {
                setStatus(currentStatus);
                setConfirmOnboard(false);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
