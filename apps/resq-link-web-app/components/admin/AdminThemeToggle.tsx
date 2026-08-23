'use client'

import { Moon, Sun } from 'lucide-react'
import { useAdminTheme } from '@/contexts/AdminThemeContext'

export function AdminThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme, ready } = useAdminTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-admin-fg-muted transition-[background-color,color] duration-150 hover:bg-admin-hover hover:text-admin-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${className}`}
    >
      <span className={`flex transition-opacity duration-150 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        {isDark ? (
          <Moon size={16} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Sun size={16} strokeWidth={1.75} aria-hidden="true" />
        )}
      </span>
    </button>
  )
}
