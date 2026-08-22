'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import InlineLoader from '@/components/InlineLoader'
import { routes } from '@/lib/routes'

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, workspace, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(routes.login)
      return
    }
    if (workspace === null) return
    if (workspace === 'command_center') {
      router.replace(routes.commandCenter.intake)
      return
    }
    if (workspace !== 'super_admin') {
      router.replace(routes.accessDenied)
    }
  }, [user, workspace, loading, router])

  if (loading || (user && workspace === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <InlineLoader label="Verifying access..." />
      </div>
    )
  }

  if (!user || workspace !== 'super_admin') {
    return null
  }

  return <>{children}</>
}
