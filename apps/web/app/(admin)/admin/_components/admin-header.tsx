'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import type { AdminRole } from '@confluenceohio/db/types';

const ROLE_LABELS: Record<AdminRole, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-800' },
  moderator: { label: 'Moderator', color: 'bg-purple-100 text-purple-800' },
  viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-700' },
};

export function AdminHeader({
  email,
  role,
}: {
  email: string;
  role: AdminRole;
}) {
  const router = useRouter();
  const roleInfo = ROLE_LABELS[role];

  async function handleLogout() {
    await fetch('/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-end gap-4 border-b border-gray-200 bg-white px-6 py-3">
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleInfo.color}`}
      >
        {roleInfo.label}
      </span>
      <span className="text-sm text-gray-600">{email}</span>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </header>
  );
}
