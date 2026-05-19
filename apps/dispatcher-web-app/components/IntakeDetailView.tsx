'use client'

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { 
  type EmergencyReport, 
  type IncidentRecord, 
  getAllDispatchers,
  getSuggestedAgenciesForEmergencyType,
  subscribeToDispatcherLocations,
  type DispatcherLocation,
  query,
  collection,
  where,
  onSnapshot,
  getFirebaseFirestore,
  convertFirestoreDoc,
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
  Activity,
  Link2
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
  recentIncidents?: IncidentRecord[]
  allCivilianReports?: EmergencyReport[]
  onRespondStart?: (report: EmergencyReport) => void
  onRespond?: (report: EmergencyReport, responder: any) => void
  onReject?: (report: EmergencyReport) => void
  onMoveToHistory?: (report: EmergencyReport) => void
  onCloseDetail?: () => void
  onLinkToIncident?: (reportId: string, incidentId: string) => Promise<void>
  onUnlinkFromIncident?: (reportId: string, incidentId: string) => Promise<void>
  onLinkReportToReport?: (primaryReportId: string, secondaryReportId: string) => Promise<void>
  onUnlinkReportFromReport?: (secondaryReportId: string) => Promise<void>
  onLinkAllReports?: (primaryReportId: string, secondaryReportIds: string[]) => Promise<void>
}

export default function IntakeDetailView({ 
  item,
  recentIncidents = [],
  allCivilianReports = [],
  onRespondStart,
  onRespond,
  onReject,
  onMoveToHistory,
  onCloseDetail,
  onLinkToIncident,
  onUnlinkFromIncident,
  onLinkReportToReport,
  onUnlinkReportFromReport,
  onLinkAllReports
}: IntakeDetailViewProps) {
  const [isChoosingResponder, setIsChoosingResponder] = useState(false);
  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderId, setSelectedResponderId] = useState("");
  const [isLoadingResponders, setIsLoadingResponders] = useState(false);
  const [responderError, setResponderError] = useState<string | null>(null);
  const [responderLocation, setResponderLocation] = useState<DispatcherLocation | null>(null);
  const [associatedReports, setAssociatedReports] = useState<EmergencyReport[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    setIsChoosingResponder(false);
    setSelectedResponderId("");
    setResponderError(null);
  }, [item?.id]);

  const report = item?.rawEmergencyReport as EmergencyReport;
  const incident = item?.rawIncident as IncidentRecord;

  useEffect(() => {
    if (item?.channel !== "incident" || !incident?.id) {
      setAssociatedReports([]);
      return;
    }

    const db = getFirebaseFirestore();
    const q = query(
      collection(db, "emergencies"),
      where("incidentId", "==", incident.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const reportsList: EmergencyReport[] = [];
        querySnapshot.forEach((docSnap) => {
          reportsList.push(convertFirestoreDoc(docSnap));
        });
        setAssociatedReports(reportsList);
      },
      (error) => {
        console.error("Error subscribing to associated reports:", error);
      }
    );

    return unsubscribe;
  }, [incident?.id, item?.channel]);

  const calculateDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  const isEmergency = item?.channel === "emergency_report";

  // Potential duplicate matching
  const potentialDuplicates = useMemo(() => {
    if (!isEmergency || !report || !recentIncidents || report.incidentId) {
      console.log("[Dedup Debug] Skipping check. Reasons:", { 
        isEmergency, 
        hasReport: !!report, 
        hasRecentIncidents: !!recentIncidents, 
        alreadyLinked: report?.incidentId 
      });
      return [];
    }

    const reportLat = report.latitude;
    const reportLng = report.longitude;
    if (reportLat == null || reportLng == null) {
      console.log("[Dedup Debug] Report coordinates are null:", { reportLat, reportLng });
      return [];
    }

    const reportTime = report.createdAt instanceof Date 
      ? report.createdAt.getTime() 
      : (report.createdAt && typeof report.createdAt === 'object' && 'toDate' in report.createdAt)
      ? (report.createdAt as any).toDate().getTime()
      : new Date(report.createdAt || Date.now()).getTime();

    console.log("[Dedup Debug] Checking duplicates for report at coordinates:", { reportLat, reportLng }, "Total open incidents:", recentIncidents.length);

    return recentIncidents.filter((inc) => {
      // Only check open master incidents
      if (inc.resolutionStatus !== "open" || !inc.id) return false;
      if (inc.latitude == null || inc.longitude == null) return false;

      const distance = calculateDistanceInMeters(
        reportLat,
        reportLng,
        inc.latitude,
        inc.longitude
      );

      const incTime = inc.createdAt instanceof Date 
        ? inc.createdAt.getTime() 
        : (inc.createdAt && typeof inc.createdAt === 'object' && 'toDate' in inc.createdAt)
        ? (inc.createdAt as any).toDate().getTime()
        : new Date(inc.createdAt || Date.now()).getTime();

      const timeDiffMs = Math.abs(reportTime - incTime);
      const timeDiffMins = timeDiffMs / (60 * 1000);

      console.log(`[Dedup Debug] Comparing with master incident ${inc.referenceNumber}:`, {
        distanceMeters: distance,
        timeDiffMinutes: timeDiffMins,
        isDistanceMatch: distance <= 150,
        isTimeMatch: timeDiffMins <= 30
      });

      // Within 150 meters and 30 minutes
      return distance <= 150 && timeDiffMs <= 30 * 60 * 1000;
    });
  }, [isEmergency, report, recentIncidents]);

  // Potential duplicate civilian reports matching (raw calls)
  const potentialDuplicateReports = useMemo(() => {
    if (!isEmergency || !report || !allCivilianReports || allCivilianReports.length === 0) {
      return [];
    }

    const reportLat = report.latitude;
    const reportLng = report.longitude;
    if (reportLat == null || reportLng == null) {
      return [];
    }

    const reportTime = report.createdAt instanceof Date 
      ? report.createdAt.getTime() 
      : (report.createdAt && typeof report.createdAt === 'object' && 'toDate' in report.createdAt)
      ? (report.createdAt as any).toDate().getTime()
      : new Date(report.createdAt || Date.now()).getTime();

    return allCivilianReports.filter((other) => {
      // Don't compare with itself
      if (other.id === report.id || !other.id) return false;
      // Only check pending/active reports that are not yet grouped/linked
      if (other.incidentId || other.status === "resolved" || other.status === "done") return false;
      if (other.latitude == null || other.longitude == null) return false;

      const distance = calculateDistanceInMeters(
        reportLat,
        reportLng,
        other.latitude,
        other.longitude
      );

      const otherTime = other.createdAt instanceof Date 
        ? other.createdAt.getTime() 
        : (other.createdAt && typeof other.createdAt === 'object' && 'toDate' in other.createdAt)
        ? (other.createdAt as any).toDate().getTime()
        : new Date(other.createdAt || Date.now()).getTime();

      const timeDiffMs = Math.abs(reportTime - otherTime);

      // Within 150 meters and 30 minutes
      return distance <= 150 && timeDiffMs <= 30 * 60 * 1000;
    });
  }, [isEmergency, report, allCivilianReports]);

  const linkedIncident = useMemo(() => {
    if (!report?.incidentId || !recentIncidents) return null;
    return recentIncidents.find((inc) => inc.id === report.incidentId) || null;
  }, [report?.incidentId, recentIncidents]);

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
      <div className="px-6 pt-3 pb-[14px] border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between min-h-[58px]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black text-slate-100 tracking-tight uppercase">
              {item.referenceNumber}
            </h2>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${item.statusToneClass} shadow-lg shadow-black/20`}>
              {item.statusLabel}
            </span>
            {isResponderAssigned && (
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${responderHasAccepted ? 'border-sky-800 text-sky-400 bg-sky-950/40' : 'border-amber-800 text-amber-400 bg-amber-950/40'}`}>
                {responderStatusLabel}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400 font-medium tracking-wide">
            {item.incidentSubtypeLabel} • Reported via {isEmergency ? "App" : incident?.source || "Manual"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
           {isEmergency && report && (
             <div className="hidden sm:flex items-center gap-2">
               {!isResponderAssigned && !isChoosingResponder ? (
                 <button 
                   onClick={handleStartRespond}
                   className="h-8 px-3 flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black text-white transition-all uppercase tracking-widest shadow-lg shadow-emerald-900/20"
                 >
                   <Send className="w-3 h-3" />
                   Assign
                 </button>
               ) : isChoosingResponder ? (
                 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                   <select 
                     value={selectedResponderId}
                     onChange={(e) => setSelectedResponderId(e.target.value)}
                     className="h-8 w-40 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-200 px-2 outline-none focus:ring-1 focus:ring-emerald-500"
                   >
                      {isLoadingResponders ? <option>Loading...</option> : responders.map(r => (
                        <option key={r.uid} value={r.uid}>{r.account.fullName || r.account.email}</option>
                      ))}
                   </select>
                   <button 
                     onClick={handleConfirmRespond}
                     disabled={isLoadingResponders || !selectedResponderId}
                     className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black text-white uppercase tracking-widest disabled:opacity-50"
                   >
                     Confirm
                   </button>
                   <button 
                      onClick={() => setIsChoosingResponder(false)}
                      className="h-8 px-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                   >
                     Cancel
                   </button>
                 </div>
               ) : null}
               
               {!isChoosingResponder && (
                 <>
                   <button 
                     onClick={() => onReject?.(report)}
                     className="h-8 px-3 flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/20 hover:bg-red-950/40 text-[10px] font-black text-red-500 transition-all uppercase tracking-widest"
                   >
                     <XCircle className="w-3 h-3" />
                     Reject
                   </button>

                   {report.touchdownAt && (
                     <button 
                       onClick={() => onMoveToHistory?.(report)}
                       className="h-8 px-3 flex items-center gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-[10px] font-black text-emerald-400 transition-all uppercase tracking-widest"
                     >
                       <History className="w-3 h-3" />
                       Finalize
                     </button>
                   )}
                 </>
               )}
             </div>
           )}

           {onCloseDetail && (
            <button 
              onClick={onCloseDetail}
              className="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-all"
            >
              <XCircle className="w-5 h-5" />
            </button>
           )}
        </div>
      </div>



      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar no-scrollbar">
        {/* Linked Incident Banner */}
        {isEmergency && report?.incidentId && (
          <div className="rounded-xl border border-sky-900/60 bg-sky-950/40 p-4 flex items-center justify-between shadow-lg shadow-sky-950/20 border-dashed">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Linked to Master Incident</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Grouped under case <span className="font-mono font-bold text-sky-400">{linkedIncident?.referenceNumber || "Active Incident"}</span>
                </p>
              </div>
            </div>
            {onUnlinkFromIncident && (
              <button
                disabled={isLinking}
                onClick={async () => {
                  setIsLinking(true);
                  try {
                    await onUnlinkFromIncident(report.id!, report.incidentId!);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsLinking(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-red-900/60 bg-red-950/20 hover:bg-red-950/45 text-[9px] font-black text-red-400 uppercase tracking-widest transition-all shadow-md shadow-red-950/20"
              >
                {isLinking ? "..." : "Unlink"}
              </button>
            )}
          </div>
        )}

        {/* Grouped Report Banner — this report is a secondary grouped under a primary report */}
        {isEmergency && report?.primaryReportId && !report?.incidentId && (
          <div className="rounded-xl border border-purple-900/60 bg-purple-950/20 p-4 flex items-center justify-between shadow-lg shadow-purple-950/10 border-dashed">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Grouped With Another Report</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Sharing status with primary report{" "}
                  <span className="font-mono font-bold text-purple-400">APP-{report.primaryReportId.slice(-6).toUpperCase()}</span>
                </p>
              </div>
            </div>
            {onUnlinkReportFromReport && (
              <button
                disabled={isLinking}
                onClick={async () => {
                  setIsLinking(true);
                  try {
                    await onUnlinkReportFromReport(report.id!);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsLinking(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-red-900/60 bg-red-950/20 hover:bg-red-950/45 text-[9px] font-black text-red-400 uppercase tracking-widest transition-all shadow-md shadow-red-950/20"
              >
                {isLinking ? "..." : "Ungroup"}
              </button>
            )}
          </div>
        )}
        {isEmergency && !report?.incidentId && potentialDuplicates.length > 0 && (
          <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 space-y-3 shadow-lg shadow-amber-950/10 border-dashed animate-pulse-slow">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">Potential Duplicate Detected</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              This report is within 150m and 30m of {potentialDuplicates.length === 1 ? "an active master incident" : "multiple active master incidents"}. Grouping reports keeps dispatcher dispatch channels clean.
            </p>
            <div className="space-y-2 mt-2">
              {potentialDuplicates.map((dup) => (
                <div key={dup.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold text-amber-400">{dup.referenceNumber}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{dup.incidentSubtypeLabel} • {dup.locationText.split(',')[0]}</span>
                  </div>
                  {onLinkToIncident && (
                    <button
                      disabled={isLinking}
                      onClick={async () => {
                        setIsLinking(true);
                        try {
                          await onLinkToIncident(report.id!, dup.id!);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsLinking(false);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[9px] text-amber-400 font-bold tracking-widest uppercase transition-colors"
                    >
                      {isLinking ? "..." : "Link"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Potential Duplicate Civilian Reports Alert */}
        {isEmergency && !report?.incidentId && potentialDuplicateReports.length > 0 && (
          <div className="rounded-xl border border-orange-500/40 bg-orange-950/20 p-4 space-y-2 shadow-lg shadow-orange-950/10 border-dashed animate-pulse-slow">
            <div className="flex items-center justify-between gap-2 border-b border-orange-500/20 pb-1.5">
              <div className="flex items-center gap-2 text-orange-400">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider">Multiple Reports of Same Incident</h4>
              </div>
              {onLinkAllReports && potentialDuplicateReports.filter(other => !other.primaryReportId).length > 0 && (
                <button
                  disabled={isLinking}
                  onClick={async () => {
                    setIsLinking(true);
                    try {
                      const unlinkedReportIds = potentialDuplicateReports
                        .filter(other => !other.primaryReportId)
                        .map(other => other.id!);
                      await onLinkAllReports(report.id!, unlinkedReportIds);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsLinking(false);
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-orange-500 hover:bg-orange-600 text-[9px] font-black text-slate-950 uppercase tracking-wider transition-colors shadow-md shadow-orange-950/20"
                >
                  {isLinking ? "..." : "Link All"}
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              There {potentialDuplicateReports.length === 1 ? "is 1 other citizen report" : `are ${potentialDuplicateReports.length} other citizen reports`} submitted nearby in the last 30 minutes. 
              Accepting this report will allow you to link and merge the remaining reports.
            </p>
            <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
              {potentialDuplicateReports.map((other) => (
                <div key={other.id} className="p-2.5 rounded bg-slate-950/60 border border-slate-900 text-[10px] text-slate-400 flex items-center justify-between gap-3">
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-mono text-orange-400/90 font-bold">APP-{other.id!.slice(-6).toUpperCase()}</span>
                    <span className="text-[10px] text-slate-200 mt-1 leading-relaxed truncate">"{other.description || "No description provided."}"</span>
                  </div>
                  {other.primaryReportId ? (
                    <span className="shrink-0 text-[9px] text-purple-400 font-bold uppercase tracking-widest border border-purple-900/40 bg-purple-950/20 px-2 py-1 rounded">Grouped</span>
                  ) : onLinkReportToReport ? (
                    <button
                      disabled={isLinking}
                      onClick={async () => {
                        setIsLinking(true);
                        try {
                          await onLinkReportToReport(report.id!, other.id!);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsLinking(false);
                        }
                      }}
                      className="shrink-0 px-2.5 py-1.5 rounded bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-[9px] text-orange-400 font-bold tracking-widest uppercase transition-colors"
                    >
                      {isLinking ? "..." : "Link"}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Operational Metadata */}
        <div className={hasPinnedLocation ? "grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch" : "space-y-8"}>
           {hasPinnedLocation && (
             <div className="lg:col-span-2 flex flex-col space-y-4">
                <div className="flex-1 flex flex-col min-h-[300px]">
                  {isResponderAssigned ? (
                    <AppReportResponseMap 
                      className="h-full"
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
                      className="h-full"
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

         {/* Associated Citizen Reports Section */}
         {!isEmergency && associatedReports.length > 0 && (
           <DetailSection full icon={<Shield className="w-3.5 h-3.5" />} title={`Associated Citizen Reports (${associatedReports.length})`}>
             <div className="space-y-4 mt-3">
               <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                 {associatedReports.map((assocReport, index) => (
                   <div key={assocReport.id || index} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3 relative group overflow-hidden">
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />
                     <div className="flex items-start justify-between gap-2">
                       <div>
                         <p className="text-xs font-bold text-slate-100 uppercase font-mono">
                           APP-{assocReport.id?.slice(-6).toUpperCase() || "REPORT"}
                         </p>
                         <p className="text-[10px] text-slate-500 mt-0.5">
                           Reported at {getDateLabel(assocReport.createdAt)}
                         </p>
                       </div>
                       <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-900/50 uppercase tracking-widest">
                         Linked
                       </span>
                     </div>

                     <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-900/40 leading-relaxed italic">
                       "{assocReport.description || "No description provided."}"
                     </p>

                     {assocReport.imageUrl && (
                       <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 max-h-48 relative">
                         <img 
                           src={assocReport.imageUrl} 
                           alt="Citizen evidence photo" 
                           className="w-full h-auto object-cover max-h-48 hover:scale-105 transition-transform duration-300"
                         />
                       </div>
                     )}
                     
                     <div className="text-[10px] text-slate-500 space-y-1 pt-1">
                       <p>Citizen: <span className="text-slate-300 font-medium">Verified Civilian Reporter</span></p>
                       {assocReport.landmark && <p>Landmark: <span className="text-slate-300">{assocReport.landmark}</span></p>}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           </DetailSection>
         )}
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
