'use client'

import {
  getPriorityBadgeLabel,
  normalizePriority,
  PRIORITY_VISUAL,
  type IncidentPriority,
} from '@packages/firebase'

type PriorityBadgeProps = {
  priority: IncidentPriority | string | undefined
  size?: 'sm' | 'md' | 'lg'
  showPulse?: boolean
  className?: string
}

export default function PriorityBadge({
  priority,
  size = 'sm',
  showPulse = false,
  className = '',
}: PriorityBadgeProps) {
  const level = normalizePriority(priority)
  const visual = PRIORITY_VISUAL[level]

  const sizeClasses =
    size === 'lg'
      ? 'px-3 py-1 text-xs'
      : size === 'md'
        ? 'px-2.5 py-0.5 text-[11px]'
        : 'px-2 py-0.5 text-[10px]'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-black uppercase tracking-wider ${visual.tailwindBadge} ${sizeClasses} ${className}`}
      title={`Priority: ${level}`}
    >
      {getPriorityBadgeLabel(level)}
    </span>
  )
}
