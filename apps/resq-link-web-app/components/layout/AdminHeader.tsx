'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell'
import { AdminProfileMenu } from '@/components/admin/AdminProfileMenu'
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle'
import { routes } from '@/lib/routes'

const PAGE_META: Record<string, { title: string; description: string }> = {
  [routes.admin.dashboard]: {
    title: 'Platform Overview',
    description:
      'A concise overview of RESQ-LINK users, agencies, verification, and administrative activity.',
  },
  [routes.admin.notifications]: {
    title: 'Notifications',
    description: 'KYC review queues, operational alerts, and system warnings.',
  },
  [routes.admin.dispatchers]: {
    title: 'Dispatchers',
    description: 'Manage dispatcher accounts and assignments.',
  },
  [routes.admin.responders]: {
    title: 'Responders',
    description: 'Manage responder accounts and access.',
  },
  [routes.admin.civilians]: {
    title: 'Civilians',
    description: 'Manage civilian accounts and verification.',
  },
  [routes.admin.agencies]: {
    title: 'Agencies',
    description: 'Manage emergency-response agencies and organizational information.',
  },
  [routes.admin.kyc]: {
    title: 'KYC Review',
    description: 'Review and verify civilian identity submissions.',
  },
  [routes.admin.audit]: {
    title: 'Audit Logs',
    description: 'Review administrative activity and account changes.',
  },
  [routes.admin.profile]: {
    title: 'Settings',
    description: 'Manage your Super Administrator account and preferences.',
  },
  [routes.admin.settings]: {
    title: 'Settings',
    description: 'Manage your Super Administrator account and preferences.',
  },
}

export function AdminHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname()
  const meta = PAGE_META[pathname] ?? {
    title: 'Platform Administration',
    description: 'RESQ-LINK Super Admin workspace.',
  }

  return (
    <header className="relative z-30 shrink-0 border-b border-admin-border/80 bg-admin-surface/90 backdrop-blur-md">
      <div className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-start gap-2.5">
          <button
            type="button"
            onClick={onOpenMenu}
            className="mt-0.5 rounded-lg p-2 text-admin-fg-muted transition-colors duration-admin hover:bg-admin-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-admin-fg sm:text-xl">
              {meta.title}
            </h1>
            <p className="mt-0.5 line-clamp-2 text-sm text-admin-fg-subtle">{meta.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <AdminThemeToggle />
          <AdminNotificationBell />
          <AdminProfileMenu />
        </div>
      </div>
    </header>
  )
}
