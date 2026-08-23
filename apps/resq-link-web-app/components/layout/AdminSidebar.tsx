'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  ClipboardList,
  Headset,
  Landmark,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useSignOutFlow } from '@/components/admin/SignOutFlow'
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle'
import { useAdminNotificationPreview } from '@/hooks/useAdminNotifications'
import { routes } from '@/lib/routes'

function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return 'SA'
  const local = email.split('@')[0] || ''
  if (/admin|super/i.test(local)) return 'SA'
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase().slice(0, 2) || 'SA'
  }
  return local.slice(0, 2).toUpperCase() || 'SA'
}

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  badgeKey?: 'notifications'
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { href: routes.admin.dashboard, label: 'Dashboard', icon: LayoutDashboard },
      {
        href: routes.admin.notifications,
        label: 'Notifications',
        icon: Bell,
        badgeKey: 'notifications',
      },
    ],
  },
  {
    label: 'User Management',
    items: [
      { href: routes.admin.dispatchers, label: 'Dispatchers', icon: Headset },
      { href: routes.admin.responders, label: 'Responders', icon: Radio },
      { href: routes.admin.civilians, label: 'Civilians', icon: Users },
    ],
  },
  {
    label: 'Organization',
    items: [{ href: routes.admin.agencies, label: 'Agencies', icon: Landmark }],
  },
  {
    label: 'Verification',
    items: [{ href: routes.admin.kyc, label: 'KYC Review', icon: ShieldCheck }],
  },
  {
    label: 'Governance',
    items: [
      { href: routes.admin.audit, label: 'Audit Logs', icon: ClipboardList },
      { href: routes.admin.settings, label: 'Settings', icon: Settings },
    ],
  },
]

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

export function AdminSidebar({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { user } = useAdminAuth()
  const { requestSignOut, isSigningOut } = useSignOutFlow()
  const notifications = useAdminNotificationPreview()
  const email = user?.email || null
  const initials = initialsFromEmail(email)
  const unreadCount = notifications.unreadCount

  return (
    <div className="flex h-full min-h-0 flex-col bg-admin-sidebar text-admin-fg">
      {/* Branding */}
      <div className="shrink-0 border-b border-admin-border px-4 pb-4 pt-[1.125rem]">
        <Link
          href={routes.admin.dashboard}
          onClick={onNavigate}
          className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35"
        >
          <Image
            src="/branding/resq-link-icon.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 object-contain"
            priority
          />
          <span className="min-w-0 leading-tight">
            <span className="block text-[13px] font-semibold tracking-[0.06em] text-admin-fg">
              RESQ-LINK
            </span>
            <span className="mt-0.5 block text-[11px] font-normal tracking-normal text-admin-fg-subtle">
              Platform Administration
            </span>
          </span>
        </Link>
      </div>

      {/* Navigation — only this region scrolls */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3" aria-label="Primary">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.label} className={sectionIndex === 0 ? '' : 'mt-4'}>
            <p className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-admin-fg-subtle">
              {section.label}
            </p>
            <ul className="space-y-px pl-1.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                const showBadge =
                  item.badgeKey === 'notifications' && unreadCount > 0

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center gap-2.5 rounded-md py-[0.4375rem] pl-2.5 pr-2 text-[13px] font-medium transition-[background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/30 ${
                        active
                          ? 'bg-primary-500/[0.09] text-admin-fg dark:bg-primary-500/[0.14]'
                          : 'text-admin-fg-muted hover:bg-admin-hover hover:text-admin-fg'
                      }`}
                    >
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full bg-primary-500"
                        />
                      ) : null}
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className={`shrink-0 transition-colors duration-150 ${
                          active
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-admin-fg-subtle group-hover:text-admin-fg-muted'
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {showBadge ? (
                        <span className="ml-1 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums leading-none text-primary-700 dark:text-primary-300">
                          {formatBadgeCount(unreadCount)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account — anchored, not a floating card */}
      <div className="shrink-0 border-t border-admin-border px-3 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-admin-muted text-[11px] font-semibold tracking-wide text-admin-fg-muted ring-1 ring-inset ring-admin-border"
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-tight text-admin-fg">
              Super Admin
            </p>
            <p
              className="mt-0.5 truncate text-[11px] leading-tight text-admin-fg-subtle"
              title={email || undefined}
            >
              {email || 'Not signed in'}
            </p>
          </div>
          <AdminThemeToggle className="h-8 w-8 shrink-0" />
        </div>

        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => {
            onNavigate?.()
            requestSignOut()
          }}
          className="mt-2.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-admin-fg-muted transition-[background-color,color] duration-150 hover:bg-red-500/[0.08] hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-red-400"
        >
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
