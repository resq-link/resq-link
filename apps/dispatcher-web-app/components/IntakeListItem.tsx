'use client'

import { type IncidentRecord, type EmergencyReport } from "@packages/firebase"

export type IntakeQueueItem = {
  id: string
  channel: "incident" | "emergency_report"
  referenceNumber: string
  incidentSubtypeLabel: string
  locationText: string
  priority: IncidentRecord["priority"]
  statusLabel: string
  statusToneClass: string
  quadrantLabel: string | null
  teamOnDutyLabel: string | null
  incidentDateLabel: string | null
  incidentTimeLabel: string | null
  createdAt: IncidentRecord["createdAt"] | EmergencyReport["createdAt"]
  viewedByName: string | null
  suggestedAgencyLabel: string | null
  rawEmergencyReport: EmergencyReport | null
  rawIncident: IncidentRecord | null
}

const priorityTone: Record<IncidentRecord["priority"], string> = {
  low: "text-slate-300",
  medium: "text-blue-300",
  high: "text-amber-300",
  critical: "text-red-300",
}

interface IntakeListItemProps {
  item: IntakeQueueItem
  isSelected: boolean
  onClick: (item: IntakeQueueItem) => void
}

export default function IntakeListItem({ item, isSelected, onClick }: IntakeListItemProps) {
  return (
    <article
      onClick={() => onClick(item)}
      className={`rounded-lg border p-3 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-900/10"
          : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-100 uppercase tracking-tight">
            {item.referenceNumber}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-300">
            {item.incidentSubtypeLabel}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.statusToneClass}`}
          >
            {item.statusLabel}
          </span>
          <p
            className={`mt-1 text-[10px] font-black uppercase tracking-[0.2em] ${priorityTone[item.priority]}`}
          >
            {item.priority}
          </p>
        </div>
      </div>
      
      <p className="mt-2 text-xs text-slate-400 line-clamp-1">
        {item.locationText}
      </p>

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/50 pt-2">
        <span className="truncate max-w-[100px]">
          {item.teamOnDutyLabel ? `Team ${item.teamOnDutyLabel}` : "No Team"}
        </span>
        <span className="font-mono">
          {item.createdAt instanceof Date 
            ? item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : (item.createdAt as any)?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '—'}
        </span>
      </div>
    </article>
  )
}
