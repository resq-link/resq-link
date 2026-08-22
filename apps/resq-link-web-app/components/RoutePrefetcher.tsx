'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { routes } from '@/lib/routes'

export default function RoutePrefetcher() {
  const { user, workspace } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || workspace !== 'command_center') return
    if (process.env.NODE_ENV !== 'production') return

    const prefetchRoutes = [
      routes.commandCenter.intake,
      routes.commandCenter.overview,
      routes.commandCenter.sms,
      routes.commandCenter.incidents,
      routes.commandCenter.footageRequests,
    ] as const

    const prefetch = () => {
      prefetchRoutes.forEach((href) => {
        void router.prefetch(href)
      })
    }

    const idle = window.requestIdleCallback
    if (typeof idle === 'function') {
      const id = idle(prefetch, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }

    const timer = window.setTimeout(prefetch, 800)
    return () => window.clearTimeout(timer)
  }, [router, user, workspace])

  return null
}
