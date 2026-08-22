'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import InlineLoader from '@/components/InlineLoader'
import { routes } from '@/lib/routes'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, workspace, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const required = pathname.startsWith(routes.admin.root) ? 'super_admin' : 'command_center'

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(routes.login)
      return
    }
    if (workspace === null) return
    if (workspace === 'unauthorized') {
      router.replace(routes.accessDenied)
      return
    }
    if (workspace !== required) {
      router.replace(workspace === 'super_admin' ? routes.admin.dashboard : routes.commandCenter.overview)
    }
  }, [user, workspace, loading, required, router, pathname])

  if (loading || (user && workspace === null)) {
    return <InlineLoader label="Verifying access..." />
  }

  if (!user || workspace !== required) {
    return null
  }

  return <>{children}</>
}
