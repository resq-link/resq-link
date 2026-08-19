'use client'

import { getTeamCardTheme } from '@/lib/reporting/teamSummaryTheme'

type TeamBadgeProps = {
  label: string | null | undefined
  size?: 'xs' | 'sm'
  className?: string
}

export default function TeamBadge({ label, size = 'xs', className = '' }: TeamBadgeProps) {
  if (!label) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border border-slate-700/80 bg-slate-900/60 text-slate-500 font-bold uppercase tracking-wider ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-1.5 py-px text-[9px]'
        } ${className}`}
      >
        No Team
      </span>
    )
  }

  const theme = getTeamCardTheme(label)

  return (
      <span
        className={`inline-flex items-center gap-1 rounded border font-bold uppercase tracking-wider ring-1 ring-inset ${theme.accentBadge} ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-1.5 py-px text-[9px]'
        } ${className}`}
        title={`Assigned Team: ${label}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.accentLeft.replace('border-l-', 'bg-')}`} aria-hidden />
        {label}
      </span>
  )
}
