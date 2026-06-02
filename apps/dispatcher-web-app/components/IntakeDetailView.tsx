'use client'

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  type EmergencyReport,
  type IncidentRecord,
  getAllDispatchers,
  getSuggestedAgenciesForEmergencyType,
  subscribeToResources,
  subscribeToDispatcherLocations,
  type DispatcherLocation,
  type ResourceRecord,
  query,
  collection,
  where,
  onSnapshot,
  getFirebaseFirestore,
  convertFirestoreDoc,
} from "@packages/firebase";
import IncidentStatusIndicator from "@/components/IncidentStatusIndicator";
import PostIncidentReportPhoto from "@/components/PostIncidentReportPhoto";
import { getQueueItemOperationalStatus } from "@/components/IntakeListItem";
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
): { key: string; label: string }[] => {
  const fieldMap: Record<
    EmergencyReport["incidentType"],
    { key: string; label: string }[]
  > = {
    fire: [
      { key: "fireScale", label: "Fire scale / affected area" },
      { key: "structureInvolved", label: "Structure or property involved" },
      { key: "trappedOrInjured", label: "People trapped or injured" },
      { key: "fireSource", label: "Source of fire if known" },
    ],
    medical: [
      { key: "patientCondition", label: "Patient condition" },
      { key: "breathingStatus", label: "Conscious / breathing status" },
      { key: "patientAge", label: "Age or estimated age" },
      { key: "firstAidNeeds", label: "Immediate first-aid needs" },
    ],
    vehicular_accident: [
      { key: "vehiclesInvolved", label: "Vehicles involved" },
      { key: "injuredPersons", label: "Number of injured persons" },
      { key: "roadObstruction", label: "Road obstruction status" },
      { key: "collisionCause", label: "Collision type / cause if known" },
    ],
    police_emergency: [
      { key: "threatNature", label: "Nature of threat" },
      { key: "suspectPresence", label: "Suspect presence or description" },
      { key: "weaponsInvolved", label: "Weapons involved" },
      { key: "safetyRisk", label: "Immediate safety risk" },
    ],
    electrical_powerline_hazard: [
      { key: "hazardType", label: "Type of utility hazard" },
      { key: "liveWireStatus", label: "Live wire / spark / outage status" },
      { key: "affectedArea", label: "Affected homes or road area" },
      { key: "visibleDamage", label: "Visible damage details" },
    ],
    other_emergency: [
      { key: "incidentSummary", label: "Incident-specific summary" },
      { key: "whoIsAffected", label: "Who is affected" },
      { key: "hazardLevel", label: "Current hazard level" },
      { key: "supportNeeded", label: "Support needed on scene" },
    ],
  };
  return fieldMap[incidentType] || fieldMap.other_emergency;
};

const incidentCategoryToEmergencyType = (
  category: IncidentRecord["incidentCategory"] | undefined,
): EmergencyReport["incidentType"] => {
  const map: Partial<
    Record<IncidentRecord["incidentCategory"], EmergencyReport["incidentType"]>
  > = {
    fire: "fire",
    medical: "medical",
    vehicular: "vehicular_accident",
    utility: "electrical_powerline_hazard",
    peace_and_order: "police_emergency",
    other: "other_emergency",
    community: "other_emergency",
  };
  return map[category || "other"] || "other_emergency";
};

const getDateLabel = (value: any) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : typeof value === "object" && value && "toDate" in value ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const formatResponseTime = (seconds: number | null | undefined) => {
  if (seconds == null) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins} min ${secs} sec`;
  return `${secs} sec`;
};

const getResponderResource = (resources: ResourceRecord[], responderId: string) =>
  resources.find((resource) => {
    const ids = [
      resource.primaryResponderId,
      resource.assignedResponderId,
      ...(Array.isArray(resource.assignedResponderIds) ? resource.assignedResponderIds : []),
    ];
    return resource.status === "available" && ids.includes(responderId);
  }) || null;

const isSuggestedResourceForAgencies = (resource: ResourceRecord | null, agencies: string[]) => {
  if (!resource) return false;
  const haystack = `${resource.type} ${resource.agency || ""} ${resource.department || ""}`.toUpperCase();
  return agencies.some((agency) => haystack.includes(agency));
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
  const router = useRouter();
  const [isElevateModalOpen, setIsElevateModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderId, setSelectedResponderId] = useState("");
  const [isLoadingResponders, setIsLoadingResponders] = useState(false);
  const [responderError, setResponderError] = useState<string | null>(null);
  const [responderLocation, setResponderLocation] = useState<DispatcherLocation | null>(null);
  const [associatedReports, setAssociatedReports] = useState<EmergencyReport[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [resources, setResources] = useState<ResourceRecord[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToResources(setResources);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setIsElevateModalOpen(false);
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

  const dfaSourceReport = useMemo(() => {
    if (isEmergency && report) return report;
    if (associatedReports.length === 0) return null;

    const withSubmitted = associatedReports.find(
      (r) => r.additionalDetailsSubmittedAt || r.additionalDetails,
    );
    if (withSubmitted) return withSubmitted;

    const withRequested = associatedReports.find((r) => r.additionalDetailsRequestedAt);
    if (withRequested) return withRequested;

    return associatedReports.find((r) => !r.primaryReportId) || associatedReports[0];
  }, [isEmergency, report, associatedReports]);

  const postIncidentReport = useMemo(() => {
    type PostReport = NonNullable<IncidentRecord["postIncidentReport"]>;
    const candidates: PostReport[] = [
      incident?.postIncidentReport,
      report?.postIncidentReport,
      ...associatedReports.map((r) => r.postIncidentReport),
    ].filter((entry): entry is PostReport => Boolean(entry));

    if (candidates.length === 0) return null;

    return candidates.reduce<PostReport>(
      (merged, current) => ({
        reasonForIncident: merged.reasonForIncident || current.reasonForIncident || null,
        notes: merged.notes || current.notes || null,
        peopleInvolved: merged.peopleInvolved ?? current.peopleInvolved ?? null,
        peopleStatus: merged.peopleStatus || current.peopleStatus || null,
        hospital: merged.hospital || current.hospital || null,
        photoUrl: merged.photoUrl || current.photoUrl || null,
        submittedAt: merged.submittedAt || current.submittedAt || null,
        submittedByDispatcherId:
          merged.submittedByDispatcherId || current.submittedByDispatcherId || null,
        submittedByName: merged.submittedByName || current.submittedByName || null,
      }),
      { ...candidates[0] }
    );
  }, [report?.postIncidentReport, incident?.postIncidentReport, associatedReports]);

  const showPostReportSection = useMemo(() => {
    const status = report?.status || incident?.status;
    const resolutionStatus = incident?.resolutionStatus;
    return (
      Boolean(postIncidentReport) ||
      status === "resolved" ||
      status === "done" ||
      resolutionStatus === "resolved"
    );
  }, [postIncidentReport, report?.status, incident?.status, incident?.resolutionStatus]);

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
  const reportQuadrant = (report as any)?.quadrant || null;
  const hasLocalSuggestedAppResource = Boolean(
    reportQuadrant &&
      resources.some(
        (resource) =>
          resource.quadrant === reportQuadrant &&
          isSuggestedResourceForAgencies(resource, suggestedAgencies),
      ),
  );

  const getResponderFallbackLabel = (responder: any) => {
    const resource = getResponderResource(resources, responder.uid);
    if (
      !reportQuadrant ||
      hasLocalSuggestedAppResource ||
      !isSuggestedResourceForAgencies(resource, suggestedAgencies) ||
      resource?.quadrant === reportQuadrant
    ) {
      return "";
    }

    return ` - Nearby fallback${resource?.quadrant ? `: ${resource.quadrant}` : ""}`;
  };

  const dfaIncidentType: EmergencyReport["incidentType"] | undefined =
    dfaSourceReport?.incidentType ??
    (incident
      ? incidentCategoryToEmergencyType(incident.incidentCategory)
      : report?.incidentType);

  const expectedAdditionalFields = dfaIncidentType
    ? getExpectedAdditionalFields(dfaIncidentType)
    : [];

  const hasPinnedLocation = (report || incident)?.latitude != null && (report || incident)?.longitude != null && (report || incident)?.latitude !== 0;

  const loadResponders = async () => {
    setIsLoadingResponders(true);
    setResponderError(null);
    try {
      const accounts = await getAllDispatchers();
      const responderPool = accounts.filter((entry) => (entry.account.designation || "").toLowerCase().includes("responder"));
      const reportSuggestedAgencies = report ? getSuggestedAgenciesForEmergencyType(report.incidentType) : [];
      const finalPool = [...(responderPool.length > 0 ? responderPool : accounts)].sort((left, right) => {
        const leftResource = getResponderResource(resources, left.uid);
        const rightResource = getResponderResource(resources, right.uid);
        const leftSuggested = reportSuggestedAgencies.includes(left.account.role) || isSuggestedResourceForAgencies(leftResource, reportSuggestedAgencies);
        const rightSuggested = reportSuggestedAgencies.includes(right.account.role) || isSuggestedResourceForAgencies(rightResource, reportSuggestedAgencies);
        const leftLocal = Boolean(reportQuadrant && leftResource?.quadrant === reportQuadrant);
        const rightLocal = Boolean(reportQuadrant && rightResource?.quadrant === reportQuadrant);
        const rank = (suggested: boolean, local: boolean) => {
          if (suggested && local) return 0;
          if (suggested) return 1;
          if (local) return 2;
          return 3;
        };
        const leftRank = rank(leftSuggested, leftLocal);
        const rightRank = rank(rightSuggested, rightLocal);
        if (leftRank !== rightRank) return leftRank - rightRank;
        return (left.account.fullName || left.account.email || left.uid).localeCompare(right.account.fullName || right.account.email || right.uid);
      });
      setResponders(finalPool);
      if (finalPool.length > 0) setSelectedResponderId(finalPool[0].uid);
    } catch (error: any) {
      setResponderError("Failed to fetch responder pool.");
    } finally {
      setIsLoadingResponders(false);
    }
  };

  const handleStartElevate = async () => {
    if (onRespondStart && report) await onRespondStart(report);
    setIsElevateModalOpen(true);
    await loadResponders();
  };

  const handleQuickLinkAndRedirect = async (incidentId: string | undefined, referenceNumber: string) => {
    if (onLinkToIncident && report?.id && incidentId) {
      try {
        setIsLoadingResponders(true);
        await onLinkToIncident(report.id, incidentId);
        setIsElevateModalOpen(false);
        router.push(`/incidents?id=${incidentId}`);
      } catch (err) {
        setResponderError("Failed to link to existing incident.");
      } finally {
        setIsLoadingResponders(false);
      }
    }
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
      setIsElevateModalOpen(false);
    }
  };

  const derivedAgencies = Array.from(new Set([
    report?.assignedAgency,
    ...(incident?.assignedAgencies || []),
    ...associatedReports.map(r => r.assignedAgency)
  ].filter(Boolean)));
  
  const displayAgency = derivedAgencies.length > 0 
    ? derivedAgencies.join(", ") 
    : (report?.suggestedAgency || primarySuggestedAgency || 'Awaiting Routing');

  const derivedResponders = Array.from(new Set([
    report?.responder,
    ...associatedReports.map(r => r.responder)
  ].filter(Boolean)));
  
  const displayResponder = derivedResponders.length > 0
    ? derivedResponders.join(", ")
    : ((incident?.assignedResourceIds?.length || 0) > 0 ? `${incident?.assignedResourceIds?.length} resource(s) dispatched` : 'Unassigned');

  return (
    <>
    <div className="h-full flex flex-col bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Detail Header */}
      <div className="px-6 pt-3 pb-[14px] border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between min-h-[58px]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black text-slate-100 tracking-tight uppercase">
              {item.referenceNumber}
            </h2>
            <IncidentStatusIndicator status={getQueueItemOperationalStatus(item)} size="md" />
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
               {!isResponderAssigned && !report?.incidentId && (
                  <button 
                    onClick={handleStartElevate}
                    className="h-8 px-3 flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black text-white transition-all uppercase tracking-widest shadow-lg shadow-emerald-900/20"
                  >
                    <Send className="w-3 h-3 rotate-45 -translate-y-[0.5px]" />
                    Elevate
                  </button>
                )}

                <button 
                  onClick={() => onReject?.(report)}
                  className="h-8 px-3 flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/20 hover:bg-red-950/40 text-[10px] font-black text-red-500 transition-all uppercase tracking-widest"
                >
                  <XCircle className="w-3 h-3" />
                  Reject
                </button>

                {(incident?.touchdownAt || report?.touchdownAt) && (
                  <button 
                    onClick={() => {
                      const targetReport = report || associatedReports.find(r => !r.primaryReportId) || associatedReports[0];
                      if (targetReport) {
                        onMoveToHistory?.(targetReport);
                      }
                    }}
                    className="h-8 px-3 flex items-center gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-[10px] font-black text-emerald-400 transition-all uppercase tracking-widest"
                  >
                    <History className="w-3 h-3" />
                    Finalize
                  </button>
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
                   <p className="text-xs text-slate-400">Agency: <span className="text-slate-100">{displayAgency}</span></p>
                   <p className="text-xs text-slate-400">Responder: <span className="text-slate-100">{displayResponder}</span></p>
                 </div>
              </DetailSection>

              <DetailSection icon={<Clock className="w-3.5 h-3.5" />} title="GPS Timeline">
                 <div className="space-y-2 mt-1">
                   <p className="text-xs text-slate-400">Reported: <span className="text-slate-100">{getDateLabel(item.createdAt)}</span></p>
                   <p className="text-xs text-slate-400">Viewed: <span className="text-slate-100">{getDateLabel(report?.viewedAt)}</span></p>
                    {(incident?.acceptedAt || report?.acceptedAt) && (
                      <p className="text-xs text-slate-400">Accepted: <span className="text-slate-100">{getDateLabel(incident?.acceptedAt || report?.acceptedAt)}</span></p>
                    )}
                   <p className="text-xs text-slate-400">Touchdown: <span className="text-emerald-400 font-bold">{(incident?.touchdownAt || report?.touchdownAt) ? getDateLabel(incident?.touchdownAt || report?.touchdownAt) : 'N/A'}</span></p>
                    {(incident?.responseTimeSeconds ?? report?.responseTimeSeconds) != null && (
                      <p className="text-xs text-slate-400">Response Time: <span className="text-cyan-400 font-bold">{formatResponseTime(incident?.responseTimeSeconds ?? report?.responseTimeSeconds)}</span></p>
                    )}
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

        {showPostReportSection && (
          <DetailSection full icon={<CheckCircle className="w-3.5 h-3.5" />} title="Post-Incident Report">
            {postIncidentReport ? (
              <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_minmax(200px,280px)]">
                <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-900/30 text-sm text-slate-300 space-y-2">
                  <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-widest border-b border-emerald-900/40 pb-1">
                    Responder summary
                  </p>
                  <p className="text-xs font-medium text-slate-200 italic">
                    &ldquo;{postIncidentReport.notes || "No summary notes."}&rdquo;
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-2">
                    <p className="text-slate-500 uppercase">
                      Reason:{" "}
                      <span className="text-slate-300">
                        {postIncidentReport.reasonForIncident || "—"}
                      </span>
                    </p>
                    <p className="text-slate-500 uppercase">
                      Status:{" "}
                      <span className="text-slate-300">
                        {postIncidentReport.peopleStatus || "—"}
                      </span>
                    </p>
                    <p className="text-slate-500 uppercase">
                      People:{" "}
                      <span className="text-slate-300">
                        {postIncidentReport.peopleInvolved ?? "—"}
                      </span>
                    </p>
                    <p className="text-slate-500 uppercase">
                      Transport:{" "}
                      <span className="text-slate-300">{postIncidentReport.hospital || "—"}</span>
                    </p>
                  </div>
                  {postIncidentReport.submittedAt && (
                    <p className="text-[10px] text-slate-500 pt-1">
                      Submitted {getDateLabel(postIncidentReport.submittedAt)}
                      {postIncidentReport.submittedByName
                        ? ` by ${postIncidentReport.submittedByName}`
                        : ""}
                    </p>
                  )}
                </div>
                <PostIncidentReportPhoto photoUrl={postIncidentReport.photoUrl} />
              </div>
            ) : (
              <div className="mt-2 p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  This incident is resolved but no post-incident report was submitted by the
                  responder.
                </p>
              </div>
            )}
          </DetailSection>
        )}

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
                  {dfaSourceReport?.additionalDetailsSubmittedAt && (
                    <p className="text-[10px] text-emerald-400 mt-2">
                      Submitted {getDateLabel(dfaSourceReport.additionalDetailsSubmittedAt)}
                    </p>
                  )}
                  {!isEmergency && !dfaSourceReport && (
                    <p className="text-[10px] text-slate-500 mt-2 italic">
                      Awaiting linked civilian report for field assessment responses.
                    </p>
                  )}
                  <div className="mt-3 grid gap-2">
                    {expectedAdditionalFields.map((field) => {
                      const value = dfaSourceReport?.additionalDetails?.[field.key];
                      return (
                        <div
                          key={field.key}
                          className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800/50"
                        >
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                            {field.label}
                          </span>
                          {value ? (
                            <span className="text-[10px] text-slate-200 font-medium text-right max-w-[55%]">
                              {value}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-500/80 font-bold italic">
                              Awaiting civil response...
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </DetailSection>
              )}
           </div>

           <div className="space-y-6">
              {(report?.imageUrl ||
                (incident as any)?.imageUrl ||
                postIncidentReport?.photoUrl) ? (
                <DetailSection full icon={<Activity className="w-3.5 h-3.5" />} title="Scene Documentation">
                  <div className="mt-2 rounded-xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl space-y-3">
                    {(report?.imageUrl || (incident as any)?.imageUrl) && (
                      <img
                        src={report?.imageUrl || (incident as any)?.imageUrl}
                        alt="Incident scene"
                        className="w-full h-auto object-cover max-h-[400px] hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    {postIncidentReport?.photoUrl ? (
                      <PostIncidentReportPhoto
                        photoUrl={postIncidentReport.photoUrl}
                        alt="Post-incident report scene"
                        className="w-full h-auto object-cover max-h-[400px] hover:scale-105 transition-transform duration-500"
                      />
                    ) : null}
                  </div>
                </DetailSection>
              ) : (
                <div className="h-44 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center">
                   <Activity className="w-8 h-8 text-slate-800 mb-2" />
                   <p className="text-xs text-slate-600 font-medium">No visual documentation available</p>
                </div>
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

      {/* Elevate Modal */}
      {isElevateModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsElevateModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center gap-3.5 border-b border-slate-800/80 bg-slate-950/40 px-6 py-4">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 grid place-items-center text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  Elevate to Master Incident
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  Spin up an independent INC case and assign dispatch response.
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Proximity Warning & Quick Link */}
              {potentialDuplicates.length > 0 && (
                <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-amber-200 uppercase tracking-wide">
                        Nearby Active Incident Detected
                      </h4>
                      <p className="text-[10px] text-amber-400/80 leading-normal mt-0.5">
                        We detected {potentialDuplicates.length} active master incident{potentialDuplicates.length > 1 ? 's' : ''} nearby. You can link this report directly instead of elevating to a new one.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid gap-2 pt-1">
                    {potentialDuplicates.map((dup: any) => (
                      <div 
                        key={dup.id} 
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-850 hover:border-slate-800 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-mono font-black text-amber-400 tracking-wider">
                            {dup.referenceNumber}
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium">
                            {dup.incidentSubtypeLabel} • {dup.locationText}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickLinkAndRedirect(dup.id, dup.referenceNumber)}
                          className="h-7 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[9px] font-black text-amber-400 uppercase tracking-wider border border-amber-500/25 transition-all"
                        >
                          Link Case
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Incident ID */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-2">
                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500 block">
                  Generated Incident Case ID
                </span>
                <div className="flex items-center gap-2 text-lg font-mono font-black text-amber-400 tracking-wider">
                  <span>INC-{Math.floor(Date.now() / 1000)}</span>
                  <span className="inline-flex items-center justify-center h-4.5 px-2 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest">
                    Preview
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  This ID namespace separates client citizen alerts from master operational logs, enabling multiple duplicate reports to group under it.
                </p>
              </div>

              {/* Responder Assignment */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500 block">
                  Select Dispatch Responder / Unit
                </label>
                {!hasLocalSuggestedAppResource && reportQuadrant ? (
                  <p className="text-[10px] font-bold text-amber-300">
                    No suggested available resource is bound in this report quadrant; nearby fallback units are included.
                  </p>
                ) : null}
                <div className="relative">
                  <select
                    value={selectedResponderId}
                    onChange={(e) => setSelectedResponderId(e.target.value)}
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 px-4 outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none transition-colors"
                  >
                    {isLoadingResponders ? (
                      <option>Loading responder units...</option>
                    ) : responders.length === 0 ? (
                      <option>No responder units available</option>
                    ) : (
                      responders.map((r) => (
                        <option key={r.uid} value={r.uid}>
                          {r.account.fullName || r.account.email} ({r.account.role}){getResponderFallbackLabel(r) || (suggestedAgencies.includes(r.account.role) ? " - Suggested" : "")}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    ▼
                  </div>
                </div>
                {responderError && (
                  <p className="text-[10px] font-bold text-red-400 mt-1">
                    {responderError}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/40 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsElevateModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-850 hover:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isLoadingResponders || !selectedResponderId}
                onClick={handleConfirmRespond}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Confirm Elevation</span>
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
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
