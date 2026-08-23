'use client'

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ADMIN_THEME_STORAGE_KEY,
  applyAdminThemeClass,
  isAdminTheme,
  readStoredAdminTheme,
  type AdminTheme,
} from '@/lib/adminTheme'

type AdminThemeContextValue = {
  theme: AdminTheme
  setTheme: (theme: AdminTheme) => void
  toggleTheme: () => void
  /** False until client has synced stored preference (avoids icon flicker). */
  ready: boolean
}

const AdminThemeContext = createContext<AdminThemeContextValue | undefined>(undefined)

function persistTheme(theme: AdminTheme) {
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(() => {
    if (typeof window === 'undefined') return 'light'
    return readStoredAdminTheme() ?? 'light'
  })
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const stored = readStoredAdminTheme() ?? 'light'
    setThemeState(stored)
    applyAdminThemeClass(stored)
    setReady(true)

    const onStorage = (event: StorageEvent) => {
      if (event.key !== ADMIN_THEME_STORAGE_KEY) return
      const next = isAdminTheme(event.newValue) ? event.newValue : 'light'
      setThemeState(next)
      applyAdminThemeClass(next)
    }
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
      // Defer clear so React Strict Mode remount can re-apply without wiping the page.
      window.setTimeout(() => {
        if (!document.querySelector('.admin-shell')) {
          applyAdminThemeClass(null)
        }
      }, 0)
    }
  }, [])

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next)
    applyAdminThemeClass(next)
    persistTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: AdminTheme = current === 'dark' ? 'light' : 'dark'
      applyAdminThemeClass(next)
      persistTheme(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, ready }),
    [theme, setTheme, toggleTheme, ready]
  )

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext)
  if (!context) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider')
  }
  return context
}
