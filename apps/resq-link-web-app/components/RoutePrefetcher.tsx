'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { routes } from '@/lib/routes'

const PREFETCH_ROUTES = [
  routes.commandCenter.overview,
  routes.commandCenter.intake,
  routes.commandCenter.sms,
  routes.commandCenter.incidents,
  routes.commandCenter.footageRequests,
] as const

export default function RoutePrefetcher() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    // In development, prefetch compiles each route through webpack/turbopack and
    // contends with the route the dispatcher is actually opening.
    if (process.env.NODE_ENV !== 'production') return

    const prefetch = () => {
      PREFETCH_ROUTES.forEach((href) => {
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
  }, [router, user])

  return null
}
