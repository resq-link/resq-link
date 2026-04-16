'use client'

import { type EmergencyReport, type IncidentRecord, type DispatcherRole } from "@packages/firebase"
import { Calendar, Clock, MapPin, Shield, User, FileText, AlertTriangle } from "lucide-react"

interface IntakeDetailViewProps {
  item: any | null // IntakeQueueItem
  onRespondStart?: (report: EmergencyReport) => void
  onRespond?: (report: EmergencyReport, responder: any) => void
  onReject?: (report: EmergencyReport) => void
  onMoveToHistory?: (report: EmergencyReport) => void
  onCloseDetail?: () => void
}

export default function IntakeDetailView({ 
  item,
  onRespondStart,
  onRespond,
  onReject,
  onMoveToHistory,
  onCloseDetail
}: IntakeDetailViewProps) {
  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-pulse">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-slate-700" />
        </div>
        <h3 className="text-slate-400 font-medium tracking-wide">Select an incident to view details</h3>
        <p className="text-slate-600 text-sm mt-1 max-w-[240px]">
          Click an item from the intake queue to view its full details and triage actions.
        </p>
      </div>
    )
  }

  const isEmergency = item.channel === "emergency_report"
  const report = item.rawEmergencyReport as EmergencyReport
  const incident = item.rawIncident as IncidentRecord

  return (
    <div className="h-full flex flex-col bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Detail Header */}
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/50 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-100 tracking-tight uppercase">
              {item.referenceNumber}
            </h2>
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${item.statusToneClass}`}>
              {item.statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400 font-medium">
            {item.incidentSubtypeLabel}
          </p>
        </div>
        
        {onCloseDetail && (
           <button 
            onClick={onCloseDetail}
            className="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar no-scrollbar">
        {/* Core Info Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <DetailSection icon={<MapPin className="w-3.5 h-3.5" />} title="Location">
            <p className="text-slate-200 font-semibold">{item.locationText}</p>
            {item.quadrantLabel && (
              <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
                Quadrant: <span className="text-slate-300">{item.quadrantLabel}</span>
              </p>
            )}
          </DetailSection>

          <DetailSection icon={<Shield className="w-3.5 h-3.5" />} title="Priority">
             <p className={`text-sm font-black uppercase tracking-[0.2em] ${
                item.priority === 'critical' ? 'text-red-400' : 
                item.priority === 'high' ? 'text-orange-400' : 
                item.priority === 'medium' ? 'text-blue-400' : 'text-slate-400'
             }`}>
              {item.priority}
            </p>
          </DetailSection>

          <DetailSection icon={<Calendar className="w-3.5 h-3.5" />} title="Timeline">
             <div className="space-y-1 text-xs text-slate-400">
                <p>Date: <span className="text-slate-200">{item.incidentDateLabel || '—'}</span></p>
                <p>Time: <span className="text-slate-200">{item.incidentTimeLabel || '—'}</span></p>
             </div>
          </DetailSection>

          <DetailSection icon={<User className="w-3.5 h-3.5" />} title="Personnel">
             <p className="text-xs text-slate-400">Team: <span className="text-slate-200 font-medium">{item.teamOnDutyLabel || 'Unassigned'}</span></p>
          </DetailSection>
        </div>

        {/* Description / Notes */}
        <div className="space-y-4">
           {isEmergency && report ? (
             <div className="space-y-4">
                <DetailSection full title="Description">
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                    {report.description || 'No description provided.'}
                  </p>
                </DetailSection>
                {report.imageUrl && (
                   <div className="rounded-xl border border-slate-800 overflow-hidden">
                      <img src={report.imageUrl} alt="Incident" className="w-full h-auto max-h-[300px] object-cover" />
                   </div>
                )}
             </div>
           ) : incident ? (
             <div className="space-y-4">
                <DetailSection full title="Description">
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                    {incident.description || 'No description provided.'}
                  </p>
                </DetailSection>
                {incident.notes && (
                  <DetailSection full title="Dispatcher Notes">
                    <p className="text-sm text-slate-400 italic leading-relaxed">
                      {incident.notes}
                    </p>
                  </DetailSection>
                )}
             </div>
           ) : null}
        </div>

        {/* Quick Actions (For App Reports) */}
        {isEmergency && report && (
          <div className="pt-6 border-t border-slate-800 mt-8 flex flex-wrap gap-3">
             <button 
              onClick={() => onRespondStart?.(report)}
              className="flex-1 min-w-[140px] h-10 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-bold text-white transition-all uppercase tracking-widest"
             >
                Dispatch View
             </button>
             <button 
              onClick={() => onMoveToHistory?.(report)}
              className="px-4 h-10 rounded-lg border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-400 transition-all uppercase tracking-widest"
             >
                Close Case
             </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailSection({ title, icon, children, full = false }: { title: string, icon?: React.ReactNode, children: React.ReactNode, full?: boolean }) {
  return (
    <div className={full ? "col-span-full" : ""}>
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-slate-500">{icon}</span>}
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {title}
        </h4>
      </div>
      <div>
        {children}
      </div>
    </div>
  )
}
