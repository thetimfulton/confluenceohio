import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import type { AdminUser, CampaignSetting } from '@confluenceohio/db/types';
import { SettingsClient } from './_components/settings-client';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const admin = await requireAdmin(['admin']);
  if (!admin) redirect('/admin/login');

  const supabase = createServiceClient();

  const [{ data: settings }, { data: adminUsers }] = await Promise.all([
    supabase.from('campaign_settings').select('*'),
    supabase.from('admin_users').select('id, email, role, created_at').order('created_at'),
  ]);

  // Convert settings array to a keyed object
  const settingsMap: Record<string, unknown> = {};
  for (const s of (settings ?? []) as CampaignSetting[]) {
    settingsMap[s.key] = s.value;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Campaign configuration and admin team management
        </p>
      </div>

      <SettingsClient
        settings={settingsMap}
        adminUsers={(adminUsers ?? []) as AdminUser[]}
        currentAdminId={admin.id}
      />
    </div>
  );
}
