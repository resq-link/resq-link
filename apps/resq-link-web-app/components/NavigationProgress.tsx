'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

function isInternalNavLink(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false
  }
  try {
    const url = new URL(anchor.href, window.location.href)
    if (url.origin !== window.location.origin) return false
    return url.pathname !== window.location.pathname || url.search !== window.location.search
  } catch {
    return false
  }
}

export default function NavigationProgress() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const hideTimer = useRef<number | null>(null)
  const previousPath = useRef(pathname)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as HTMLElement | null)?.closest('a')
      if (!anchor || !isInternalNavLink(anchor)) return
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
      setActive(true)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    hideTimer.current = window.setTimeout(() => setActive(false), 160)
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [pathname])

  useEffect(() => {
    if (!active) return
    const timeout = window.setTimeout(() => setActive(false), 8000)
    return () => window.clearTimeout(timeout)
  }, [active])

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 z-50 h-[2px] overflow-hidden transition-opacity duration-150 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
      role="progressbar"
      aria-hidden={!active}
      aria-label="Loading page"
    >
      {active ? <div className="nav-progress-bar h-full bg-primary-500" /> : null}
    </div>
  )
}
