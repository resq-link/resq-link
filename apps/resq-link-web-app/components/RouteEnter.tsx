'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

type RouteEnterLayout = 'fill' | 'flow'

export default function RouteEnter({
  children,
  layout = 'fill',
}: {
  children: ReactNode
  layout?: RouteEnterLayout
}) {
  const pathname = usePathname()

  const layoutClass =
    layout === 'fill'
      ? 'flex h-full min-h-0 flex-col'
      : 'w-full min-h-0'

  return (
    <div key={pathname} className={`route-enter ${layoutClass}`}>
      {children}
    </div>
  )
}
