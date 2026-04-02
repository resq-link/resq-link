'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Radio,
  Map,
  Ambulance,
  History,
  ChartColumn,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
} from 'lucide-react'

const navItems = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/intake', label: 'Intake', icon: FileText },
  { href: '/incident-management', label: 'Incident Management', icon: ClipboardList },
  { href: '/', label: 'Live Incidents', icon: Radio },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/resources', label: 'Resources', icon: Ambulance },
  { href: '/history', label: 'History', icon: History },
  { href: '/report', label: 'Report', icon: ChartColumn },
]

export default function Navigation() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-user-menu]') && !target.closest('[data-user-trigger]')) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [userMenuOpen])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Don't show navigation on login page (after all hooks to satisfy Rules of Hooks)
  if (pathname === '/login') {
    return null
  }

  const handleSignOut = async () => {
    setUserMenuOpen(false)
    await signOut()
  }

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`flex ${mobile ? 'flex-col gap-1.5' : 'items-center gap-1'} ${mobile ? 'py-3' : 'whitespace-nowrap'}`}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            onClick={() => mobile && setMobileMenuOpen(false)}
            className={`
              group flex items-center gap-2 whitespace-nowrap font-medium transition-colors duration-200 rounded-md
              ${
                mobile
                  ? 'px-4 py-3 text-sm'
                  : 'px-3 py-2 text-sm border-b-2'
              }
              ${isActive
                ? mobile
                  ? 'bg-slate-800/80 text-white'
                  : 'text-white border-primary-500'
                : mobile
                  ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  : 'text-slate-400 border-transparent hover:text-white'
              }
            `}
          >
            <Icon
              size={16}
              className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
              aria-hidden
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )

  return (
    <header
      className="sticky top-0 z-50 w-full bg-slate-900/85 border-b border-slate-800/90 backdrop-blur-lg"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center lg:h-[72px]">
          <div className="lg:w-[240px]">
            {/* Left: Brand */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group shrink-0"
              aria-label="RESQ-Link Command - Home"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/70 group-hover:border-primary-500/40 transition-colors">
                <Image
                  src="/branding/resq-link-icon.png"
                  alt=""
                  width={18}
                  height={18}
                  priority
                  className="opacity-95"
                />
              </div>
              <div className="flex flex-col">
                <span className="whitespace-nowrap text-base font-bold tracking-tight text-slate-100 leading-none">
                  RESQ-Link
                </span>
                <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-400">
                  Command Center
                </span>
              </div>
            </Link>
          </div>

          <div className="mx-4 hidden h-6 w-px bg-slate-800 lg:block" aria-hidden />

          {/* Middle: Desktop Nav */}
          <nav className="hidden flex-1 items-center justify-center lg:flex" aria-label="Main navigation">
            <NavLinks />
          </nav>

          <div className="mx-4 hidden h-6 w-px bg-slate-800 lg:block" aria-hidden />

          {/* Right: Admin + user menu + mobile toggle */}
          <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:w-[240px] lg:justify-end">
            <div className="hidden sm:block lg:w-[190px]">
              {user ? (
                <div className="relative" data-user-menu>
                <button
                  data-user-trigger
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-slate-800/70 min-w-0"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600/20 text-primary-400 border border-primary-500/30">
                    <User size={14} aria-hidden />
                  </div>
                  <div className="hidden xl:block min-w-0 max-w-[140px]">
                    <p className="truncate text-xs font-medium text-slate-200">
                      {user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">Command Dispatcher</p>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-56 origin-top-right rounded-xl border border-slate-700/80 bg-slate-900/95 shadow-xl shadow-black/20 backdrop-blur-xl py-1.5"
                    role="menu"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-700/60">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {user.email}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Signed in as command center admin</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/80 hover:text-red-300 transition-colors"
                      role="menuitem"
                    >
                      <LogOut size={16} className="shrink-0" aria-hidden />
                      Sign out
                    </button>
                  </div>
                )}
                </div>
              ) : loading ? (
                <div
                  className="flex h-10 items-center gap-2 rounded-lg px-2.5 py-1.5 opacity-60"
                  aria-hidden
                >
                  <div className="h-7 w-7 shrink-0 rounded-full border border-slate-700/70 bg-slate-800/60" />
                  <div className="hidden xl:block min-w-0 max-w-[140px]">
                    <p className="h-3.5 w-20 rounded bg-slate-800/70" />
                    <p className="mt-1 h-2.5 w-24 rounded bg-slate-800/60" />
                  </div>
                  <div className="h-3.5 w-3.5 rounded bg-slate-800/60" />
                </div>
              ) : (
                <div className="h-10" aria-hidden />
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 transition-colors lg:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Mobile sign out - visible when menu closed, compact */}
            {user && (
              <button
                onClick={handleSignOut}
                className="sm:hidden flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-red-300 transition-colors"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-xl"
          role="dialog"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto max-w-7xl px-4 py-2 pb-4 sm:px-6">
            <NavLinks mobile />
          </div>
        </div>
      )}
    </header>
  )
}
