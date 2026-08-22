'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'
import ProtectedRoute from '@/components/ProtectedRoute'
import NavigationProgress from '@/components/NavigationProgress'
import RouteEnter from '@/components/RouteEnter'

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  return (
    <div className="admin-shell flex h-dvh overflow-hidden lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="hidden h-dvh min-h-0 flex-col border-r border-white/[0.04] bg-navy-950 lg:flex">
        <AdminSidebar />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/50 transition-opacity duration-admin"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full w-[18rem] max-w-[85vw] flex-col animate-admin-drawer-in bg-navy-950 shadow-admin-panel">
            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative z-20 shrink-0">
          <NavigationProgress />
          <AdminHeader onOpenMenu={() => setMobileOpen(true)} />
        </div>
        <main className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <ProtectedRoute>
            <RouteEnter>{children}</RouteEnter>
          </ProtectedRoute>
        </main>
      </div>
    </div>
  )
}
