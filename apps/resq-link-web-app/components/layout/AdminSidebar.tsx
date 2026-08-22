'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Building2,
  ClipboardList,
  Headset,
  Landmark,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
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

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: routes.admin.dashboard, label: 'Dashboard', icon: LayoutDashboard },
      { href: routes.admin.notifications, label: 'Notifications', icon: Bell },
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
    items: [
      { href: routes.admin.commandCenters, label: 'Command Centers', icon: Building2 },
      { href: routes.admin.agencies, label: 'Agencies', icon: Landmark },
    ],
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

export function AdminSidebar({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { user, signOut } = useAdminAuth()
  const email = user?.email || null
  const initials = initialsFromEmail(email)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.08] px-5 py-5">
        <Link
          href={routes.admin.dashboard}
          onClick={onNavigate}
          className="group flex items-start gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50"
        >
          <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 ring-1 ring-primary-400/25 transition-colors duration-admin group-hover:bg-primary-500/20">
            <Image
              src="/branding/resq-link-icon.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold tracking-wide text-white">RESQ-LINK</span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-400">Platform Administration</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-admin ease-out ${
                      active
                        ? 'bg-primary-500/15 text-primary-300 ring-1 ring-inset ring-primary-400/20'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <Icon
                      size={16}
                      aria-hidden="true"
                      className={`shrink-0 transition-colors duration-admin ${
                        active ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <div className="rounded-xl bg-white/[0.03] p-2.5 ring-1 ring-inset ring-white/[0.08]">
          <div className="flex items-center gap-2.5 px-0.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-xs font-semibold tracking-wide text-primary-300 ring-1 ring-inset ring-primary-400/25"
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">Super Admin</p>
              <p className="truncate text-[11px] text-slate-400" title={email || undefined}>
                {email || 'Not signed in'}
              </p>
            </div>
          </div>
          <div className="my-2.5 border-t border-white/[0.08]" role="separator" />
          <button
            type="button"
            onClick={() => {
              onNavigate?.()
              void signOut()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors duration-admin hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
          >
            <LogOut size={15} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
