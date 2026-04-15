import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { SkipLink } from '@confluenceohio/ui/a11y';
import { requireAdmin } from '@/lib/admin/auth';
import { AdminSidebar } from './_components/admin-sidebar';
import { AdminHeader } from './_components/admin-header';

export const metadata: Metadata = {
  title: {
    default: 'Admin',
    template: '%s | Confluence Admin',
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SkipLink />
      <AdminSidebar role={admin.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader email={admin.email} role={admin.role} />
        <main id="main-content" className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
