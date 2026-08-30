'use client'

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  type EmergencyReport,
  type IncidentRecord,
  getAllDispatchers,
  getAssignedTeamName,
  reassignIncidentTeam,
  getSuggestedAgenciesForEmergencyType,
  type DispatcherLocation,
  type ResourceRecord,
  query,
  collection,
  where,
  onSnapshot,
  getFirebaseFirestore,
  convertFirestoreDoc,
  getReportImageUrls,
  getCivilianEmergencyTypeLabel,
  hasResponderSceneAssessment,
  resolveSceneAssessmentIncidentType,
  startIncidentCallSession,
  type IncidentCallSession,
  normalizeResponderReport,
  getAdditionalResourceLabel,
} from "@packages/firebase";
import IncidentStatusIndicator from "@/components/IncidentStatusIndicator";
import { useDispatcherData } from "@/contexts/DispatcherDataContext";
import PostIncidentReportPhotos from "@/components/PostIncidentReportPhotos";
import IncidentScenePhotos from "@/components/incident-media/IncidentScenePhotos";
import SceneAssessmentPanel from "@/components/SceneAssessmentPanel";
import SceneReportPanel from "@/components/SceneReportPanel";
import TouchdownArrivalPanel from "@/components/TouchdownArrivalPanel";
import InitialNarrativeDisplay from "@/components/InitialNarrativeDisplay";
import CitizenReportDetailDrawer from "@/components/CitizenReportDetailDrawer";
import AssociatedCitizenReportList from "@/components/AssociatedCitizenReportList";
import IncidentMessagingDrawer from "@/components/messaging/IncidentMessagingDrawer";
import ActiveCallModal from "@/components/calls/ActiveCallModal";
import { getQueueItemOperationalStatus } from "@/components/IntakeListItem";
import { useOperationalTeams } from "@/contexts/OperationalTeamContext";
import { teamReactKey } from "@/lib/operational/teamUtils";
import { useAuth } from "@/contexts/AuthContext";
import TeamBadge from "@/components/operational/TeamBadge";
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
  Link2,
  MessageSquare,
  Phone,
  Radio,
  Ambulance,
  Truck,
  ShieldCheck,
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
    return ids.includes(responderId);
  }) || null;

const isSuggestedResourceForAgencies = (resource: ResourceRecord | null, agencies: string[]) => {
  if (!resource) return false;
  const haystack = `${resource.name || ""} ${resource.type || ""} ${resource.agency || ""} ${resource.department || ""}`.toUpperCase();
  return agencies.some((agency) => haystack.includes(agency.toUpperCase()));
};

interface IntakeDetailViewProps {
  item: any | null // IntakeQueueItem
  recentIncidents?: IncidentRecord[]
  allCivilianReports?: EmergencyReport[]
  onRespondStart?: (report: EmergencyReport) => void
  onRespond?: (report: EmergencyReport, responder: any, extra?: any) => void
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
  const { user } = useAuth();
  const { teams, currentTeamOnDuty } = useOperationalTeams();
  const [isElevateModalOpen, setIsElevateModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reassignTeamId, setReassignTeamId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderIds, setSelectedResponderIds] = useState<string[]>([]);
  const [isLoadingResponders, setIsLoadingResponders] = useState(false);
  const [responderError, setResponderError] = useState<string | null>(null);
  const [responderLocation, setResponderLocation] = useState<DispatcherLocation | null>(null);
  const [associatedReports, setAssociatedReports] = useState<EmergencyReport[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const { resources, dispatcherLocations, incidentsLoading } = useDispatcherData();
  const [selectedCitizenReport, setSelectedCitizenReport] = useState<EmergencyReport | null>(null);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [activeCallSession, setActiveCallSession] = useState<IncidentCallSession | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  useEffect(() => {
    setIsElevateModalOpen(false);
    setSelectedResponderIds([]);
    setResponderError(null);
    setSelectedCitizenReport(null);
    setIsMessagingOpen(false);
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

  const primaryCivilianReport = useMemo(() => {
    if (isEmergency && report) return report;
    if (associatedReports.length > 0) {
      return associatedReports.find((entry) => !entry.primaryReportId) || associatedReports[0];
    }
    if (
      incident &&
      (incident.description ||
        incident.fieldAssessment ||
        incident.landmark ||
        incident.peopleInvolved != null)
    ) {
      return {
        incidentType: resolveSceneAssessmentIncidentType({
          incidentCategory: incident.incidentCategory,
        }),
        typeProfile: incident.typeProfile ?? null,
        description: incident.description ?? null,
        landmark: incident.landmark ?? null,
        peopleInvolved: incident.peopleInvolved ?? null,
        fieldAssessment: incident.fieldAssessment ?? null,
        imageUrl: incident.imageUrl ?? null,
        imageUrls: incident.imageUrls ?? null,
      } as EmergencyReport;
    }
    return null;
  }, [isEmergency, report, associatedReports, incident]);

  const primaryReportId = primaryCivilianReport?.id ?? null;

  const mapLocation = useMemo(() => {
    const candidates = [report, incident, primaryCivilianReport, ...associatedReports].filter(
      Boolean,
    ) as Array<{
      latitude?: number | null;
      longitude?: number | null;
      locationText?: string | null;
    }>;

    for (const source of candidates) {
      const lat = source.latitude;
      const lng = source.longitude;
      if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
        return {
          latitude: lat,
          longitude: lng,
          label: source.locationText || "Incident Site",
        };
      }
    }
    return null;
  }, [report, incident, primaryCivilianReport, associatedReports]);

  const assignedResponderId =
    report?.assignedResponderId ||
    incident?.assignedResourceIds?.[0] ||
    associatedReports.find((entry) => entry.assignedResponderId)?.assignedResponderId ||
    null;

  const sceneAssessmentContext = useMemo(() => {
    const incidentType = resolveSceneAssessmentIncidentType({
      incidentType: report?.incidentType,
      incidentCategory: incident?.incidentCategory,
    });

    const linkedIncident =
      incident ??
      (report?.incidentId && recentIncidents?.length
        ? recentIncidents.find((entry) => entry.id === report.incidentId) ?? null
        : null);

    if (report?.responderAssessment && hasResponderSceneAssessment(report.responderAssessment)) {
      return { assessment: report.responderAssessment, incidentType };
    }

    if (
      linkedIncident?.responderAssessment &&
      hasResponderSceneAssessment(linkedIncident.responderAssessment)
    ) {
      return { assessment: linkedIncident.responderAssessment, incidentType };
    }

    const linkedAssessment = associatedReports.find(
      (entry) => entry.responderAssessment && hasResponderSceneAssessment(entry.responderAssessment),
    );
    if (linkedAssessment?.responderAssessment) {
      return {
        assessment: linkedAssessment.responderAssessment,
        incidentType: linkedAssessment.incidentType || incidentType,
      };
    }

    return { assessment: null, incidentType };
  }, [report, incident, associatedReports, recentIncidents]);

  const postIncidentReportsList = useMemo(() => {
    type PostReport = NonNullable<IncidentRecord["postIncidentReport"]> & {
      agency?: string;
      responderName?: string;
      id?: string;
    };
    const list: PostReport[] = [];

    if (incident?.postIncidentReports && typeof incident.postIncidentReports === "object") {
      Object.entries(incident.postIncidentReports).forEach(([uid, rep]) => {
        if (rep?.submittedAt || rep?.reasonForIncident || rep?.notes) {
          const assignment = incident.responderAssignments?.[uid];
          list.push({
            ...rep,
            agency: assignment?.agency,
            responderName: assignment?.responderName || rep.submittedByName || undefined,
            id: uid,
          });
        }
      });
    }

    if (list.length === 0) {
      const singleReport = incident?.postIncidentReport || report?.postIncidentReport;
      if (singleReport?.submittedAt || singleReport?.reasonForIncident || singleReport?.notes) {
        list.push({
          ...singleReport,
          agency: incident?.assignedAgencies?.[0] || (report as any)?.assignedAgency,
          responderName: singleReport.submittedByName || undefined,
          id: "primary",
        });
      }
    }

    return list;
  }, [
    incident?.postIncidentReports,
    incident?.postIncidentReport,
    incident?.responderAssignments,
    incident?.assignedAgencies,
    report?.postIncidentReport,
    (report as any)?.assignedAgency,
  ]);

  const postIncidentReport = useMemo(() => {
    return postIncidentReportsList[0] || null;
  }, [postIncidentReportsList]);

  const sceneReportsList = useMemo(() => {
    type SceneReportEntry = import('@packages/firebase').SceneReportRecord & {
      agency?: string;
      responderName?: string;
      resourceName?: string;
      arrivalTime?: unknown;
      id?: string;
    };
    const list: SceneReportEntry[] = [];

    if (incident?.sceneReports && typeof incident.sceneReports === 'object') {
      Object.entries(incident.sceneReports).forEach(([uid, rep]) => {
        if (rep?.submittedAt || rep?.situationStatus) {
          const assignment = incident.responderAssignments?.[uid];
          list.push({
            ...rep,
            agency: assignment?.agency,
            responderName: assignment?.responderName || rep.submittedByName || undefined,
            resourceName: assignment?.resourceName || undefined,
            arrivalTime: assignment?.touchdownAt || incident.touchdownAt,
            id: uid,
          });
        }
      });
    }

    if (list.length === 0 && incident?.responderAssignments) {
      Object.entries(incident.responderAssignments).forEach(([uid, assignment]) => {
        if (assignment.sceneReport?.submittedAt || assignment.sceneReport?.situationStatus) {
          list.push({
            ...assignment.sceneReport,
            agency: assignment.agency,
            responderName:
              assignment.responderName ||
              assignment.sceneReport.submittedByName ||
              undefined,
            resourceName: assignment.resourceName || undefined,
            arrivalTime: assignment.touchdownAt || incident?.touchdownAt,
            id: uid,
          });
        }
      });
    }

    if (list.length === 0 && incident) {
      const assignmentUids = Object.keys(incident.responderAssignments || {});
      const reportUids = Object.keys(incident.postIncidentReports || {});
      const uids = [...new Set([...assignmentUids, ...reportUids])];
      uids.forEach((uid) => {
        const normalized = normalizeResponderReport(incident, uid);
        if (normalized?.source === 'scene_report' && normalized.sceneReport) {
          const assignment = incident.responderAssignments?.[uid];
          list.push({
            ...normalized.sceneReport,
            agency: assignment?.agency,
            responderName:
              assignment?.responderName ||
              normalized.sceneReport.submittedByName ||
              undefined,
            resourceName: assignment?.resourceName || undefined,
            arrivalTime: assignment?.touchdownAt || incident.touchdownAt,
            id: uid,
          });
        }
      });
    }

    return list;
  }, [incident?.sceneReports, incident?.responderAssignments, incident?.touchdownAt, incident?.postIncidentReports]);

  const pendingResourceRequestsList = useMemo(() => {
    if (!incident?.pendingResourceRequests) return [];
    return Object.entries(incident.pendingResourceRequests).map(([uid, request]) => {
      const assignment = incident.responderAssignments?.[uid];
      return {
        id: uid,
        ...request,
        agency: assignment?.agency,
        responderName: assignment?.responderName || request.requestedByName || undefined,
        resourceName: assignment?.resourceName || undefined,
      };
    });
  }, [incident?.pendingResourceRequests, incident?.responderAssignments]);

  const primaryResponderAssignment = useMemo(() => {
    const assignments = incident?.responderAssignments;
    if (!assignments) return null;
    const values = Object.values(assignments);
    return values.find((entry) => entry.touchdownAt) || values[0] || null;
  }, [incident?.responderAssignments]);

  const showPostReportSection = useMemo(() => {
    const status = report?.status || incident?.status;
    const resolutionStatus = incident?.resolutionStatus;
    return (
      sceneReportsList.length > 0 ||
      postIncidentReportsList.length > 0 ||
      status === "resolved" ||
      status === "done" ||
      resolutionStatus === "resolved"
    );
  }, [
    sceneReportsList.length,
    postIncidentReportsList.length,
    report?.status,
    incident?.status,
    incident?.resolutionStatus,
  ]);

  useEffect(() => {
    if (!assignedResponderId) {
      setResponderLocation(null);
      return;
    }

    setResponderLocation(
      dispatcherLocations.find((location) => location.dispatcherId === assignedResponderId) || null,
    );
  }, [assignedResponderId, dispatcherLocations]);

  const primarySceneImageUrls = useMemo(() => {
    if (primaryCivilianReport) {
      return getReportImageUrls(primaryCivilianReport);
    }
    if (incident) {
      return getReportImageUrls({
        imageUrl: incident.imageUrl ?? null,
        imageUrls: incident.imageUrls ?? null,
      });
    }
    return [];
  }, [primaryCivilianReport, incident]);

  const emergencyTypeLabel = useMemo(() => {
    if (report) {
      return getCivilianEmergencyTypeLabel(report.incidentType, report.typeProfile);
    }
    if (primaryCivilianReport?.incidentType) {
      return getCivilianEmergencyTypeLabel(
        primaryCivilianReport.incidentType,
        primaryCivilianReport.typeProfile,
      );
    }
    if (incident?.typeProfile) {
      return getCivilianEmergencyTypeLabel(
        resolveSceneAssessmentIncidentType({ incidentCategory: incident.incidentCategory }),
        incident.typeProfile,
      );
    }
    return item?.incidentSubtypeLabel || null;
  }, [report, primaryCivilianReport, incident, item?.incidentSubtypeLabel]);

  const assignedResourcesForIncident = useMemo(() => {
    const resourceIds = incident?.assignedResourceIds || [];
    const targetIncidentId = incident?.id || report?.incidentId || report?.id;

    return resources.filter((res) => {
      if (res.id && resourceIds.includes(res.id)) return true;
      if (res.assignedIncidentId && targetIncidentId && res.assignedIncidentId === targetIncidentId) return true;
      const ids = [
        res.primaryResponderId,
        res.assignedResponderId,
        ...(Array.isArray(res.assignedResponderIds) ? res.assignedResponderIds : []),
      ];
      if (assignedResponderId && ids.includes(assignedResponderId)) return true;
      return resourceIds.some((id) => ids.includes(id));
    });
  }, [incident, report, assignedResponderId, resources]);

  const reportSourceLabel = isEmergency
    ? "Civilian App"
    : incident?.source
    ? incident.source.replace(/_/g, " ")
    : "Manual";

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

  const isResponderAssigned = Boolean(
    assignedResponderId ||
      report?.responder ||
      associatedReports.some((entry) => entry.responder || entry.assignedResponderId),
  );
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

  const hasMapLocation = mapLocation != null;

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
      if (finalPool.length > 0) {
        // Pre-select top suggested responders
        const suggestedResponders = finalPool.filter((r) => {
          const rResource = getResponderResource(resources, r.uid);
          return (
            reportSuggestedAgencies.includes(r.account.role) ||
            isSuggestedResourceForAgencies(rResource, reportSuggestedAgencies)
          );
        });
        if (suggestedResponders.length > 0) {
          // Preselect up to 2 suggested units if available across different roles
          setSelectedResponderIds(suggestedResponders.slice(0, 2).map((r) => r.uid));
        } else {
          setSelectedResponderIds([finalPool[0].uid]);
        }
      }
    } catch (error: any) {
      setResponderError("Failed to fetch responder pool.");
    } finally {
      setIsLoadingResponders(false);
    }
  };

  const toggleResponderSelection = (uid: string) => {
    setSelectedResponderIds((current) =>
      current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]
    );
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
        router.push(`/command-center/incidents?id=${incidentId}`);
      } catch (err) {
        setResponderError("Failed to link to existing incident.");
      } finally {
        setIsLoadingResponders(false);
      }
    }
  };

  const handleConfirmRespond = async () => {
    if (selectedResponderIds.length === 0) return;
    const selectedList = responders.filter((r) => selectedResponderIds.includes(r.uid));
    if (selectedList.length === 0) return;

    const primarySelected = selectedList[0];
    const allAgencies = Array.from(new Set(selectedList.map((r) => r.account.role)));
    const allLabels = selectedList.map((r) => r.account.fullName || r.account.email);
    const boundResourceIds: string[] = [];
    selectedList.forEach((r) => {
      const bound = getResponderResource(resources, r.uid);
      if (bound?.id) boundResourceIds.push(bound.id);
    });

    if (onRespond && report) {
      await onRespond(
        report,
        {
          uid: primarySelected.uid,
          label: allLabels.join(', '),
          agency: primarySelected.account.role,
          suggestedAgency: primarySuggestedAgency,
        },
        {
          responders: selectedList.map((r) => ({
            uid: r.uid,
            label: r.account.fullName || r.account.email,
            agency: r.account.role,
          })),
          agencies: allAgencies,
          resourceIds: boundResourceIds,
        }
      );
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

  const assignedTeamLabel = incident ? getAssignedTeamName(incident) : null;
  const canReassignTeam =
    Boolean(incident?.id) &&
    incident?.resolutionStatus !== 'resolved' &&
    incident?.status !== 'resolved';

  const handleReassignTeam = async () => {
    if (!incident?.id || !reassignTeamId) return;
    setIsReassigning(true);
    setReassignError(null);
    try {
      await reassignIncidentTeam(incident.id, reassignTeamId, {
        dispatcherName: user?.displayName || user?.email || undefined,
      });
      setReassignTeamId("");
    } catch (error: any) {
      setReassignError(error?.message || "Failed to reassign team.");
    } finally {
      setIsReassigning(false);
    }
  };

  const handleCallCivilian = async () => {
    if (!item?.id && !report?.id) return;
    try {
      const callSession = await startIncidentCallSession({
        incidentId: report?.id || item.id,
        callerUserId: user?.uid,
        callerRole: 'dispatcher',
        callerName: user?.displayName || user?.email || 'Command Center Dispatch',
        targetUserId: report?.userId || null,
        targetRole: 'civilian',
        targetName: (report as any)?.reporterName || (report as any)?.fullName || (report as any)?.userName || 'Citizen',
        incidentReferenceNumber: item.referenceNumber,
        incidentType: emergencyTypeLabel || item.incidentSubtypeLabel,
        incidentLocationText: report?.locationText || item.locationText,
      });

      if (report?.userId && user) {
        const idToken = await user.getIdToken();
        fetch('/api/notifications/call-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            targetUserId: report.userId,
            callerName: user.displayName || user.email || 'Emergency Dispatch',
            roomName: callSession.roomName,
            sessionId: callSession.id,
            incidentId: report.id || item.id,
          }),
        }).catch(() => undefined);
      }

      setActiveCallSession(callSession);
      setIsCallModalOpen(true);
    } catch (err: any) {
      console.error('[handleCallCivilian] error:', err);
    }
  };

  const handleCallResponder = async () => {
    const targetResponderId = assignedResponderId || report?.assignedResponderId || (incident?.assignedResourceIds?.[0]) || null;
    if (!targetResponderId) return;

    try {
      const callSession = await startIncidentCallSession({
        incidentId: report?.id || item.id,
        callerUserId: user?.uid,
        callerRole: 'dispatcher',
        callerName: user?.displayName || user?.email || 'Command Center Dispatch',
        targetUserId: targetResponderId,
        targetRole: 'responder',
        targetName: displayResponder || 'Responder',
        assignedResponderId: targetResponderId,
        incidentReferenceNumber: item.referenceNumber,
        incidentType: emergencyTypeLabel || item.incidentSubtypeLabel,
        incidentLocationText: report?.locationText || item.locationText,
      });

      if (user) {
        const idToken = await user.getIdToken();
        fetch('/api/notifications/call-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            targetUserId: targetResponderId,
            callerName: user.displayName || user.email || 'Emergency Dispatch',
            roomName: callSession.roomName,
            sessionId: callSession.id,
            incidentId: report?.id || item.id,
          }),
        }).catch(() => undefined);
      }

      setActiveCallSession(callSession);
      setIsCallModalOpen(true);
    } catch (err: any) {
      console.error('[handleCallResponder] error:', err);
    }
  };


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
            {emergencyTypeLabel || item.incidentSubtypeLabel} • {reportSourceLabel}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
           {/* Live Incident Chat */}
           <button
             onClick={() => setIsMessagingOpen(true)}
             className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-sky-800/80 bg-sky-950/40 hover:bg-sky-900/60 text-[10px] font-bold text-sky-300 transition-all uppercase tracking-wider shadow-sm"
             title="Open live chat with citizen"
           >
             <MessageSquare className="w-3.5 h-3.5" />
             <span className="hidden md:inline">Message</span>
           </button>

           {/* Call Civilian */}
           <button
             onClick={handleCallCivilian}
             className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-800/80 bg-emerald-950/40 hover:bg-emerald-900/60 text-[10px] font-bold text-emerald-300 transition-all uppercase tracking-wider shadow-sm"
             title="Place voice call to citizen"
           >
             <Phone className="w-3.5 h-3.5" />
             <span className="hidden md:inline">Call Citizen</span>
           </button>

           {/* Call Responder */}
           {isResponderAssigned && (
             <button
               onClick={handleCallResponder}
               className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-amber-800/80 bg-amber-950/40 hover:bg-amber-900/60 text-[10px] font-bold text-amber-300 transition-all uppercase tracking-wider shadow-sm"
               title="Place voice call to assigned responder"
             >
               <Radio className="w-3.5 h-3.5" />
               <span className="hidden md:inline">Call Responder</span>
             </button>
           )}

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

                {!report?.incidentId &&
                  report?.status !== "enroute" &&
                  report?.status !== "on_scene" &&
                  report?.status !== "done" &&
                  report?.status !== "resolved" &&
                  report?.status !== "rejected" &&
                  report?.status !== "cancelled" && (
                  <button 
                    onClick={() => onReject?.(report)}
                    className="h-8 px-3 flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/20 hover:bg-red-950/40 text-[10px] font-black text-red-500 transition-all uppercase tracking-widest"
                  >
                    <XCircle className="w-3 h-3" />
                    Reject
                  </button>
                )}

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar no-scrollbar">
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
                    <span className="text-[10px] text-slate-200 mt-1 leading-relaxed truncate">&ldquo;{other.description || 'No description provided.'}&rdquo;</span>
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

        {/* Incident Summary */}
        <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-primary-400" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
              Incident Summary
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <SummaryMetric label="Incident ID" value={item.referenceNumber} mono />
            <SummaryMetric
              label="Status"
              value={getQueueItemOperationalStatus(item).replace(/_/g, " ")}
            />
            <SummaryMetric label="Priority" value={(item.priority || "medium").toUpperCase()} />
            <SummaryMetric label="Incident Type" value={emergencyTypeLabel || "—"} />
            <SummaryMetric label="Report Source" value={reportSourceLabel} />
            <SummaryMetric label="Created" value={getDateLabel(item.createdAt)} />
          </div>
        </section>

        {/* Live Map (left) / Timeline + Assignment (right) */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3 xl:items-stretch">
          <div className="xl:col-span-2">
            <DetailSection
              compact
              className="flex h-full flex-col"
              contentClassName="flex min-h-0 flex-1 flex-col"
              icon={<MapPin className="w-3 h-3" />}
              title="Live Map"
            >
              <div className="min-h-[420px] w-full flex-1">
                {hasMapLocation ? (
                  isResponderAssigned ? (
                    <AppReportResponseMap
                      className="h-full"
                      incident={{
                        latitude: mapLocation!.latitude,
                        longitude: mapLocation!.longitude,
                        label: mapLocation!.label,
                      }}
                      responder={
                        responderLocation
                          ? {
                              latitude: responderLocation.latitude,
                              longitude: responderLocation.longitude,
                              label:
                                report?.responder ||
                                associatedReports.find((entry) => entry.responder)?.responder ||
                                "En route",
                            }
                          : null
                      }
                    />
                  ) : (
                    <PinnedLocationMap
                      className="h-full"
                      latitude={mapLocation!.latitude}
                      longitude={mapLocation!.longitude}
                      label={mapLocation!.label}
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950 text-[10px] font-medium uppercase tracking-widest text-slate-500">
                    No coordinates available
                  </div>
                )}
              </div>
            </DetailSection>
          </div>

          <div className="space-y-3">
              <DetailSection compact emphasis icon={<Clock className="w-4 h-4" />} title="Timeline">
                 <div className="space-y-2">
                   <CompactRow size="md" label="Reported" value={getDateLabel(item.createdAt)} />
                   <CompactRow size="md" label="Viewed" value={getDateLabel(report?.viewedAt)} />
                   <CompactRow size="md" label="Assigned" value={getDateLabel(incident?.assignedTeamAt || report?.acceptedAt)} />
                   <CompactRow size="md" label="En Route" value={getDateLabel(report?.acceptedAt || incident?.acceptedAt)} />
                   <CompactRow
                     size="md"
                     label="On Scene"
                     value={
                       primaryResponderAssignment?.touchdownAt || incident?.touchdownAt || report?.touchdownAt
                         ? getDateLabel(
                             primaryResponderAssignment?.touchdownAt ||
                               incident?.touchdownAt ||
                               report?.touchdownAt,
                           )
                         : "—"
                     }
                     highlight
                   />
                   {primaryResponderAssignment?.touchdownRecordedAt ? (
                     <CompactRow
                       size="md"
                       label="On Scene Recorded"
                       value={getDateLabel(primaryResponderAssignment.touchdownRecordedAt)}
                     />
                   ) : incident?.touchdownRecordedAt ? (
                     <CompactRow
                       size="md"
                       label="On Scene Recorded"
                       value={getDateLabel(incident.touchdownRecordedAt)}
                     />
                   ) : null}
                   {sceneReportsList[0]?.submittedAt ? (
                     <CompactRow
                       size="md"
                       label="Scene Report"
                       value={getDateLabel(sceneReportsList[0].submittedAt)}
                     />
                   ) : null}
                   <CompactRow
                     size="md"
                     label="Resolved"
                     value={getDateLabel(incident?.resolvedAt || (report?.status === "resolved" || report?.status === "done" ? report?.updatedAt : null))}
                   />
                    {(incident?.responseTimeSeconds ?? report?.responseTimeSeconds) != null && (
                      <CompactRow
                        size="md"
                        label="Response"
                        value={formatResponseTime(incident?.responseTimeSeconds ?? report?.responseTimeSeconds) || "—"}
                        highlight
                      />
                    )}
                 </div>
              </DetailSection>

              <DetailSection compact emphasis icon={<Activity className="w-4 h-4" />} title="Assignment">
                <div className="grid w-full grid-cols-[minmax(6.5rem,auto)_1fr] items-start gap-x-4 gap-y-2.5 text-[13px] leading-snug">
                  <span className="font-medium text-slate-500">Agency</span>
                  <span className="min-w-0 break-words text-right font-medium text-slate-100">{displayAgency}</span>

                  <span className="font-medium text-slate-500">Responder</span>
                  <span className="min-w-0 break-all text-right font-medium text-slate-100">{displayResponder}</span>

                  <span className="font-medium text-slate-500">Assigned Unit</span>
                  <div className="flex flex-col items-end gap-1 text-right">
                    {assignedResourcesForIncident.length > 0 ? (
                      assignedResourcesForIncident.map((res) => (
                        <span
                          key={res.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs font-semibold text-slate-200"
                        >
                          <Ambulance className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                          <span className="text-slate-100">{res.name}</span>
                          <span className="text-[10px] text-slate-400">({res.type})</span>
                          <span className="rounded border border-slate-700 bg-slate-900 px-1 py-0.2 text-[9px] uppercase font-bold text-slate-300">
                            {res.status.replace('_', ' ')}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-right font-medium text-slate-400">
                        {(incident?.assignedResourceIds?.length || 0) > 0
                          ? `${incident?.assignedResourceIds?.length} unit(s) dispatched`
                          : 'No unit linked'}
                      </span>
                    )}
                  </div>

                  {incident?.responderAssignments && Object.keys(incident.responderAssignments).length > 0 ? (
                    <>
                      <span className="font-medium text-slate-500">Units & Status</span>
                      <div className="flex flex-col items-end gap-1.5 text-right">
                        {Object.entries(incident.responderAssignments).map(([rid, assign]) => {
                          const statusColor =
                            assign.status === 'on_scene'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : assign.status === 'enroute'
                              ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                              : assign.status === 'resolved'
                              ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                              : assign.status === 'declined'
                              ? 'border-red-500/40 bg-red-500/10 text-red-300'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-300';
                          return (
                            <div key={rid} className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-200">
                                {assign.agency ? `[${assign.agency}] ` : ''}{assign.responderName || rid}:
                              </span>
                              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${statusColor}`}>
                                {assign.status.replace('_', ' ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}

                  <span className="self-start pt-0.5 font-medium text-slate-500">Team</span>
                  <div className="flex justify-end">
                    <TeamBadge label={assignedTeamLabel} size="sm" />
                  </div>

                  {incident?.assignedTeamBy || incident?.assignedTeamAt ? (
                    <>
                      <span className="font-medium text-slate-500">Assigned By</span>
                      <span className="min-w-0 break-all text-right font-medium text-slate-100">
                        {incident?.assignedTeamBy === user?.uid
                          ? user?.displayName || user?.email || "Dispatcher"
                          : incident?.assignedTeamBy || "—"}
                      </span>
                      <span className="font-medium text-slate-500">Assigned Time</span>
                      <span className="min-w-0 break-words text-right font-medium text-slate-100">
                        {getDateLabel(incident?.assignedTeamAt)}
                      </span>
                    </>
                  ) : null}
                </div>
                {canReassignTeam ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
                    <select
                      value={reassignTeamId}
                      onChange={(event) => setReassignTeamId(event.target.value)}
                      className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2.5 text-xs text-slate-100"
                    >
                      <option value="">Reassign team…</option>
                      {teams.map((team, index) => (
                        <option key={teamReactKey(team, index)} value={team.id || team.code}>
                          {team.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!reassignTeamId || isReassigning}
                      onClick={handleReassignTeam}
                      className="h-9 rounded-lg border border-primary-500/40 bg-primary-500/10 px-3.5 text-[11px] font-black uppercase tracking-wider text-primary-200 disabled:opacity-50"
                    >
                      {isReassigning ? "Saving…" : "Reassign"}
                    </button>
                    {reassignError ? (
                      <span className="text-xs text-red-400">{reassignError}</span>
                    ) : null}
                  </div>
                ) : null}
              </DetailSection>
           </div>
        </div>

        {/* Location Details + Associated Citizen Reports */}
        <div
          className={`grid gap-3 ${
            !isEmergency && associatedReports.length > 0 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          }`}
        >
          <DetailSection compact emphasis icon={<MapPin className="w-4 h-4" />} title="Location Details">
            <div className="grid w-full grid-cols-[minmax(6.5rem,auto)_1fr] items-start gap-x-4 gap-y-3 text-[13px] leading-snug">
              <span className="font-medium text-slate-500">Address</span>
              <span className="min-w-0 break-words text-right font-medium text-slate-100">
                {(report || incident)?.locationText || mapLocation?.label || "—"}
              </span>
              <span className="font-medium text-slate-500">Landmark</span>
              <span className="min-w-0 break-words text-right font-medium text-slate-100">
                {(report || incident)?.landmark || "None"}
              </span>
              <span className="font-medium text-slate-500">Coordinates</span>
              <span className="min-w-0 break-all text-right font-mono font-medium text-slate-100">
                {mapLocation
                  ? `${mapLocation.latitude.toFixed(6)}, ${mapLocation.longitude.toFixed(6)}`
                  : `${(report || incident)?.latitude?.toFixed(6) || "—"}, ${(report || incident)?.longitude?.toFixed(6) || "—"}`}
              </span>
            </div>
          </DetailSection>

          {!isEmergency && associatedReports.length > 0 ? (
            <DetailSection
              compact
              icon={<Shield className="w-3 h-3" />}
              title={`Associated Citizen Reports (${associatedReports.length})`}
            >
              <AssociatedCitizenReportList
                reports={associatedReports}
                primaryReportId={primaryReportId}
                masterLatitude={mapLocation?.latitude ?? (report || incident)?.latitude}
                masterLongitude={mapLocation?.longitude ?? (report || incident)?.longitude}
                onViewReport={setSelectedCitizenReport}
              />
            </DetailSection>
          ) : null}
        </div>

        {/* Initial Narrative */}
        <DetailSection compact full icon={<FileText className="w-4 h-4" />} title="Initial Narrative" emphasis>
          {primaryCivilianReport ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <InitialNarrativeDisplay
                  description={primaryCivilianReport.description}
                  fieldAssessment={primaryCivilianReport.fieldAssessment}
                  typeProfile={primaryCivilianReport.typeProfile}
                  incidentType={primaryCivilianReport.incidentType}
                  peopleInvolved={primaryCivilianReport.peopleInvolved}
                  omitLandmark
                />
              </div>
              {primarySceneImageUrls.length > 0 ? (
                <div className="border-t border-slate-800/80 pt-2.5">
                  <IncidentScenePhotos
                    imageUrls={primarySceneImageUrls}
                    layout={primarySceneImageUrls.length > 1 ? "row" : "stack"}
                    compact
                    hideHint={primarySceneImageUrls.length > 1}
                    emptyMessage=""
                  />
                </div>
              ) : (
                <p className="text-[11px] italic text-slate-500">No photos attached.</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] italic text-slate-500">No civilian narrative available.</p>
          )}
        </DetailSection>

        {pendingResourceRequestsList.length > 0 ? (
          <section className="w-full rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                Additional Resources Requested
              </h3>
            </div>
            <div className="space-y-2">
              {pendingResourceRequestsList.map((request) => (
                <div
                  key={request.id}
                  className="rounded-md border border-amber-900/40 bg-slate-950/40 px-3 py-2 text-xs text-slate-200"
                >
                  <div className="font-semibold text-amber-200">
                    {getAdditionalResourceLabel(request.additionalResourceType)}
                    {request.additionalResourceTypeOther
                      ? ` — ${request.additionalResourceTypeOther}`
                      : ""}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Requested by {request.responderName || "responder"}
                    {request.agency ? ` · ${request.agency}` : ""}
                    {request.requestedAt ? ` · ${getDateLabel(request.requestedAt)}` : ""}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    Command Center assigns the actual resource — responder requested assistance type only.
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {showPostReportSection ? (
          <section className="w-full rounded-lg border border-slate-800/80 bg-slate-950/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {sceneReportsList.length > 1
                    ? "Scene Reports (Multi-Agency)"
                    : sceneReportsList.length > 0
                      ? "Scene Report"
                      : postIncidentReportsList.length > 1
                        ? "Post-Incident Reports (Multi-Agency)"
                        : "Post-Incident Report"}
                </h3>
              </div>
              {(sceneReportsList.length > 0 || postIncidentReportsList.length > 0) ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-px text-[9px] font-black uppercase tracking-wider text-emerald-300">
                  {sceneReportsList.length || postIncidentReportsList.length} Submitted
                </span>
              ) : null}
            </div>

            {sceneReportsList.length > 0 ? (
              <div className="w-full space-y-3">
                {sceneReportsList.map((sceneReport, idx) => (
                  <div
                    key={sceneReport.id || idx}
                    className={`w-full ${idx > 0 ? "border-t border-slate-800/80 pt-3" : ""}`}
                  >
                    {sceneReport.agency ? (
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-black tracking-wider text-emerald-300">
                          [{sceneReport.agency}] {sceneReport.responderName ? `· ${sceneReport.responderName}` : ""}
                        </span>
                        {sceneReport.submittedAt ? (
                          <span className="text-[10px] text-slate-400">
                            {getDateLabel(sceneReport.submittedAt)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <SceneReportPanel
                      sceneReport={sceneReport}
                      responderName={sceneReport.responderName}
                      resourceName={sceneReport.resourceName}
                      arrivalTimeLabel={getDateLabel(sceneReport.arrivalTime)}
                      resolvedAtLabel={getDateLabel(sceneReport.submittedAt)}
                    />
                  </div>
                ))}
              </div>
            ) : postIncidentReportsList.length > 0 ? (
              <div className="w-full space-y-3">
                {postIncidentReportsList.map((pReport, idx) => (
                  <div
                    key={pReport.id || idx}
                    className={`w-full space-y-2 ${
                      idx > 0 ? "border-t border-slate-800/80 pt-3" : ""
                    }`}
                  >
                    {pReport.agency ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black tracking-wider text-emerald-300">
                          [{pReport.agency}] {pReport.responderName ? `· ${pReport.responderName}` : ""}
                        </span>
                        {pReport.submittedAt ? (
                          <span className="text-[10px] text-slate-400">
                            {getDateLabel(pReport.submittedAt)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="w-full">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80">
                        Summary
                      </p>
                      <p className="mt-0.5 w-full break-words text-sm font-medium leading-snug text-slate-100">
                        {pReport.notes?.trim()
                          ? `“${pReport.notes.trim()}”`
                          : "No summary notes provided."}
                      </p>
                    </div>

                    <div className="grid w-full grid-cols-[minmax(5.5rem,auto)_1fr] items-center gap-x-3 gap-y-1 border-t border-slate-800/60 pt-2 text-xs leading-snug">
                      <span className="text-slate-500">Reason</span>
                      <span className="min-w-0 break-words text-right font-medium text-slate-100">
                        {pReport.reasonForIncident || "—"}
                      </span>
                      <span className="text-slate-500">Status</span>
                      <span className="min-w-0 break-words text-right font-medium text-slate-100">
                        {pReport.peopleStatus || "—"}
                      </span>
                      <span className="text-slate-500">People</span>
                      <span className="min-w-0 break-words text-right font-medium text-slate-100">
                        {String(pReport.peopleInvolved ?? "—")}
                      </span>
                      <span className="text-slate-500">Transport</span>
                      <span className="min-w-0 break-words text-right font-medium text-slate-100">
                        {pReport.hospital || "—"}
                      </span>
                      {pReport.submittedByName ? (
                        <>
                          <span className="text-slate-500">By</span>
                          <span className="min-w-0 break-all text-right font-medium text-slate-100">
                            {pReport.submittedByName}
                          </span>
                        </>
                      ) : null}
                    </div>

                    <PostIncidentReportPhotos
                      actionPhotoUrl={pReport.actionPhotoUrl}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-700 bg-slate-950/40 px-3 py-3 text-center">
                <p className="text-xs font-medium text-slate-400">No scene report yet</p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Awaiting responder scene report submission.
                </p>
              </div>
            )}
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:items-stretch">
          <DetailSection
            compact
            emphasis
            className="flex h-full flex-col"
            contentClassName="flex min-h-0 flex-1 flex-col"
            icon={<MapPin className="w-4 h-4" />}
            title="On Scene / Arrival"
          >
            <TouchdownArrivalPanel
              incident={incident}
              report={report}
              assignment={primaryResponderAssignment}
            />
          </DetailSection>

          {sceneReportsList.length === 0 ? (
            <DetailSection
              compact
              emphasis
              className="flex h-full flex-col"
              contentClassName="flex min-h-0 flex-1 flex-col"
              icon={<AlertTriangle className="w-4 h-4" />}
              title="Scene Assessment (Legacy)"
            >
              <SceneAssessmentPanel
                assessment={sceneAssessmentContext.assessment}
                incidentType={sceneAssessmentContext.incidentType}
                isLoading={
                  !sceneAssessmentContext.assessment &&
                  (item?.channel === "incident" ? incidentsLoading : false)
                }
              />
            </DetailSection>
          ) : (
            <DetailSection
              compact
              emphasis
              className="flex h-full flex-col"
              contentClassName="flex min-h-0 flex-1 flex-col"
              icon={<AlertTriangle className="w-4 h-4" />}
              title="Scene Report"
            >
              <SceneReportPanel
                sceneReport={sceneReportsList[0]}
                responderName={sceneReportsList[0]?.responderName}
                resourceName={sceneReportsList[0]?.resourceName}
                arrivalTimeLabel={getDateLabel(sceneReportsList[0]?.arrivalTime)}
                resolvedAtLabel={getDateLabel(sceneReportsList[0]?.submittedAt)}
              />
            </DetailSection>
          )}
        </div>

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
              {currentTeamOnDuty ? (
                <p className="text-[10px] text-slate-400">
                  New incident will inherit the current team on duty:{' '}
                  <span className="font-bold text-slate-200">{currentTeamOnDuty.teamName}</span>
                </p>
              ) : (
                <p className="text-[10px] font-bold text-amber-400">
                  Set the Current Team on Duty in the header before elevating.
                </p>
              )}
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500 block">
                    Select Dispatch Responder(s) / Unit(s)
                  </label>
                  {suggestedAgencies.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Recommended:</span>
                      <div className="flex flex-wrap gap-1">
                        {suggestedAgencies.map((agency) => {
                          const isCovered = responders.some(
                            (r) => selectedResponderIds.includes(r.uid) && r.account.role === agency
                          );
                          return (
                            <span
                              key={agency}
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                isCovered
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isCovered ? '✓ ' : ''}{agency}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {!hasLocalSuggestedAppResource && reportQuadrant ? (
                  <p className="text-[10px] font-bold text-amber-300">
                    No suggested available resource is bound in this report quadrant; nearby fallback units are included.
                  </p>
                ) : null}

                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 space-y-1.5 custom-scrollbar">
                  {isLoadingResponders ? (
                    <div className="p-4 text-center text-xs text-slate-500">Loading responder units...</div>
                  ) : responders.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No responder units available</div>
                  ) : (
                    responders.map((r) => {
                      const boundResource = getResponderResource(resources, r.uid);
                      const isSelected = selectedResponderIds.includes(r.uid);
                      const fallbackLabel = getResponderFallbackLabel(r);
                      const isSuggested = suggestedAgencies.includes(r.account.role);

                      return (
                        <label
                          key={r.uid}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm'
                              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleResponderSelection(r.uid)}
                              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/50 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200 truncate">
                                  {r.account.fullName || r.account.email}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                  {r.account.role}
                                </span>
                              </div>
                              {boundResource ? (
                                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                  <span>Unit: <strong className="text-slate-300 font-semibold">{boundResource.name}</strong></span>
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                    boundResource.status === 'available' ? 'bg-emerald-400' : 'bg-amber-400'
                                  }`} />
                                  <span className="capitalize">{boundResource.status.replace('_', ' ')}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {fallbackLabel ? (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Fallback
                              </span>
                            ) : isSuggested ? (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Suggested
                              </span>
                            ) : null}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {selectedResponderIds.length > 0 && (
                  <p className="text-[10px] font-medium text-slate-400">
                    Selected: <strong className="text-emerald-400 font-bold">{selectedResponderIds.length} unit{selectedResponderIds.length > 1 ? 's' : ''}</strong> from{' '}
                    <span className="text-slate-200">
                      {Array.from(new Set(responders.filter((r) => selectedResponderIds.includes(r.uid)).map((r) => r.account.role))).join(', ')}
                    </span>
                  </p>
                )}

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
                disabled={isLoadingResponders || selectedResponderIds.length === 0}
                onClick={handleConfirmRespond}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Confirm Elevation ({selectedResponderIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      <CitizenReportDetailDrawer
        report={selectedCitizenReport}
        onClose={() => setSelectedCitizenReport(null)}
      />

      <IncidentMessagingDrawer
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
        incidentId={report?.id || item?.id || ''}
        referenceNumber={item?.referenceNumber}
        civilianName={(report as any)?.reporterName || (report as any)?.fullName || (report as any)?.userName || 'Citizen'}
        civilianPhone={(report as any)?.contactNumber || (report as any)?.phoneNumber || (report as any)?.phone}
      />

      <ActiveCallModal
        session={activeCallSession}
        isOpen={isCallModalOpen}
        onClose={() => {
          setIsCallModalOpen(false);
          setActiveCallSession(null);
        }}
      />
    </>
  );
}

function SummaryMetric({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 px-2.5 py-2">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-0.5 truncate text-xs font-semibold text-slate-100 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function CompactRow({
  label,
  value,
  mono = false,
  highlight = false,
  size = "sm",
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  size?: "sm" | "md";
}) {
  const isMd = size === "md";

  return (
    <div
      className={`flex w-full items-start justify-between gap-3 ${isMd ? "py-0.5 text-[13px] leading-snug" : "text-[11px]"}`}
    >
      <span className={`shrink-0 text-slate-500 ${isMd ? "font-medium" : ""}`}>{label}</span>
      <span
        className={`min-w-0 flex-1 break-words text-right ${mono ? "font-mono" : ""} ${
          highlight
            ? "font-semibold text-emerald-400"
            : isMd
              ? "font-medium text-slate-100"
              : "text-slate-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DetailSection({
  title,
  icon,
  children,
  full = false,
  compact = false,
  emphasis = false,
  className = "",
  contentClassName = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  full?: boolean;
  compact?: boolean;
  emphasis?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={`${full ? "col-span-full" : ""} ${
        compact
          ? emphasis
            ? "rounded-lg border border-slate-800/80 bg-slate-950/30 p-3.5"
            : "rounded-lg border border-slate-800/80 bg-slate-950/30 p-2.5"
          : ""
      } ${className}`}
    >
      <div
        className={`flex items-center gap-2 ${compact ? (emphasis ? "mb-2.5" : "mb-1.5") : "mb-2"}`}
      >
        {icon && <span className="text-slate-500">{icon}</span>}
        <h4
          className={`font-black uppercase tracking-[0.18em] text-slate-500 ${
            emphasis ? "text-[11px]" : "text-[9px]"
          }`}
        >
          {title}
        </h4>
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
