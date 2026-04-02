'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * Applies the page-enter animation only after mount so the server HTML and the
 * client's first paint match (no CSS animation backwards-fill before hydration).
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  return <div className={ready ? 'page-enter' : undefined}>{children}</div>
}
