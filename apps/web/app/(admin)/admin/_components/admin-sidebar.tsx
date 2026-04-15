'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileSignature,
  MessageSquare,
  DollarSign,
  Users,
  Mail,
  Share2,
  Settings,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { AdminRole } from '@confluenceohio/db/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: AdminRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['admin', 'moderator', 'viewer'],
  },
  {
    label: 'Signatures',
    href: '/admin/signatures',
    icon: FileSignature,
    roles: ['admin', 'viewer'],
  },
  {
    label: 'Voices',
    href: '/admin/voices',
    icon: MessageSquare,
    roles: ['admin', 'moderator'],
  },
  {
    label: 'Donations',
    href: '/admin/donations',
    icon: DollarSign,
    roles: ['admin', 'viewer'],
  },
  {
    label: 'Volunteers',
    href: '/admin/volunteers',
    icon: Users,
    roles: ['admin', 'viewer'],
  },
  {
    label: 'Email List',
    href: '/admin/email',
    icon: Mail,
    roles: ['admin'],
  },
  {
    label: 'Referrals',
    href: '/admin/referrals',
    icon: Share2,
    roles: ['admin'],
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export function AdminSidebar({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const navContent = (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">
          Confluence Admin
        </h1>
      </div>

      <ul className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-gray-200 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to public site
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 rounded-md bg-white p-2 shadow-md lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            role="button"
            tabIndex={0}
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMobileOpen(false);
              }
            }}
          />
          <div className="relative h-full w-64 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
        {navContent}
      </aside>
    </>
  );
}
