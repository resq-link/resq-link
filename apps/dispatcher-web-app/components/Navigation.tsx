'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LayoutDashboard, FileText, Radio, Map, History } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  const navItems = [
    { href: '/overview', label: 'Overview', icon: LayoutDashboard },
    { href: '/intake', label: 'Intake', icon: FileText },
    { href: '/', label: 'Live Incidents', icon: Radio },
    { href: '/map', label: 'Map', icon: Map },
    { href: '/history', label: 'History', icon: History },
  ]

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className="bg-slate-950/80 border-b border-slate-800 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <Image
                  src="/branding/resq-link-icon.png"
                  alt="RESQ-Link"
                  width={24}
                  height={24}
                  priority
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-lg font-semibold text-slate-100">
                  RESQ-Link
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-secondary-300">
                  Command
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const IconComponent = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`p-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                      : 'text-slate-300 hover:bg-slate-900/60 hover:text-slate-100'
                  }`}
                >
                  <IconComponent size={20} />
                </Link>
              )
            })}
            
            {user && (
              <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
                <div className="text-sm text-slate-400">
                  <span className="font-medium text-slate-200">{user.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

