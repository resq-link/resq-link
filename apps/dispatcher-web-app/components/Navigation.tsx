'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Radio,
  Map,
  History,
  Ambulance,
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
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      className={`flex ${mobile ? 'flex-col gap-1' : 'items-center gap-1'} ${mobile ? 'py-4' : ''}`}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const IconComponent = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            onClick={() => mobile && setMobileMenuOpen(false)}
            className={`
              flex items-center gap-2.5 font-medium transition-all duration-200 rounded-lg
              ${mobile ? 'px-4 py-3 text-base' : 'px-3.5 py-2.5 text-sm'}
              ${isActive
                ? 'bg-primary-600/90 text-white shadow-md shadow-primary-900/25'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
              }
            `}
          >
            <IconComponent size={20} className="shrink-0" aria-hidden />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/95 border-b border-slate-800/80 shadow-lg shadow-black/10 backdrop-blur-xl'
          : 'bg-slate-950/90 border-b border-slate-800/60 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-[72px]">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group shrink-0"
            aria-label="RESQ-Link Command - Home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-inner group-hover:border-primary-500/40 transition-colors">
              <Image
                src="/branding/resq-link-icon.png"
                alt=""
                width={24}
                height={24}
                priority
                className="opacity-95"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight text-slate-100">
                RESQ-Link
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary-400/90">
                Command Center
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            <NavLinks />
          </nav>

          {/* Right section: User + Mobile toggle */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="relative hidden sm:block" data-user-menu>
                <button
                  data-user-trigger
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-800/60 min-w-0"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600/20 text-primary-400 border border-primary-500/30">
                    <User size={16} aria-hidden />
                  </div>
                  <div className="hidden md:block min-w-0 max-w-[140px]">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">Command Center Admin</p>
                  </div>
                  <ChevronDown
                    size={16}
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
            )}

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
          className="lg:hidden border-t border-slate-800/60 bg-slate-950/98 backdrop-blur-xl"
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
