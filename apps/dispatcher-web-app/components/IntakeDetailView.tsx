'use client'

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { 
  type EmergencyReport, 
  type IncidentRecord, 
  getAllDispatchers,
  getSuggestedAgenciesForEmergencyType,
  subscribeToDispatcherLocations,
  type DispatcherLocation
} from "@packages/firebase";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Shield, 
  User, 
  FileText, 
  AlertTriangle,
  Send,
  CheckCircle,
  XCircle,
  History,
  Navigation,
  Activity
} from "lucide-react";

const PinnedLocationMap = dynamic(() => import("./PinnedLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="mt-3 flex h-44 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-[10px] text-slate-500 uppercase tracking-widest">
      Loading geographic data...
    </div>
  ),
});

const AppReportResponseMap = dynamic(() => import("./AppReportResponseMap"), {
  ssr: false,
  loading: () => (
    <div className="h-44 rounded-lg border border-slate-800 bg-slate-950 text-[10px] text-slate-500 uppercase tracking-widest flex items-center justify-center">
      Initializing live tracking...
    </div>
  ),
});

const getIncidentTypeName = (incidentType: EmergencyReport["incidentType"]) => {
  const typeMap: Record<EmergencyReport["incidentType"], string> = {
    fire: "Fire",
    medical: "Medical Emergency",
    vehicular_accident: "Vehicular Accident",
    police_emergency: "Police Emergency",
    electrical_powerline_hazard: "Electrical / Powerline Hazard",
    other_emergency: "Other Emergency",
  };
  return typeMap[incidentType] || "Emergency";
};

const getExpectedAdditionalFields = (
  incidentType: EmergencyReport["incidentType"],
): string[] => {
  const fieldMap: Record<EmergencyReport["incidentType"], string[]> = {
    fire: ["Fire scale", "Structures involved", "People trapped", "Source"],
    medical: ["Condition", "Conscious/Breathing", "Age", "First Aid"],
    vehicular_accident: ["Vehicles", "Injuries", "Obstruction", "Cause"],
    police_emergency: ["Threat nature", "Suspect info", "Weapons", "Safety risk"],
    electrical_powerline_hazard: ["Utility type", "Sparks/Outage", "Affected area", "Damage"],
    other_emergency: ["Specific summary", "Who affected", "Hazard level", "Support"],
  };
  return fieldMap[incidentType] || fieldMap.other_emergency;
};

const getDateLabel = (value: any) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : typeof value === "object" && value && "toDate" in value ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

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
  const [isChoosingResponder, setIsChoosingResponder] = useState(false);
  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderId, setSelectedResponderId] = useState("");
  const [isLoadingResponders, setIsLoadingResponders] = useState(false);
  const [responderError, setResponderError] = useState<string | null>(null);
  const [responderLocation, setResponderLocation] = useState<DispatcherLocation | null>(null);

  useEffect(() => {
    setIsChoosingResponder(false);
    setSelectedResponderId("");
    setResponderError(null);
  }, [item?.id]);

  const report = item?.rawEmergencyReport as EmergencyReport;
  const incident = item?.rawIncident as IncidentRecord;

  useEffect(() => {
    if (!report?.assignedResponderId) {
      setResponderLocation(null);
      return;
    }

    const unsubscribe = subscribeToDispatcherLocations((locations) => {
      setResponderLocation(
        locations.find(l => l.dispatcherId === report.assignedResponderId) || null
      );
    });

    return unsubscribe;
  }, [report?.assignedResponderId]);

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950/20">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-inner animate-pulse">
          <Activity className="w-8 h-8 text-slate-700" />
        </div>
        <h3 className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Awaiting Incident Selection</h3>
        <p className="text-slate-600 text-sm mt-3 max-w-[280px] leading-relaxed">
          Select an incoming report from the left queue to initiate triage and dispatch workflows.
        </p>
      </div>
    );
  }

  const isEmergency = item.channel === "emergency_report";
  
  const isResponderAssigned = Boolean(report?.assignedResponderId || report?.responder);
  const responderHasAccepted = ["enroute", "on_scene", "done", "resolved"].includes(report?.status || "");
  const responderStatusLabel = !isResponderAssigned 
    ? "Unassigned" 
    : responderHasAccepted 
      ? (report?.status === "enroute" ? "En route" : report?.status?.replace("_", " ")) 
      : "Awaiting acceptance";

  const suggestedAgencies = isEmergency ? getSuggestedAgenciesForEmergencyType(report?.incidentType) : [];
  const primarySuggestedAgency = suggestedAgencies[0] || null;

  const expectedAdditionalFields = isEmergency ? getExpectedAdditionalFields(report?.incidentType) : [];

  const hasPinnedLocation = (report || incident)?.latitude != null && (report || incident)?.longitude != null && (report || incident)?.latitude !== 0;

  const loadResponders = async () => {
    setIsLoadingResponders(true);
    setResponderError(null);
    try {
      const accounts = await getAllDispatchers();
      const responderPool = accounts.filter((entry) => (entry.account.designation || "").toLowerCase().includes("responder"));
      const finalPool = responderPool.length > 0 ? responderPool : accounts;
      setResponders(finalPool);
      if (finalPool.length > 0) setSelectedResponderId(finalPool[0].uid);
    } catch (error: any) {
      setResponderError("Failed to fetch responder pool.");
    } finally {
      setIsLoadingResponders(false);
    }
  };

  const handleStartRespond = async () => {
    if (onRespondStart && report) await onRespondStart(report);
    setIsChoosingResponder(true);
    await loadResponders();
  };

  const handleConfirmRespond = async () => {
    if (!selectedResponderId) return;
    const selected = responders.find(r => r.uid === selectedResponderId);
    if (onRespond && selected && report) {
      await onRespond(report, {
        uid: selected.uid,
        label: selected.account.fullName || selected.account.email,
        agency: selected.account.role,
        suggestedAgency: primarySuggestedAgency
      });
      setIsChoosingResponder(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Detail Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-100 tracking-tight uppercase">
              {item.referenceNumber}
            </h2>
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${item.statusToneClass} shadow-lg shadow-black/20`}>
              {item.statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400 font-medium tracking-wide">
            {item.incidentSubtypeLabel} • Reported via {isEmergency ? "App" : incident?.source || "Manual"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
           {onCloseDetail && (
            <button 
              onClick={onCloseDetail}
              className="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-all"
            >
              <AlertTriangle className="w-5 h-5" />
            </button>
           )}
        </div>
      </div>

      {/* Main Actions Bar */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center gap-3">
        {isEmergency && report && (
          <>
            {!isResponderAssigned && !isChoosingResponder ? (
              <button 
                onClick={handleStartRespond}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all uppercase tracking-widest shadow-lg shadow-emerald-900/20"
              >
                <Send className="w-3.5 h-3.5" />
                Assign Responder
              </button>
            ) : isChoosingResponder ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  value={selectedResponderId}
                  onChange={(e) => setSelectedResponderId(e.target.value)}
                  className="flex-1 h-9 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 px-3 outline-none focus:ring-1 focus:ring-emerald-500"
                >
                   {isLoadingResponders ? <option>Loading...</option> : responders.map(r => (
                     <option key={r.uid} value={r.uid}>{r.account.fullName || r.account.email} ({r.account.role})</option>
                   ))}
                </select>
                <button 
                  onClick={handleConfirmRespond}
                  disabled={isLoadingResponders || !selectedResponderId}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white uppercase tracking-widest disabled:opacity-50"
                >
                  Confirm
                </button>
                <button 
                   onClick={() => setIsChoosingResponder(false)}
                   className="px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            
            <button 
              onClick={() => onReject?.(report)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-900/60 bg-red-950/20 hover:bg-red-950/40 text-xs font-bold text-red-400 transition-all uppercase tracking-widest"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>

            {report.touchdownAt && (
               <button 
                onClick={() => onMoveToHistory?.(report)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-xs font-bold text-emerald-400 transition-all uppercase tracking-widest"
              >
                <History className="w-3.5 h-3.5" />
                Finalize
              </button>
            )}
          </>
        )}
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar no-scrollbar">
        {/* Geographic Tracking & Operational Metadata */}
        <div className={hasPinnedLocation ? "grid grid-cols-1 lg:grid-cols-3 gap-8" : "space-y-8"}>
           {hasPinnedLocation && (
             <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Navigation className="w-4 h-4 text-primary-500" />
                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Geographic Tracking</h3>
                   </div>
                   {isResponderAssigned && (
                     <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${responderHasAccepted ? 'border-sky-800 text-sky-400 bg-sky-950/40' : 'border-amber-800 text-amber-400 bg-amber-950/40'}`}>
                       {responderStatusLabel}
                     </span>
                   )}
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
                  {isResponderAssigned ? (
                    <AppReportResponseMap 
                      incident={{
                        latitude: (report || incident).latitude!,
                        longitude: (report || incident).longitude!,
                        label: (report || incident).locationText || "Incident Site"
                      }}
                      responder={responderLocation ? {
                        latitude: responderLocation.latitude,
                        longitude: responderLocation.longitude,
                        label: report?.responder || "En route"
                      } : null}
                    />
                  ) : (
                    <PinnedLocationMap 
                      latitude={(report || incident).latitude!}
                      longitude={(report || incident).longitude!}
                      label={(report || incident).locationText || "Incident Site"}
                    />
                  )}
                </div>
             </div>
           )}

           <div className={hasPinnedLocation 
             ? "lg:col-span-1 flex flex-col gap-6" 
             : "grid gap-6 md:grid-cols-2 lg:grid-cols-3 border-y border-slate-800/50 py-6"
           }>
              <DetailSection icon={<Activity className="w-3.5 h-3.5" />} title="Operations Control">
                 <div className="space-y-2 mt-1">
                   <p className="text-xs text-slate-400">Status: <span className="text-slate-100 font-bold uppercase font-mono">{report?.status || incident?.status}</span></p>
                   <p className="text-xs text-slate-400">Agency: <span className="text-slate-100">{report?.assignedAgency || report?.suggestedAgency || primarySuggestedAgency || 'Awaiting Routing'}</span></p>
                   <p className="text-xs text-slate-400">Responder: <span className="text-slate-100">{report?.responder || 'Unassigned'}</span></p>
                 </div>
              </DetailSection>

              <DetailSection icon={<Clock className="w-3.5 h-3.5" />} title="GPS Timeline">
                 <div className="space-y-2 mt-1">
                   <p className="text-xs text-slate-400">Reported: <span className="text-slate-100">{getDateLabel(item.createdAt)}</span></p>
                   <p className="text-xs text-slate-400">Viewed: <span className="text-slate-100">{getDateLabel(report?.viewedAt)}</span></p>
                   <p className="text-xs text-slate-400">Touchdown: <span className="text-emerald-400 font-bold">{report?.touchdownAt ? getDateLabel(report.touchdownAt) : 'N/A'}</span></p>
                 </div>
              </DetailSection>

              <DetailSection icon={<MapPin className="w-3.5 h-3.5" />} title="Spatial Context">
                 <div className="space-y-2 mt-1">
                   <p className="text-xs text-slate-400">Lat: <span className="text-slate-200 font-mono">{(report || incident)?.latitude?.toFixed(6) || '—'}</span></p>
                   <p className="text-xs text-slate-400">Lon: <span className="text-slate-200 font-mono">{(report || incident)?.longitude?.toFixed(6) || '—'}</span></p>
                   <p className="text-xs text-slate-400">Landmark: <span className="text-slate-200 truncate inline-block max-w-[100px]">{(report || incident)?.landmark || 'None'}</span></p>
                 </div>
              </DetailSection>
           </div>
        </div>

        {/* Narrative & Field-Specific Data */}
        <div className="grid gap-8 md:grid-cols-2">
           <div className="space-y-6">
              <DetailSection full icon={<FileText className="w-3.5 h-3.5" />} title="Initial Narrative">
                <div className="mt-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-300 leading-relaxed shadow-inner">
                  {report?.description || incident?.description || "No narrative provided."}
                </div>
              </DetailSection>

              {expectedAdditionalFields.length > 0 && (
                <DetailSection full icon={<AlertTriangle className="w-3.5 h-3.5" />} title="Dynamic Field Assessment">
                   <div className="mt-3 grid gap-2">
                      {expectedAdditionalFields.map(field => (
                        <div key={field} className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800/50">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest">{field}</span>
                          <span className="text-[10px] text-amber-500/80 font-bold italic">Awaiting civil response...</span>
                        </div>
                      ))}
                   </div>
                </DetailSection>
              )}
           </div>

           <div className="space-y-6">
              {(report?.imageUrl || (incident as any)?.imageUrl) ? (
                <DetailSection full icon={<Activity className="w-3.5 h-3.5" />} title="Scene Documentation">
                  <div className="mt-2 rounded-xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl">
                    <img src={report?.imageUrl || (incident as any)?.imageUrl} alt="Incident Scene" className="w-full h-auto object-cover max-h-[400px] hover:scale-105 transition-transform duration-500" />
                  </div>
                </DetailSection>
              ) : (
                <div className="h-44 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center">
                   <Activity className="w-8 h-8 text-slate-800 mb-2" />
                   <p className="text-xs text-slate-600 font-medium">No visual documentation available</p>
                </div>
              )}

              {report?.postIncidentReport && (
                <DetailSection full icon={<CheckCircle className="w-3.5 h-3.5" />} title="Post-Incident Report Summary">
                  <div className="mt-2 p-4 rounded-xl bg-emerald-950/10 border border-emerald-900/30 text-sm text-slate-300 space-y-2">
                    <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-widest border-b border-emerald-900/40 pb-1">Summary Result</p>
                    <p className="text-xs font-medium text-slate-200 italic">"{report.postIncidentReport.notes || 'No summary notes.'}"</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-2">
                       <p className="text-slate-500 uppercase">Reason: <span className="text-slate-300">{report.postIncidentReport.reasonForIncident || '—'}</span></p>
                       <p className="text-slate-500 uppercase">Status: <span className="text-slate-300">{report.postIncidentReport.peopleStatus || '—'}</span></p>
                    </div>
                  </div>
                </DetailSection>
              )}
           </div>
        </div>
      </div>
    </div>
  );
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
  );
}
