"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import CommandBar from "@/components/CommandBar";
import { useAuth } from "@/contexts/AuthContext";
import {
  assignDispatcherToEmergency,
  assignResponderToEmergency,
  createIncident,
  deleteIncident,
  dispatchIncidentResources,
  elevateEmergencyToIncident,
  getAgencyLabel,
  getIncidentResourceMatch,
  getSuggestedAgenciesForEmergencyType,
  moveEmergencyReportToHistory,
  BARANGAY_QUADRANT_MAPPING,
  OPERATIONAL_QUADRANTS,
  QUADRANT_LABELS,
  requestEmergencyAdditionalDetails,
  subscribeToEmergencyReport,
  subscribeToEmergencyReports,
  subscribeToIncidents,
  subscribeToIncidentTypeRules,
  subscribeToResources,
  associateReportsWithIncident,
  disassociateReportFromIncident,
  linkReportToReport,
  unlinkReportFromReport,
  Timestamp,
  type CreateIncidentInput,
  type DispatcherRole,
  type EmergencyReport,
  type IncidentRecord,
  type IncidentSource,
  type IncidentTypeRule,
  type OperationalQuadrant,
  type ResourceRecord,
  type TeamOnDuty,
  comparePriority,
  normalizePriority,
  updateEmergencyPriority,
  type IncidentPriority,
} from "@packages/firebase";
import { usePriorityAlerts } from "@/contexts/PriorityAlertContext";
import IntakeListItem, {
  IntakePriorityBadge,
  type IntakeQueueItem,
} from "@/components/IntakeListItem";
import IntakeDetailView from "@/components/IntakeDetailView";
import { 
  Plus,
  Search, 
  Filter, 
  ChevronRight, 
  MessageSquare, 
  Smartphone, 
  Keyboard,
  Calendar 
} from "lucide-react";

const IncidentLocationPicker = dynamic(
  () => import("@/components/IncidentLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-sm text-slate-400">
        Loading map...
      </div>
    ),
  },
);

type IncidentFormState = {
  source: IncidentSource;
  incidentSubtypeId: string;
  callerName: string;
  callerContact: string;
  locationText: string;
  landmark: string;
  quadrant: OperationalQuadrant | "";
  latitude: string;
  longitude: string;
  description: string;
  vehicularAccidentReason: string;
  notes: string;
  // Duty fields (Phase 1)
  teamOnDuty: TeamOnDuty | "";
  incidentDate: string; // YYYY-MM-DD
  incidentTime: string; // hh:mm AM/PM
};

type BarangayFeature = {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  } | null;
  properties?: {
    ADM4_EN?: string;
  };
};

type BarangayFeatureCollection = {
  type: "FeatureCollection";
  features: BarangayFeature[];
};

const emptyForm: IncidentFormState = {
  source: "manual",
  incidentSubtypeId: "",
  callerName: "",
  callerContact: "",
  locationText: "",
  landmark: "",
  quadrant: "",
  latitude: "",
  longitude: "",
  description: "",
  vehicularAccidentReason: "",
  notes: "",
  teamOnDuty: "",
  incidentDate: "",
  incidentTime: "",
};

const sourceOptions: { value: IncidentSource; label: string }[] = [
  { value: "manual", label: "Manual Entry" },
  { value: "call", label: "Call" },
  { value: "sms", label: "SMS" },
  { value: "radio", label: "Radio" },
  { value: "walk_in", label: "Walk-in" },
  { value: "civilian_app", label: "Civilian App" },
];

const teamOnDutyOptions: TeamOnDuty[] = ["Whiskey", "X-ray", "Yankee", "Zulu"];

const TIME_ZONE = "Asia/Manila";
const INCIDENT_TIME_REGEX = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i;

function getPhilippineDateString(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function getPhilippineTimeString(now: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);
}

function normalizeIncidentTimeForInput(value: string): string | null {
  const match = value.trim().match(INCIDENT_TIME_REGEX);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();
  const hh = String(hour).padStart(2, "0");

  return `${hh}:${minute} ${period}`;
}

function getResponderAgencyLabel(role: DispatcherRole): string {
  switch (role) {
    case "AMBULANCE":
      return "Ambulance";
    case "MDRRMO":
      return "MDRRMO";
    default:
      return role;
  }
}

const toNumberOrNull = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

const isPointInRing = (
  latitude: number,
  longitude: number,
  ring: number[][],
) => {
  let isInside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [currentLongitude, currentLatitude] = ring[i];
    const [previousLongitude, previousLatitude] = ring[j];
    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
};

const isPointInPolygon = (
  latitude: number,
  longitude: number,
  polygon: number[][][],
) => {
  const [outerRing, ...holes] = polygon;
  if (!outerRing || !isPointInRing(latitude, longitude, outerRing)) {
    return false;
  }

  return !holes.some((hole) => isPointInRing(latitude, longitude, hole));
};

const detectQuadrantFromCoordinate = (
  latitude: number,
  longitude: number,
  geojsonData: BarangayFeatureCollection | null,
): OperationalQuadrant | "" => {
  if (!geojsonData) {
    return "";
  }

  for (const feature of geojsonData.features) {
    const barangayName = feature.properties?.ADM4_EN;
    const mappedQuadrant = barangayName
      ? BARANGAY_QUADRANT_MAPPING[barangayName]
      : null;

    if (!mappedQuadrant || !feature.geometry) {
      continue;
    }

    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates as number[][][]]
        : (feature.geometry.coordinates as number[][][][]);

    if (
      polygons.some((polygon) =>
        isPointInPolygon(latitude, longitude, polygon),
      )
    ) {
      return mappedQuadrant;
    }
  }

  return "";
};

const toDateLabel = (
  value: IncidentRecord["createdAt"] | EmergencyReport["createdAt"],
) => {
  if (!value) return "N/A";
  const date =
    value instanceof Date
      ? value
      : typeof value === "object" && value && "toDate" in value
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value);

  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

const toMillis = (
  value: IncidentRecord["createdAt"] | EmergencyReport["createdAt"],
) => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && value && "toDate" in value) {
    return value.toDate().getTime();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getEmergencyIncidentTypeName = (
  incidentType: EmergencyReport["incidentType"],
) => {
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

const toQueueItemFromIncident = (incident: IncidentRecord): IntakeQueueItem => ({
  id: incident.id || incident.referenceNumber,
  channel: "incident",
  referenceNumber: incident.referenceNumber,
  incidentSubtypeLabel: incident.incidentSubtypeLabel,
  locationText: incident.locationText,
  priority: incident.priority,
  quadrantLabel: incident.quadrant ? QUADRANT_LABELS[incident.quadrant] : null,
  teamOnDutyLabel: incident.teamOnDuty ?? null,
  incidentDateLabel: incident.incidentDate ?? null,
  incidentTimeLabel: incident.incidentTime ?? null,
  createdAt: incident.createdAt,
  viewedByName: null,
  suggestedAgencyLabel: null,
  rawEmergencyReport: null,
  rawIncident: incident,
});

const toQueueItemFromEmergency = (report: EmergencyReport): IntakeQueueItem => {
  const suggestedAgency =
    report.suggestedAgency ||
    getSuggestedAgenciesForEmergencyType(report.incidentType)[0] ||
    null;

  return {
    id: report.id || `app-${String(report.createdAt ?? Date.now())}`,
    channel: "emergency_report",
    referenceNumber: report.id ? `APP-${report.id.slice(-6).toUpperCase()}` : "APP-REPORT",
    incidentSubtypeLabel: getEmergencyIncidentTypeName(report.incidentType),
    locationText: report.locationText,
    priority: report.priority || "medium",
    quadrantLabel: null,
    teamOnDutyLabel: null,
    incidentDateLabel: null,
    incidentTimeLabel: null,
    createdAt: report.createdAt,
    viewedByName: report.viewedByName || null,
    suggestedAgencyLabel: suggestedAgency
      ? getResponderAgencyLabel(suggestedAgency)
      : null,
    rawEmergencyReport: report,
    rawIncident: null,
  };
};

/** Fields that affect queue/detail presentation — used to avoid redundant selected-item updates. */
const emergencyReportSyncKey = (report: EmergencyReport): string =>
  [
    report.status,
    report.incidentId ?? "",
    report.alertAcknowledged ? "1" : "0",
    report.acknowledgedBy ?? "",
    report.viewedByName ?? "",
    report.priority ?? "",
    report.assignedResponderId ?? "",
    report.responder ?? "",
    String(toMillis(report.updatedAt)),
  ].join("|");

/** Keep selection in sync with Firestore; alert ack must not replace operational status labels. */
const refreshQueueItemFromEmergencyReport = (
  item: IntakeQueueItem,
  report: EmergencyReport,
): IntakeQueueItem => {
  const refreshed = toQueueItemFromEmergency(report);
  return { ...refreshed, id: item.id };
};

const sortResourcesByName = (resources: ResourceRecord[]) =>
  [...resources].sort((left, right) => left.name.localeCompare(right.name));

const appSources: IncidentSource[] = ["civilian_app"];
const smsCallSources: IncidentSource[] = ["sms", "call"];
const manualEntrySources: IncidentSource[] = ["manual", "walk_in", "radio"];

function formatIncidentDateForDisplay(date: string | null | undefined): string {
  // Store format is usually YYYY-MM-DD; display as MM/DD/YYYY for readability.
  if (!date) return "—";
  const trimmed = date.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return trimmed;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

function IntakeContent() {
  const { user } = useAuth();
  const { acknowledgeReport } = usePriorityAlerts();
  const searchParams = useSearchParams();
  const router = useRouter();

  const preselectedTeamOnDuty = useMemo<TeamOnDuty | null>(() => {
    // Optional: allow prefill via query string.
    const candidate =
      searchParams.get("teamOnDuty") ??
      searchParams.get("team_on_duty") ??
      searchParams.get("team");
    if (!candidate) return null;
    return teamOnDutyOptions.includes(candidate as TeamOnDuty)
      ? (candidate as TeamOnDuty)
      : null;
  }, [searchParams]);

  const [incidentRules, setIncidentRules] = useState<IncidentTypeRule[]>([]);
  const [formState, setFormState] = useState<IncidentFormState>(() => {
    const now = new Date();
    return {
      ...emptyForm,
      incidentDate: getPhilippineDateString(now),
      incidentTime: getPhilippineTimeString(now),
    };
  });

  useEffect(() => {
    if (!preselectedTeamOnDuty) return;
    setFormState((current) =>
      current.teamOnDuty
        ? current
        : { ...current, teamOnDuty: preselectedTeamOnDuty },
    );
  }, [preselectedTeamOnDuty]);

  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<IncidentRecord[]>([]);
  const [appEmergencyReports, setAppEmergencyReports] = useState<EmergencyReport[]>([]);
  const [barangayGeojson, setBarangayGeojson] =
    useState<BarangayFeatureCollection | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [selectedExistingResourceIds, setSelectedExistingResourceIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "app" | "sms" | "manual">("all");
  const [selectedQueueItem, setSelectedQueueItem] = useState<IntakeQueueItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingExistingIncident, setIsUpdatingExistingIncident] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const incidentDateInputRef = useRef<HTMLInputElement | null>(null);

  const selectedRule = useMemo<IncidentTypeRule | null>(
    () =>
      incidentRules.find((rule) => rule.id === formState.incidentSubtypeId) ||
      null,
    [formState.incidentSubtypeId, incidentRules],
  );

  useEffect(() => {
    fetch("/tuguegarao-barangays.json")
      .then((response) => response.json())
      .then((data: BarangayFeatureCollection) => setBarangayGeojson(data))
      .catch((error) => {
        console.error("Error loading barangay polygons:", error);
        setBarangayGeojson(null);
      });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribeResources = subscribeToResources((nextResources) => {
      setResources(nextResources);
      setIsLoadingResources(false);
    });

    const unsubscribeRules = subscribeToIncidentTypeRules((nextRules) => {
      setIncidentRules(nextRules);
    });

    const unsubscribeIncidents = subscribeToIncidents((items) => {
      setRecentIncidents(items);
    }, 100);

    const unsubscribeEmergencyReports = subscribeToEmergencyReports(
      (reports) => {
        setAppEmergencyReports(
          reports
            .filter((report) => report.status !== "done" && report.status !== "resolved")
        );
      },
      { limitCount: 100 },
    );

    return () => {
      unsubscribeResources();
      unsubscribeRules();
      unsubscribeIncidents();
      unsubscribeEmergencyReports();
    };
  }, [user]);

  useEffect(() => {
    setSelectedResourceIds([]);
  }, [formState.incidentSubtypeId]);

  useEffect(() => {
    setSelectedExistingResourceIds([]);
  }, [selectedQueueItem?.id]);

  useEffect(() => {
    const selectedId = selectedQueueItem?.id;
    if (!selectedId || !selectedQueueItem) return;

    if (selectedQueueItem.channel === "emergency_report") {
      const fresh = appEmergencyReports.find((report) => report.id === selectedId);
      if (!fresh) return;
      const prevReport = selectedQueueItem.rawEmergencyReport;
      if (prevReport && emergencyReportSyncKey(fresh) === emergencyReportSyncKey(prevReport)) {
        return;
      }
      setSelectedQueueItem((prev) =>
        prev && prev.id === selectedId
          ? refreshQueueItemFromEmergencyReport(prev, fresh)
          : prev,
      );
      return;
    }

    const incidentId = selectedQueueItem.rawIncident?.id;
    if (!incidentId) return;
    const freshIncident = recentIncidents.find((incident) => incident.id === incidentId);
    if (!freshIncident) return;
    const prevIncident = selectedQueueItem.rawIncident;
    if (
      prevIncident?.status === freshIncident.status &&
      toMillis(prevIncident?.updatedAt) === toMillis(freshIncident.updatedAt)
    ) {
      return;
    }
    setSelectedQueueItem((prev) =>
      prev?.rawIncident?.id === incidentId
        ? toQueueItemFromIncident(freshIncident)
        : prev,
    );
  }, [
    appEmergencyReports,
    recentIncidents,
    selectedQueueItem?.id,
    selectedQueueItem?.channel,
  ]);

  const matchingResources = useMemo(() => {
    if (!selectedRule) {
      return [];
    }

    return sortResourcesByName(
      resources.filter((resource) =>
        getIncidentResourceMatch(resource, selectedRule),
      ),
    );
  }, [resources, selectedRule]);

  const selectedResources = useMemo(
    () =>
      matchingResources.filter(
        (resource) => resource.id && selectedResourceIds.includes(resource.id),
      ),
    [matchingResources, selectedResourceIds],
  );

  const selectedExistingIncident = selectedQueueItem?.rawIncident || null;
  const selectedExistingRule = useMemo<IncidentTypeRule | null>(
    () =>
      selectedExistingIncident
        ? incidentRules.find((rule) => rule.id === selectedExistingIncident.incidentSubtypeId) || null
        : null,
    [incidentRules, selectedExistingIncident],
  );

  const matchingResourcesForExistingIncident = useMemo(() => {
    if (!selectedExistingRule) {
      return [];
    }

    return sortResourcesByName(
      resources.filter((resource) =>
        getIncidentResourceMatch(resource, selectedExistingRule),
      ),
    );
  }, [resources, selectedExistingRule]);

  const activeIncidentCount = useMemo(
    () =>
      recentIncidents.filter((incident) => incident.resolutionStatus === "open")
        .length,
    [recentIncidents],
  );

  const appQueueItems = useMemo(
    () =>
      appEmergencyReports
        .filter((report) => report.status !== "done" && report.status !== "resolved" && !report.primaryReportId)
        .map(toQueueItemFromEmergency)
        .sort((left, right) => {
          const rank = comparePriority(
            normalizePriority(left.priority),
            normalizePriority(right.priority)
          );
          if (rank !== 0) return rank;
          return toMillis(right.createdAt) - toMillis(left.createdAt);
        }),
    [appEmergencyReports],
  );

  const smsCallQueueItems = useMemo(
    () =>
      recentIncidents
        .filter((incident) => smsCallSources.includes(incident.source))
        .map(toQueueItemFromIncident),
    [recentIncidents],
  );

  const manualQueueItems = useMemo(
    () =>
      recentIncidents
        .filter((incident) => manualEntrySources.includes(incident.source))
        .map(toQueueItemFromIncident),
    [recentIncidents],
  );

  const totalQueueCount = useMemo(() => 
    appQueueItems.length + smsCallQueueItems.length + manualQueueItems.length,
    [appQueueItems, smsCallQueueItems, manualQueueItems]
  );

  const awaitingResourcesCount = useMemo(() => 
    recentIncidents.filter(i => i.status === "awaiting_resources").length,
    [recentIncidents]
  );

  const unassignedCount = useMemo(() => 
    appEmergencyReports.filter(r => !r.viewedByName).length,
    [appEmergencyReports]
  );

  const hasIncidentTypeCatalog = incidentRules.length > 0;

  const groupedRecentIncidents = useMemo(
    () => [
      {
        id: "app",
        title: "From App",
        description: "Incidents submitted through the system app.",
        incidents: appQueueItems,
      },
      {
        id: "sms-call",
        title: "From SMS or Call",
        description: "Incidents received through SMS and phone calls.",
        incidents: smsCallQueueItems,
      },
      {
        id: "manual",
        title: "Manual Entry",
        description:
          "Incidents encoded manually, including walk-in and radio reports.",
        incidents: manualQueueItems,
      },
    ],
    [appQueueItems, manualQueueItems, smsCallQueueItems],
  );

  const duplicateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const timeLimitMinutes = 30;
    const distanceLimitMeters = 150;

    const getReportTime = (r: EmergencyReport) => {
      return r.createdAt instanceof Date 
        ? r.createdAt.getTime() 
        : (r.createdAt as any)?.toDate?.()?.getTime() || Date.now();
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    appEmergencyReports.forEach((report) => {
      if (!report.id || !report.latitude || !report.longitude || report.incidentId || report.primaryReportId) {
        return;
      }

      const reportTime = getReportTime(report);

      const duplicates = appEmergencyReports.filter((other) => {
        if (other.id === report.id) return false;
        if (other.incidentId) return false;
        if (other.primaryReportId && other.primaryReportId !== report.id) return false;
        if (other.incidentType !== report.incidentType) return false;
        if (!other.latitude || !other.longitude) return false;

        const dist = calculateDistance(report.latitude!, report.longitude!, other.latitude, other.longitude);
        const otherTime = getReportTime(other);
        const timeDiff = Math.abs(reportTime - otherTime) / (1000 * 60);

        return dist <= distanceLimitMeters && timeDiff <= timeLimitMinutes;
      });

      if (duplicates.length > 0) {
        counts[report.id] = duplicates.length;
      }
    });

    return counts;
  }, [appEmergencyReports]);

  const filteredQueueItems = useMemo(() => {
    let items: IntakeQueueItem[] = [];
    if (activeTab === "all") items = [...appQueueItems, ...smsCallQueueItems, ...manualQueueItems];
    else if (activeTab === "app") items = appQueueItems;
    else if (activeTab === "sms") items = smsCallQueueItems;
    else if (activeTab === "manual") items = manualQueueItems;

    items.sort((a, b) => {
      const rank = comparePriority(
        normalizePriority(a.priority),
        normalizePriority(b.priority)
      );
      if (rank !== 0) return rank;
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return items.filter(val => 
        val.referenceNumber.toLowerCase().includes(q) || 
        val.incidentSubtypeLabel.toLowerCase().includes(q) ||
        val.locationText.toLowerCase().includes(q)
      );
    }
    return items;
  }, [activeTab, appQueueItems, smsCallQueueItems, manualQueueItems, searchQuery]);

  const currentDispatcherLabel = useMemo(
    () => user?.displayName || user?.email || user?.uid || "Dispatcher",
    [user],
  );

  const handleFieldChange = (field: keyof IncidentFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleLocationPinChange = (latitude: number, longitude: number) => {
    const detectedQuadrant = detectQuadrantFromCoordinate(
      latitude,
      longitude,
      barangayGeojson,
    );

    setFormState((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      quadrant: detectedQuadrant,
    }));
  };

  const handleLocationPinClear = () => {
    setFormState((current) => ({
      ...current,
      latitude: "",
      longitude: "",
      quadrant: "",
    }));
  };

  const handleOpenQueueItem = async (item: IntakeQueueItem) => {
    if (item.channel !== "emergency_report" || !item.rawEmergencyReport?.id) {
      return;
    }

    const report = item.rawEmergencyReport;
    if (report.alertAcknowledged || report.acknowledgedBy) {
      return;
    }

    try {
      const updated = await acknowledgeReport(
        report.id!,
        currentDispatcherLabel,
      );
      if (!updated?.id) return;
      setSelectedQueueItem((prev) =>
        prev && prev.id === updated.id
          ? refreshQueueItemFromEmergencyReport(prev, updated)
          : prev,
      );
    } catch (error: any) {
      console.error("Failed to acknowledge report:", error);
    }
  };

  const handleAcknowledgeSelectedAlert = async () => {
    const report = selectedQueueItem?.rawEmergencyReport;
    if (!report?.id) return;

    try {
      const updated = await acknowledgeReport(report.id, currentDispatcherLabel);
      if (!updated?.id) return;
      setSelectedQueueItem((prev) =>
        prev && prev.id === updated.id
          ? refreshQueueItemFromEmergencyReport(prev, updated)
          : prev,
      );
    } catch (error: any) {
      console.error("Failed to acknowledge report:", error);
      setPageError(error.message || "Failed to acknowledge alert.");
    }
  };

  const handlePriorityOverride = async (
    reportId: string,
    priority: IncidentPriority
  ) => {
    try {
      const updated = await updateEmergencyPriority(reportId, priority);
      if (!updated?.id) return;
      setSelectedQueueItem((prev) =>
        prev?.rawEmergencyReport?.id === reportId
          ? ({
              ...prev,
              priority: normalizePriority(updated.priority),
              rawEmergencyReport: updated,
            } as IntakeQueueItem)
          : prev
      );
    } catch (error: any) {
      console.error("Failed to update priority:", error);
    }
  };

  const handleRespondToAppReport = async (
    report: EmergencyReport,
    responder: {
      uid: string;
      label: string;
      agency: DispatcherRole;
      suggestedAgency: DispatcherRole | null;
    },
  ) => {
    if (!report.id) return;

    try {
      // Find matching incident subtype rule to inherit correct taxonomy, category, and priority
      const matchingRule = incidentRules.find(
        (rule) =>
          rule.id === report.incidentType ||
          rule.category === report.incidentType ||
          rule.label.toLowerCase().includes(report.incidentType.toLowerCase())
      );

      const subtypeId = matchingRule?.id || "other-assistance";
      const subtypeLabel = matchingRule?.label || "Request for Assistance";
      const priority = matchingRule?.priority || report.priority || "medium";

      // Elevate civilian report to master INC incident atomically
      const incident = await elevateEmergencyToIncident(report.id, {
        priority: priority as any,
        teamOnDuty: "Whiskey", // Default test operational dispatch team
        incidentSubtypeId: subtypeId,
        incidentSubtypeLabel: subtypeLabel,
        assignedResponderId: responder.uid,
        responderName: responder.label,
        assignedAgency: responder.agency,
      });

      // Update the local queue item immediately for smooth real-time visual feedback
      const updatedReport: EmergencyReport = {
        ...report,
        incidentId: incident.id!,
        status: "active",
        assignedResponderId: responder.uid,
        responder: responder.label,
        assignedAgency: responder.agency,
        updatedAt: Timestamp.now(),
      };

      setSelectedQueueItem((prev) =>
        prev && prev.id === report.id
          ? refreshQueueItemFromEmergencyReport(prev, updatedReport)
          : prev,
      );

      setPageSuccess(
        `Report APP-${report.id.slice(-6).toUpperCase()} elevated to master incident ${incident.referenceNumber} and assigned to ${responder.label}.`,
      );
    
      setTimeout(() => {
        router.push(`/incidents?id=${incident.id}`);
      }, 1500);
} catch (error: any) {
      setPageError(error.message || "Failed to assign and elevate report.");
    }
  };

  const handleRespondStartForAppReport = async (report: EmergencyReport) => {
    if (!report.id) return;

    try {
      const updated = await requestEmergencyAdditionalDetails(report.id);
      setSelectedQueueItem((prev) =>
        prev && prev.id === report.id
          ? refreshQueueItemFromEmergencyReport(prev, updated)
          : prev,
      );
      setPageSuccess(
        `Report ${report.id.slice(-6).toUpperCase()} is now waiting for additional civilian details.`,
      );
    } catch (error: any) {
      setPageError(error.message || "Failed to request additional details.");
    }
  };

  const handleRejectAppReport = async (report: EmergencyReport) => {
    setPageSuccess(`Reject action for ${report.id?.slice(-6).toUpperCase() || "report"} is not wired yet.`);
  };

  const handleMoveAppReportToHistory = async (report: EmergencyReport) => {
    if (!report.id) return;

    try {
      const updated = await moveEmergencyReportToHistory(report.id);
      setSelectedQueueItem(null);
      setPageSuccess(
        `Report ${report.id.slice(-6).toUpperCase()} was moved to history.`,
      );
    } catch (error: any) {
      setPageError(error.message || "Failed to move report to history.");
    }
  };

  const handleLinkToIncident = async (reportId: string, incidentId: string) => {
    try {
      await associateReportsWithIncident(incidentId, [reportId]);
      
      // Update local state instantly
      setPageSuccess("Successfully grouped and linked report to active incident.");
      
      // Update selected queue item in real-time so that UI status updates
      setSelectedQueueItem((prev) => {
        if (prev && prev.id === reportId && prev.rawEmergencyReport) {
          return refreshQueueItemFromEmergencyReport(prev, {
            ...prev.rawEmergencyReport,
            incidentId,
            status: "linked",
          });
        }
        return prev;
      });
    } catch (error: any) {
      setPageError(error.message || "Failed to link report to incident.");
    }
  };

  const handleUnlinkFromIncident = async (reportId: string, incidentId: string) => {
    try {
      await disassociateReportFromIncident(incidentId, reportId);
      
      // Update local state instantly
      setPageSuccess("Successfully unlinked civilian report from master incident.");
      
      // Update selected queue item in real-time
      setSelectedQueueItem((prev) => {
        if (prev && prev.id === reportId && prev.rawEmergencyReport) {
          return refreshQueueItemFromEmergencyReport(prev, {
            ...prev.rawEmergencyReport,
            incidentId: null,
            status: "pending",
          });
        }
        return prev;
      });
    } catch (error: any) {
      setPageError(error.message || "Failed to unlink report from incident.");
    }
  };

  const handleLinkReportToReport = async (primaryReportId: string, secondaryReportId: string) => {
    try {
      await linkReportToReport(primaryReportId, secondaryReportId);
      setPageSuccess("Reports grouped successfully. They now share the same incident status.");
    } catch (error: any) {
      setPageError(error.message || "Failed to group reports.");
    }
  };

  const handleUnlinkReportFromReport = async (secondaryReportId: string) => {
    try {
      await unlinkReportFromReport(secondaryReportId);
      setPageSuccess("Report ungrouped and reset to pending.");
    } catch (error: any) {
      setPageError(error.message || "Failed to ungroup report.");
    }
  };

  const handleLinkAllReports = async (primaryReportId: string, secondaryReportIds: string[]) => {
    try {
      await Promise.all(secondaryReportIds.map(secId => linkReportToReport(primaryReportId, secId)));
      setPageSuccess(`Successfully grouped ${secondaryReportIds.length} duplicate civilian reports.`);
    } catch (error: any) {
      setPageError(error.message || "Failed to group some reports.");
    }
  };

  const openIncidentDatePicker = () => {
    const input = incidentDateInputRef.current;
    if (!input) return;
    input.focus();
    (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
  };

  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResourceIds((current) =>
      current.includes(resourceId)
        ? current.filter((value) => value !== resourceId)
        : [...current, resourceId],
    );
  };

  const toggleExistingResourceSelection = (resourceId: string) => {
    setSelectedExistingResourceIds((current) =>
      current.includes(resourceId)
        ? current.filter((value) => value !== resourceId)
        : [...current, resourceId],
    );
  };

  const resetForm = () => {
    const now = new Date();
    setFormState({
      ...emptyForm,
      incidentDate: getPhilippineDateString(now),
      incidentTime: getPhilippineTimeString(now),
    });
    setSelectedResourceIds([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRule) {
      setPageError(
        hasIncidentTypeCatalog
          ? "Select an incident subtype before saving."
          : "Incident type catalog is empty. Seed incidentTypeRules in Firestore first.",
      );
      return;
    }
    if (!formState.locationText.trim()) {
      setPageError("Incident location is required.");
      return;
    }
    if (
      selectedRule.requiresVehicularReason &&
      !formState.vehicularAccidentReason.trim()
    ) {
      setPageError("Vehicular incidents require an accident reason.");
      return;
    }

    if (!formState.teamOnDuty) {
      setPageError("Please select a Team on Duty before submitting.");
      return;
    }
    if (!formState.incidentDate) {
      setPageError("Incident date is required.");
      return;
    }
    const normalizedIncidentTime = normalizeIncidentTimeForInput(
      formState.incidentTime,
    );
    if (!normalizedIncidentTime) {
      setPageError("Incident time must be in format hh:mm AM/PM.");
      return;
    }

    setIsSubmitting(true);
    setPageError(null);
    setPageSuccess(null);

    const payload: CreateIncidentInput = {
      source: formState.source,
      incidentSubtypeId: formState.incidentSubtypeId,
      locationText: formState.locationText,
      landmark: formState.landmark,
      quadrant: formState.quadrant || null,
      latitude: toNumberOrNull(formState.latitude),
      longitude: toNumberOrNull(formState.longitude),
      callerName: formState.callerName,
      callerContact: formState.callerContact,
      description: formState.description,
      vehicularAccidentReason: formState.vehicularAccidentReason,
      notes: formState.notes,
      teamId: null,
      teamOnDuty: formState.teamOnDuty,
      incidentDate: formState.incidentDate,
      incidentTime: normalizedIncidentTime,
    };

    try {
      let incident: IncidentRecord | null = null;
      incident = await createIncident(payload);
      if (incident.id && selectedResourceIds.length > 0) {
        try {
          await dispatchIncidentResources(incident.id, selectedResourceIds);
        } catch (dispatchError) {
          await deleteIncident(incident.id).catch((rollbackError: unknown) => {
            console.error("Failed to roll back incident after dispatch error:", rollbackError);
          });
          throw dispatchError;
        }
      }

      setPageSuccess(
        selectedResourceIds.length > 0
          ? `Incident ${incident.referenceNumber} created and dispatched.`
          : `Incident ${incident.referenceNumber} created. No live resources were selected yet.`,
      );
      resetForm();
      setIsFormModalOpen(false);
    } catch (error: any) {
      setPageError(error.message || "Failed to save incident.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchExistingIncident = async () => {
    if (!selectedExistingIncident?.id) {
      return;
    }
    if (selectedExistingResourceIds.length === 0) {
      setPageError("Select at least one available resource for this incident.");
      return;
    }

    setIsUpdatingExistingIncident(true);
    setPageError(null);
    setPageSuccess(null);

    try {
      await dispatchIncidentResources(selectedExistingIncident.id, selectedExistingResourceIds);
      setPageSuccess(`${selectedExistingIncident.referenceNumber} dispatched successfully.`);
      setSelectedExistingResourceIds([]);
    } catch (error: any) {
      setPageError(error.message || "Failed to dispatch resources.");
    } finally {
      setIsUpdatingExistingIncident(false);
    }
  };

  const handleDeleteExistingIncident = async () => {
    if (!selectedExistingIncident?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${selectedExistingIncident.referenceNumber} from intake? This will also release any linked resources.`,
    );
    if (!confirmed) {
      return;
    }

    setIsUpdatingExistingIncident(true);
    setPageError(null);
    setPageSuccess(null);

    try {
      await deleteIncident(selectedExistingIncident.id);
      setPageSuccess(`${selectedExistingIncident.referenceNumber} removed from intake.`);
      setSelectedQueueItem(null);
      setSelectedExistingResourceIds([]);
    } catch (error: any) {
      setPageError(error.message || "Failed to remove incident.");
    } finally {
      setIsUpdatingExistingIncident(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-full">
        <CommandBar 
          pageName="Intake" 
          description="Incident triage and emergency call management"
          statsCategory="Incidents"
          stats={[
            { label: 'Total In Queue', value: totalQueueCount, highlight: true },
            { label: 'Active', value: activeIncidentCount },
            { label: 'Awaiting Resources', value: awaitingResourcesCount },
            { label: 'Unassigned', value: unassignedCount }
          ]}
        />
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20 backdrop-blur-sm">
          {/* Tab Navigation & Search Bar */}
          <div className="px-3 pt-3 border-b border-slate-800 bg-slate-900/40 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-0">
              {[
                { id: "all", label: "All", icon: <Filter className="w-4 h-4" />, count: appQueueItems.length + smsCallQueueItems.length + manualQueueItems.length },
                { id: "app", label: "App", icon: <Smartphone className="w-4 h-4" />, count: appQueueItems.length },
                { id: "sms", label: "SMS/Call", icon: <MessageSquare className="w-4 h-4" />, count: smsCallQueueItems.length },
                { id: "manual", label: "Manual", icon: <Keyboard className="w-4 h-4" />, count: manualQueueItems.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    relative flex items-center gap-2 px-4 py-[14px] rounded-t-lg text-xs font-bold transition-[background-color,color,transform] duration-200 focus:outline-none focus-visible:outline-none
                    ${activeTab === tab.id 
                      ? "bg-slate-950 text-white border-t border-x border-slate-800 translate-y-[1px] z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.5)] \
                         before:content-[''] before:absolute before:bottom-0 before:-left-3 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_0_0,transparent_11px,#1e293b_11px,#1e293b_12.5px,#020617_12.5px)] \
                         after:content-[''] after:absolute after:bottom-0 after:-right-3 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_100%_0,transparent_11px,#1e293b_11px,#1e293b_12.5px,#020617_12.5px)]" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 border-t border-x border-transparent"}
                  `}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? "bg-primary-600 text-white" : "bg-slate-900 text-slate-500"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
 
            <div className="flex items-end gap-2 mb-3.5">
              <div className="relative flex-1 max-w-[240px] hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-4 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                />
              </div>
              <button 
                onClick={() => {
                  setPageError(null);
                  setPageSuccess(null);
                  setIsFormModalOpen(true);
                }}
                className="h-8 px-3 rounded-lg bg-primary-600 hover:bg-primary-500 text-[10px] font-black text-white transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NEW INCIDENT</span>
              </button>
            </div>
          </div>

          {/* Master-Detail Layout */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-950 to-transparent z-10 pointer-events-none"></div>
            {/* Left Panel: Incident List */}
            <div className={`${selectedQueueItem ? "hidden lg:flex" : "flex"} flex-col min-h-0 w-full lg:w-[400px] border-r border-slate-800 bg-slate-900/10`}>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredQueueItems.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
                    <Search className="w-10 h-10 text-slate-800 mb-3" />
                    <p className="text-slate-500 text-sm font-medium">No results found</p>
                    <p className="text-slate-600 text-xs mt-1">Try adjusting your filters or search query.</p>
                  </div>
                ) : (
                  filteredQueueItems.map((item) => (
                    <IntakeListItem 
                      key={item.id} 
                      item={item} 
                      isSelected={selectedQueueItem?.id === item.id}
                      duplicateCount={item.channel === "emergency_report" && item.id ? duplicateCounts[item.id] : undefined}
                      onClick={(item) => {
                        setSelectedQueueItem(item);
                        handleOpenQueueItem(item);
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right Panel: Detail View */}
            <div className={`${selectedQueueItem ? "flex" : "hidden lg:flex"} flex-1 flex-col min-h-0 p-4 lg:p-6 bg-slate-950/10 overflow-hidden`}>
              {(pageError || pageSuccess) && !isFormModalOpen ? (
                <div
                  className={`mb-3 shrink-0 rounded-lg px-4 py-3 text-sm ${
                    pageError
                      ? "border border-red-900/60 bg-red-950/40 text-red-200"
                      : "border border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
                  }`}
                >
                  {pageError || pageSuccess}
                </div>
              ) : null}

              {selectedExistingIncident?.status === "awaiting_resources" ? (
                <section className="mb-3 shrink-0 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                        Awaiting Dispatch
                      </h3>
                      <p className="mt-1 text-xs text-amber-100/70">
                        Add the required live resources, or remove this intake entry.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteExistingIncident}
                      disabled={isUpdatingExistingIncident}
                      className="h-8 rounded-lg border border-red-500/40 px-3 text-[10px] font-black uppercase tracking-wider text-red-200 transition-colors hover:border-red-400 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Available Matching Resources
                      </p>
                      <div className="mt-2 max-h-28 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70 p-2 custom-scrollbar">
                        {isLoadingResources ? (
                          <p className="text-xs text-slate-500">Loading resources...</p>
                        ) : matchingResourcesForExistingIncident.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No available resource currently matches this incident routing.
                          </p>
                        ) : (
                          <div className="grid gap-1.5 md:grid-cols-2">
                            {matchingResourcesForExistingIncident.map((resource) => (
                              <label
                                key={resource.id}
                                className="flex min-w-0 cursor-pointer items-center gap-2 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 hover:border-primary-500/50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedExistingResourceIds.includes(resource.id || "")}
                                  onChange={() => resource.id && toggleExistingResourceSelection(resource.id)}
                                  className="rounded border-slate-700 bg-slate-950 text-primary-500"
                                />
                                <span className="truncate text-[10px] font-medium text-slate-300">
                                  {resource.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDispatchExistingIncident}
                      disabled={
                        isUpdatingExistingIncident ||
                        selectedExistingResourceIds.length === 0 ||
                        matchingResourcesForExistingIncident.length === 0
                      }
                      className="h-9 rounded-lg bg-primary-600 px-4 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdatingExistingIncident ? "Updating..." : "Dispatch"}
                    </button>
                  </div>
                </section>
              ) : null}

              {selectedQueueItem?.channel === "emergency_report" &&
              selectedQueueItem.rawEmergencyReport?.id ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <IntakePriorityBadge priority={selectedQueueItem.priority} size="md" />
                    {selectedQueueItem.rawEmergencyReport.acknowledgedBy ? (
                      <span className="text-[10px] text-slate-400">
                        Ack by {selectedQueueItem.rawEmergencyReport.acknowledgedBy}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Override priority
                    </label>
                    <select
                      value={normalizePriority(selectedQueueItem.priority)}
                      onChange={(e) =>
                        handlePriorityOverride(
                          selectedQueueItem.rawEmergencyReport!.id!,
                          e.target.value as IncidentPriority
                        )
                      }
                      className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    {!selectedQueueItem.rawEmergencyReport.alertAcknowledged &&
                    !selectedQueueItem.rawEmergencyReport.acknowledgedBy ? (
                      <button
                        type="button"
                        onClick={() => void handleAcknowledgeSelectedAlert()}
                        className="h-8 rounded-lg bg-red-600 px-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-red-500"
                      >
                        Acknowledge Alert
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="min-h-0 flex-1">
                <IntakeDetailView
                  item={selectedQueueItem}
                  recentIncidents={recentIncidents}
                  allCivilianReports={appEmergencyReports}
                  onCloseDetail={() => setSelectedQueueItem(null)}
                  onRespondStart={handleRespondStartForAppReport}
                  onRespond={handleRespondToAppReport}
                  onReject={handleRejectAppReport}
                  onMoveToHistory={handleMoveAppReportToHistory}
                  onLinkToIncident={handleLinkToIncident}
                  onUnlinkFromIncident={handleUnlinkFromIncident}
                  onLinkReportToReport={handleLinkReportToReport}
                  onUnlinkReportFromReport={handleUnlinkReportFromReport}
                  onLinkAllReports={handleLinkAllReports}
                />
              </div>
            </div>
          </div>
        </div>

        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              onClick={() => setIsFormModalOpen(false)}
              aria-hidden="true"
            />
            <form
              onSubmit={handleSubmit}
              className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 md:px-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100 md:text-xl">
                    Incident Intake Form
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Capture core details and dispatch with routing support.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
                >
                  Close
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4 md:px-6">
                <div className="space-y-4">
                  <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Basic Setup
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Subtype drives routing and live matching.
                    </p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="lg:col-span-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Incident Subtype
                        </label>
                        <select
                          value={formState.incidentSubtypeId}
                          onChange={(event) =>
                            handleFieldChange(
                              "incidentSubtypeId",
                              event.target.value,
                            )
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          disabled={!hasIncidentTypeCatalog}
                        >
                          <option value="">
                            {hasIncidentTypeCatalog ? "Select incident subtype" : "No incident types configured"}
                          </option>
                          {incidentRules.map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.label}
                            </option>
                          ))}
                        </select>
                        {!hasIncidentTypeCatalog ? (
                          <p className="mt-2 text-xs text-amber-300">
                            Populate the Firestore `incidentTypeRules` collection before creating incidents.
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Source
                        </label>
                        <select
                          value={formState.source}
                          onChange={(event) =>
                            handleFieldChange("source", event.target.value)
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {sourceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Team on Duty
                        </label>
                        <select
                          value={formState.teamOnDuty}
                          onChange={(event) =>
                            handleFieldChange("teamOnDuty", event.target.value)
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select team</option>
                          {teamOnDutyOptions.map((team) => (
                            <option key={team} value={team}>
                              {team}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="incident-date-display"
                          className="text-xs uppercase tracking-[0.2em] text-slate-500"
                        >
                          Incident Date
                        </label>
                        <div className="relative mt-1">
                          <input
                            id="incident-date-display"
                            type="text"
                            value={
                              formState.incidentDate
                                ? formatIncidentDateForDisplay(
                                    formState.incidentDate,
                                  )
                                : ""
                            }
                            placeholder="Select date"
                            readOnly
                            onClick={openIncidentDatePicker}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openIncidentDatePicker();
                              }
                            }}
                            className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <input
                            ref={incidentDateInputRef}
                            id="incident-date"
                            type="date"
                            value={formState.incidentDate}
                            onChange={(event) =>
                              handleFieldChange(
                                "incidentDate",
                                event.target.value,
                              )
                            }
                            tabIndex={-1}
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
                          />
                          <button
                            type="button"
                            onClick={openIncidentDatePicker}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                            aria-label="Open incident date picker"
                          >
                            <Calendar size={16} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="incident-time"
                          className="text-xs uppercase tracking-[0.2em] text-slate-500"
                        >
                          Incident Time
                        </label>
                        <input
                          id="incident-time"
                          type="text"
                          value={formState.incidentTime}
                          onChange={(event) =>
                            handleFieldChange(
                              "incidentTime",
                              event.target.value,
                            )
                          }
                          onBlur={() => {
                            const normalized = normalizeIncidentTimeForInput(
                              formState.incidentTime,
                            );
                            if (normalized) {
                              setFormState((current) => ({
                                ...current,
                                incidentTime: normalized,
                              }));
                            }
                          }}
                          placeholder="--:-- --"
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      {selectedRule?.requiresVehicularReason && (
                        <div className="lg:col-span-2">
                          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Vehicular Accident Reason
                          </label>
                          <input
                            value={formState.vehicularAccidentReason}
                            onChange={(event) =>
                              handleFieldChange(
                                "vehicularAccidentReason",
                                event.target.value,
                              )
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Reckless driving, brake failure, etc."
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Caller Information
                    </h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Caller Name
                        </label>
                        <input
                          value={formState.callerName}
                          onChange={(event) =>
                            handleFieldChange("callerName", event.target.value)
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Reporting party"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Caller Contact
                        </label>
                        <input
                          value={formState.callerContact}
                          onChange={(event) =>
                            handleFieldChange(
                              "callerContact",
                              event.target.value,
                            )
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Mobile or callback detail"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Location Details
                    </h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-6">
                      <div className="md:col-span-4">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Incident Location
                        </label>
                        <input
                          value={formState.locationText}
                          onChange={(event) =>
                            handleFieldChange(
                              "locationText",
                              event.target.value,
                            )
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Street, sitio, establishment, or map description"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Landmark
                        </label>
                        <input
                          value={formState.landmark}
                          onChange={(event) =>
                            handleFieldChange("landmark", event.target.value)
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Nearest landmark"
                        />
                      </div>
                      <div className="md:col-span-6">
                        <IncidentLocationPicker
                          latitude={toNumberOrNull(formState.latitude)}
                          longitude={toNumberOrNull(formState.longitude)}
                          onChange={handleLocationPinChange}
                          onClear={handleLocationPinClear}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Quadrant
                        </label>
                        <select
                          value={formState.quadrant}
                          onChange={(event) =>
                            handleFieldChange("quadrant", event.target.value)
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Not set</option>
                          {OPERATIONAL_QUADRANTS.map((quadrant) => (
                            <option key={quadrant} value={quadrant}>
                              {QUADRANT_LABELS[quadrant]}
                            </option>
                          ))}
                        </select>
                        {formState.latitude && formState.longitude ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {formState.quadrant
                              ? "Auto-detected from pinned map location."
                              : "No matching quadrant found for this pin."}
                          </p>
                        ) : null}
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Latitude
                        </label>
                        <input
                          value={formState.latitude}
                          onChange={(event) =>
                            handleFieldChange("latitude", event.target.value)
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Longitude
                        </label>
                        <input
                          value={formState.longitude}
                          onChange={(event) =>
                            handleFieldChange("longitude", event.target.value)
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Incident Details
                    </h3>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Incident Description
                        </label>
                        <textarea
                          value={formState.description}
                          onChange={(event) =>
                            handleFieldChange("description", event.target.value)
                          }
                          rows={4}
                          className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Summarize situation, hazards, injuries, and immediate risks"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Command Center Notes
                        </label>
                        <textarea
                          value={formState.notes}
                          onChange={(event) =>
                            handleFieldChange("notes", event.target.value)
                          }
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Internal coordination notes and dispatch instructions"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Coordination Tools */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                      <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest mb-3">Routing Summary</h3>
                      {!selectedRule ? (
                        <p className="text-xs text-slate-500 italic">Select subtype to view routing.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-300">Agencies: <span className="text-primary-400 font-bold">{selectedRule.recommendedAgencies.join(", ")}</span></p>
                          <p className="text-xs text-slate-300">Priority: <span className="text-amber-400 uppercase font-black">{selectedRule.priority}</span></p>
                        </div>
                      )}
                    </section>
                    
                    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                       <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest mb-3">Live Dispatch</h3>
                       {isLoadingResources ? (
                         <div className="flex items-center gap-2 text-xs text-slate-500">
                           <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent animate-spin rounded-full"></div>
                           Loading resources...
                         </div>
                       ) : (
                         <div className="max-h-[120px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                            {matchingResources.map(r => (
                              <label key={r.id} className="flex items-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 cursor-pointer hover:border-primary-500/50">
                                <input 
                                  type="checkbox" 
                                  checked={selectedResourceIds.includes(r.id || "")}
                                  onChange={() => r.id && toggleResourceSelection(r.id)}
                                  className="rounded border-slate-700 bg-slate-950 text-primary-500"
                                />
                                <span className="text-[10px] font-medium text-slate-300 truncate">{r.name}</span>
                              </label>
                            ))}
                         </div>
                       )}
                    </section>
                  </div>

                  {(pageError || pageSuccess) && (
                    <div
                      className={`rounded-lg px-4 py-3 text-sm ${
                        pageError
                          ? "border border-red-900/60 bg-red-950/40 text-red-200"
                          : "border border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
                      }`}
                    >
                      {pageError || pageSuccess}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/95 px-5 py-4 md:px-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Saving Incident..."
                    : selectedResourceIds.length > 0
                      ? "Create and Dispatch"
                      : "Create Incident"}
                </button>
              </div>
            </form>
          </div>
        )}


      </div>
    </ProtectedRoute>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-full bg-slate-950">
        <CommandBar 
          pageName="Intake" 
          description="Loading intake data..." 
          statsCategory="Incidents"
          stats={[]}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    }>
      <IntakeContent />
    </Suspense>
  );
}
