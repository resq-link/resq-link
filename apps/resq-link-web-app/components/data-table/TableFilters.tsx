'use client';

import type { ReactNode } from 'react'

export function TableFilters({
  children,
  actions,
}: {
  children: ReactNode
  /** Compact trailing controls (e.g. Export) aligned to the end. */
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-admin-border/80 bg-admin-surface/80 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
      {children}
      {actions ? <div className="flex shrink-0 items-end sm:ml-auto">{actions}</div> : null}
    </div>
  )
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-admin-fg-subtle">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-[10rem] rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-fg shadow-sm transition-colors duration-admin hover:border-admin-border focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
