'use client'

import {
  type IncidentRecord,
  type EmergencyReport,
  type IncidentPriority,
  normalizePriority,
} from '@packages/firebase'
import IncidentStatusIndicator from '@/components/IncidentStatusIndicator'

export type IntakeQueueItem = {
  id: string
  channel: 'incident' | 'emergency_report'
  referenceNumber: string
  incidentSubtypeLabel: string
  locationText: string
  priority: IncidentRecord['priority']
  quadrantLabel: string | null
  teamOnDutyLabel: string | null
  incidentDateLabel: string | null
  incidentTimeLabel: string | null
  createdAt: IncidentRecord['createdAt'] | EmergencyReport['createdAt']
  viewedByName: string | null
  suggestedAgencyLabel: string | null
  rawEmergencyReport: EmergencyReport | null
  rawIncident: IncidentRecord | null
}

/** Intake-only priority accents — badge text + border (neutral card fill). */
export const INTAKE_PRIORITY_STYLE: Record<
  IncidentPriority,
  {
    emoji: string
    label: string
    textClass: string
    badgeClass: string
  }
> = {
  critical: {
    emoji: '🔴',
    label: 'CRITICAL',
    textClass: 'text-red-400',
    badgeClass: 'border-red-500/35 bg-transparent text-red-400',
  },
  high: {
    emoji: '🔵',
    label: 'HIGH',
    textClass: 'text-blue-400',
    badgeClass: 'border-blue-500/35 bg-transparent text-blue-400',
  },
  medium: {
    emoji: '🟡',
    label: 'MEDIUM',
    textClass: 'text-amber-400',
    badgeClass: 'border-amber-500/35 bg-transparent text-amber-400',
  },
  low: {
    emoji: '🟢',
    label: 'LOW',
    textClass: 'text-green-400',
    badgeClass: 'border-green-500/35 bg-transparent text-green-400',
  },
}

type IntakePriorityBadgeProps = {
  priority: IncidentPriority | string | undefined
  size?: 'sm' | 'md'
}

export function IntakePriorityBadge({ priority, size = 'sm' }: IntakePriorityBadgeProps) {
  const level = normalizePriority(priority)
  const style = INTAKE_PRIORITY_STYLE[level]
  const sizeClasses =
    size === 'md' ? 'px-2.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-[10px]'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-black uppercase tracking-wider ${style.badgeClass} ${sizeClasses}`}
      title={`Priority: ${level}`}
    >
      <span aria-hidden>{style.emoji}</span>
      {style.label}
    </span>
  )
}

export function getQueueItemOperationalStatus(item: IntakeQueueItem): string {
  return item.rawEmergencyReport?.status ?? item.rawIncident?.status ?? 'pending'
}

interface IntakeListItemProps {
  item: IntakeQueueItem
  isSelected: boolean
  onClick: (item: IntakeQueueItem) => void
  duplicateCount?: number
}

export default function IntakeListItem({
  item,
  isSelected,
  onClick,
  duplicateCount,
}: IntakeListItemProps) {
  const priority = normalizePriority(item.priority)
  const operationalStatus = getQueueItemOperationalStatus(item)

  return (
    <article
      onClick={() => onClick(item)}
      className={`rounded-lg border p-3 cursor-pointer transition-colors duration-200 bg-slate-950/60 hover:bg-slate-900/70 ${
        isSelected
          ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/40'
          : 'border-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-100 uppercase tracking-tight">
            {item.referenceNumber}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs font-medium text-slate-300">
              {item.incidentSubtypeLabel}
            </p>
            {duplicateCount && duplicateCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black text-amber-400 border border-amber-500/30">
                +{duplicateCount} SIMILAR
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <IncidentStatusIndicator status={operationalStatus} />
          <div className="mt-1 flex justify-end">
            <IntakePriorityBadge priority={priority} />
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400 line-clamp-1">
        {item.locationText}
      </p>

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/50 pt-2">
        <span className="truncate max-w-[100px]">
          {item.teamOnDutyLabel ? `Team ${item.teamOnDutyLabel}` : 'No Team'}
        </span>
        <span className="font-mono text-slate-500">
          {item.createdAt instanceof Date
            ? item.createdAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : (item.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }) || '—'}
        </span>
      </div>
    </article>
  )
}
