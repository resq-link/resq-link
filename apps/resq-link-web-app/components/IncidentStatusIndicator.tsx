'use client'

import { memo } from 'react'
import {
  getIncidentStatusColors,
  getIncidentStatusLabel,
  normalizeOperationalStatus,
  shouldPulseIncidentStatus,
} from '@packages/firebase'

export type IncidentStatusIndicatorProps = {
  status: string | null | undefined
  size?: 'sm' | 'md'
  className?: string
}

function IncidentStatusIndicatorComponent({
  status,
  size = 'sm',
  className = '',
}: IncidentStatusIndicatorProps) {
  const operational = normalizeOperationalStatus(status)
  const pulse = shouldPulseIncidentStatus(status)
  // Dashboard uses dark chrome; hex colors avoid Tailwind purging dynamic bg-* classes.
  const colors = getIncidentStatusColors(status, 'dark')
  const textSize =
    size === 'md'
      ? 'text-[11px] tracking-wider'
      : 'text-[10px] tracking-wider'
  const dotPx = size === 'md' ? 8 : 7

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-black uppercase ${textSize} ${className}`}
      title={`Status: ${operational}`}
      role="status"
    >
      <span
        className={`inline-block shrink-0 rounded-full ${pulse ? 'incident-status-dot-pulse' : ''}`}
        style={{
          width: dotPx,
          height: dotPx,
          backgroundColor: colors.dot,
        }}
        aria-hidden
      />
      <span style={{ color: colors.text }}>
        {getIncidentStatusLabel(status)}
      </span>
    </span>
  )
}

const IncidentStatusIndicator = memo(IncidentStatusIndicatorComponent)
export default IncidentStatusIndicator
