'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export default function RouteEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="route-enter flex h-full min-h-0 flex-col">
      {children}
    </div>
  )
}
