'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import type { User } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { prefetchDashboardStats } from '@/hooks/useDashboardData'
import { prefetchAdminTables } from '@/hooks/useAdminPrefetch'

interface AdminAuthContextType {
  user: User | null
  isAdmin: boolean | null
  loading: boolean
  signOut: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { user, workspace, loading, signOut } = useAuth()
  const isAdmin = loading ? null : workspace === 'super_admin'

  useEffect(() => {
    if (!user) return
    if (process.env.NODE_ENV === 'development') {
      console.info('[admin-dashboard] admin auth ready')
    }
    prefetchDashboardStats()
    prefetchAdminTables()
  }, [user])

  return (
    <AdminAuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
