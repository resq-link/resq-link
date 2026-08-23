'use client'

import { Moon, Sun } from 'lucide-react'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import type { AdminTheme } from '@/lib/adminTheme'

const OPTIONS: { value: AdminTheme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

export function AdminThemePicker() {
  const { theme, setTheme } = useAdminTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-lg border border-admin-border bg-admin-muted p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-admin focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${
              selected
                ? 'bg-admin-surface text-admin-fg shadow-sm'
                : 'text-admin-fg-muted hover:text-admin-fg'
            }`}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
