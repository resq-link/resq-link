"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import CommandBar from "@/components/CommandBar";
import InlineLoader from "@/components/InlineLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useDispatcherData } from "@/contexts/DispatcherDataContext";
import { loadBarangayGeojson } from "@/lib/barangayGeojson";
import {
  assignDispatcherToEmergency,
  assignResponderToEmergency,
  createIncident,
  deleteIncident,
  dispatchIncidentResources,
  elevateEmergencyToIncident,
  getAgencyLabel,
  getIncidentResourceMatch,
  isIncidentResourceSuggested,
  getSuggestedAgenciesForEmergencyType,
  moveEmergencyReportToHistory,
  BARANGAY_QUADRANT_MAPPING,
  OPERATIONAL_QUADRANTS,
  QUADRANT_LABELS,
  requestEmergencyAdditionalDetails,
  rejectEmergencyReport,
  isLiveEmergencyReport,
  isLiveIncident,
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
  getAssignedTeamName,
  reassignIncidentTeam,
  comparePriority,
  normalizePriority,
  updateEmergencyPriority,
  type IncidentPriority,
  getCivilianEmergencyTypeLabel,
} from "@packages/firebase";
import { usePriorityAlerts } from "@/contexts/PriorityAlertContext";
import { useOperationalTeams } from "@/contexts/OperationalTeamContext";
import CurrentTeamOnDutyChip from "@/components/operational/CurrentTeamOnDutyChip";
import IntakeSourceFilterTabs, {
  categorizeIntakeQueueItemSource,
  type IntakeSourceTab,
} from "@/components/operational/IntakeSourceFilterTabs";
import IntakeTeamGroupedList from "@/components/operational/IntakeTeamGroupedList";
import {
  IntakePriorityBadge,
  attachLinkedEmergencyReport,
  type IntakeQueueItem,
} from "@/components/IntakeListItem";
import { 
  Plus,
  ChevronRight, 
  Calendar 
} from "lucide-react";

const IntakeDetailView = dynamic(() => import("@/components/IntakeDetailView"), {
  ssr: false,
});

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

const SMS_CALL_SOURCES: IncidentSource[] = ["sms", "call"];

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
  teamOnDutyLabel: getAssignedTeamName(incident),
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
    incidentSubtypeLabel: getCivilianEmergencyTypeLabel(report.incidentType, report.typeProfile),
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
    report.description ?? "",
    report.typeProfile ?? "",
    JSON.stringify(report.fieldAssessment ?? {}),
    JSON.stringify(report.imageUrls ?? []),
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

const hasLocalSuggestedResource = (
  resources: ResourceRecord[],
  rule: IncidentTypeRule,
  incidentQuadrant?: OperationalQuadrant | null,
) =>
  Boolean(incidentQuadrant) &&
  resources.some(
    (resource) =>
      resource.quadrant === incidentQuadrant &&
      isIncidentResourceSuggested(resource, rule),
  );

const getResourceFallbackLabel = (
  resource: ResourceRecord,
  rule: IncidentTypeRule,
  incidentQuadrant?: OperationalQuadrant | null,
) => {
  if (!incidentQuadrant || resource.quadrant === incidentQuadrant) {
    return null;
  }

  return isIncidentResourceSuggested(resource, rule)
    ? `Nearby fallback${resource.quadrant ? `: ${QUADRANT_LABELS[resource.quadrant]}` : ""}`
    : null;
};

const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const radiusMeters = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return radiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getResourceDistanceMeters = (
  resource: ResourceRecord,
  incidentLatitude?: number | null,
  incidentLongitude?: number | null,
) => {
  const resourceLatitude = resource.currentLatitude ?? resource.stationLatitude;
  const resourceLongitude = resource.currentLongitude ?? resource.stationLongitude;
  if (
    incidentLatitude == null ||
    incidentLongitude == null ||
    resourceLatitude == null ||
    resourceLongitude == null
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return calculateDistanceMeters(
    incidentLatitude,
    incidentLongitude,
    resourceLatitude,
    resourceLongitude,
  );
};

const sortResourcesByDispatchPriority = (
  resources: ResourceRecord[],
  rule: IncidentTypeRule,
  incidentQuadrant?: OperationalQuadrant | null,
  incidentLatitude?: number | null,
  incidentLongitude?: number | null,
) =>
  [...resources].sort((left, right) => {
    const leftSuggested = isIncidentResourceSuggested(left, rule);
    const rightSuggested = isIncidentResourceSuggested(right, rule);
    const leftLocal = Boolean(incidentQuadrant && left.quadrant === incidentQuadrant);
    const rightLocal = Boolean(incidentQuadrant && right.quadrant === incidentQuadrant);
    const rank = (suggested: boolean, local: boolean) => {
      if (suggested && local) return 0;
      if (suggested) return 1;
      if (local) return 2;
      return 3;
    };

    const leftRank = rank(leftSuggested, leftLocal);
    const rightRank = rank(rightSuggested, rightLocal);
    if (leftRank !== rightRank) return leftRank - rightRank;

    const leftDistance = getResourceDistanceMeters(left, incidentLatitude, incidentLongitude);
    const rightDistance = getResourceDistanceMeters(right, incidentLatitude, incidentLongitude);
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;

    return left.name.localeCompare(right.name);
  });

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
  const { teams, requireCurrentTeamId } = useOperationalTeams();
  const {
    emergencyReports,
    incidents,
    resources,
    incidentTypeRules: incidentRules,
    resourcesLoading: isLoadingResources,
  } = useDispatcherData();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [formState, setFormState] = useState<IncidentFormState>(() => {
    const now = new Date();
    return {
      ...emptyForm,
      incidentDate: getPhilippineDateString(now),
      incidentTime: getPhilippineTimeString(now),
    };
  });

  const appEmergencyReports = useMemo(
    () => emergencyReports.filter(isLiveEmergencyReport),
    [emergencyReports],
  );
  const recentIncidents = incidents;
  const [barangayGeojson, setBarangayGeojson] =
    useState<BarangayFeatureCollection | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [selectedExistingResourceIds, setSelectedExistingResourceIds] = useState<string[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<IntakeQueueItem | null>(null);
  const [activeSourceTab, setActiveSourceTab] = useState<IntakeSourceTab>("all");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingExistingIncident, setIsUpdatingExistingIncident] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [rejectingReport, setRejectingReport] = useState<EmergencyReport | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const incidentDateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchParams.get("source") !== "sms") {
      return;
    }

    const callerContact = searchParams.get("callerContact") ?? "";
    const description = searchParams.get("description") ?? "";
    setFormState((current) => ({
      ...current,
      source: "sms",
      callerContact: callerContact || current.callerContact,
      description: description || current.description,
      notes: searchParams.get("smsThreadId")
        ? `SMS intake thread: ${searchParams.get("smsThreadId")}`
        : current.notes,
    }));
    setIsFormModalOpen(true);
  }, [searchParams]);

  const selectedRule = useMemo<IncidentTypeRule | null>(
    () =>
      incidentRules.find((rule) => rule.id === formState.incidentSubtypeId) ||
      null,
    [formState.incidentSubtypeId, incidentRules],
  );

  useEffect(() => {
    let cancelled = false;
    loadBarangayGeojson()
      .then((data) => {
        if (!cancelled) {
          setBarangayGeojson((data as BarangayFeatureCollection | null) ?? null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

    return sortResourcesByDispatchPriority(
      resources.filter((resource) =>
        getIncidentResourceMatch(resource, selectedRule),
      ),
      selectedRule,
      formState.quadrant || null,
      toNumberOrNull(formState.latitude),
      toNumberOrNull(formState.longitude),
    );
  }, [formState.latitude, formState.longitude, formState.quadrant, resources, selectedRule]);

  const hasLocalSuggestedResourceForNewIncident = useMemo(
    () =>
      selectedRule
        ? hasLocalSuggestedResource(
            matchingResources,
            selectedRule,
            formState.quadrant || null,
          )
        : false,
    [formState.quadrant, matchingResources, selectedRule],
  );

  const hasNearbySuggestedFallbackForNewIncident = useMemo(
    () =>
      Boolean(
        selectedRule &&
          formState.quadrant &&
          !hasLocalSuggestedResourceForNewIncident &&
          matchingResources.some((resource) =>
            Boolean(getResourceFallbackLabel(resource, selectedRule, formState.quadrant || null)),
          ),
      ),
    [
      formState.quadrant,
      hasLocalSuggestedResourceForNewIncident,
      matchingResources,
      selectedRule,
    ],
  );

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

    return sortResourcesByDispatchPriority(
      resources.filter((resource) =>
        getIncidentResourceMatch(resource, selectedExistingRule),
      ),
      selectedExistingRule,
      selectedExistingIncident?.quadrant || null,
      selectedExistingIncident?.latitude ?? null,
      selectedExistingIncident?.longitude ?? null,
    );
  }, [resources, selectedExistingIncident, selectedExistingRule]);

  const hasLocalSuggestedResourceForExistingIncident = useMemo(
    () =>
      selectedExistingRule
        ? hasLocalSuggestedResource(
            matchingResourcesForExistingIncident,
            selectedExistingRule,
            selectedExistingIncident?.quadrant || null,
          )
        : false,
    [
      matchingResourcesForExistingIncident,
      selectedExistingIncident?.quadrant,
      selectedExistingRule,
    ],
  );

  const hasNearbySuggestedFallbackForExistingIncident = useMemo(
    () =>
      Boolean(
        selectedExistingRule &&
          selectedExistingIncident?.quadrant &&
          !hasLocalSuggestedResourceForExistingIncident &&
          matchingResourcesForExistingIncident.some((resource) =>
            Boolean(
              getResourceFallbackLabel(
                resource,
                selectedExistingRule,
                selectedExistingIncident.quadrant,
              ),
            ),
          ),
      ),
    [
      hasLocalSuggestedResourceForExistingIncident,
      matchingResourcesForExistingIncident,
      selectedExistingIncident?.quadrant,
      selectedExistingRule,
    ],
  );

  const appQueueItems = useMemo(
    () =>
      appEmergencyReports
        .filter((report) => isLiveEmergencyReport(report) && !report.primaryReportId)
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

  const activeOperationalItems = useMemo(() => {
    const items: IntakeQueueItem[] = [];

    appQueueItems
      .filter((item) => !item.rawEmergencyReport?.incidentId)
      .forEach((item) => items.push(item));

    recentIncidents
      .filter(isLiveIncident)
      .map(toQueueItemFromIncident)
      .map((item) => attachLinkedEmergencyReport(item, appEmergencyReports))
      .forEach((item) => items.push(item));

    return items;
  }, [appQueueItems, recentIncidents]);

  const awaitingResourcesCount = useMemo(() => 
    recentIncidents.filter(
      (i) => isLiveIncident(i) && (i.status === "awaiting_resources" || i.status === "liaison_pending")
    ).length,
    [recentIncidents]
  );

  const unassignedCount = useMemo(() => 
    appEmergencyReports.filter(r => !r.viewedByName).length,
    [appEmergencyReports]
  );

  const activeCount = useMemo(
    () =>
      activeOperationalItems.filter((item) => {
        if (item.channel === "emergency_report") return true;
        const status = item.rawIncident?.status;
        return status !== "awaiting_resources" && status !== "liaison_pending";
      }).length,
    [activeOperationalItems],
  );

  const totalInQueueCount = activeOperationalItems.length;

  const sourceTabCounts = useMemo(
    () => ({
      all: activeOperationalItems.length,
      app: activeOperationalItems.filter(
        (item) => categorizeIntakeQueueItemSource(item, SMS_CALL_SOURCES) === "app",
      ).length,
      sms: activeOperationalItems.filter(
        (item) => categorizeIntakeQueueItemSource(item, SMS_CALL_SOURCES) === "sms",
      ).length,
      manual: activeOperationalItems.filter(
        (item) => categorizeIntakeQueueItemSource(item, SMS_CALL_SOURCES) === "manual",
      ).length,
    }),
    [activeOperationalItems],
  );

  const filteredOperationalItems = useMemo(() => {
    if (activeSourceTab === "all") return activeOperationalItems;
    return activeOperationalItems.filter(
      (item) => categorizeIntakeQueueItemSource(item, SMS_CALL_SOURCES) === activeSourceTab,
    );
  }, [activeOperationalItems, activeSourceTab]);

  useEffect(() => {
    if (!selectedQueueItem) return;
    const stillVisible = filteredOperationalItems.some(
      (item) =>
        item.id === selectedQueueItem.id && item.channel === selectedQueueItem.channel,
    );
    if (!stillVisible) {
      setSelectedQueueItem(null);
    }
  }, [filteredOperationalItems, selectedQueueItem]);

  const hasIncidentTypeCatalog = incidentRules.length > 0;

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
      assignedTeamId?: string;
    },
  ) => {
    if (!report.id) return;

    let assignedTeamId: string;
    try {
      assignedTeamId = requireCurrentTeamId();
    } catch (error: any) {
      setPageError(error.message || "Set the Current Team on Duty before elevating.");
      return;
    }

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
        assignedTeamId,
        incidentSubtypeId: subtypeId,
        incidentSubtypeLabel: subtypeLabel,
        assignedResponderId: responder.uid,
        responderName: responder.label,
        assignedAgency: responder.agency,
        incidentDate: formState.incidentDate || getPhilippineDateString(new Date()),
        incidentTime: formState.incidentTime || getPhilippineTimeString(new Date()),
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
        router.push(`/command-center/incidents?id=${incident.id}`);
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

  const handleRejectAppReport = (report: EmergencyReport) => {
    setRejectReason("");
    setRejectingReport(report);
  };

  const handleConfirmRejectAppReport = async () => {
    if (!rejectingReport?.id) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setPageError("A rejection reason is required.");
      return;
    }

    setIsRejecting(true);
    setPageError(null);
    try {
      await rejectEmergencyReport(rejectingReport.id, reason);
      setSelectedQueueItem(null);
      setRejectingReport(null);
      setRejectReason("");
      setPageSuccess(
        `Report ${rejectingReport.id.slice(-6).toUpperCase()} was rejected and removed from Intake.`,
      );
    } catch (error: any) {
      setPageError(error.message || "Failed to reject report.");
    } finally {
      setIsRejecting(false);
    }
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

    let assignedTeamId: string;
    try {
      assignedTeamId = requireCurrentTeamId();
    } catch (error: any) {
      setPageError(error.message || "Set the Current Team on Duty before creating incidents.");
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
      assignedTeamId,
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
    <div className="flex flex-col h-full">
        <CommandBar
          pageName="Incident Intake"
          description="Live emergency operations command center"
          statsCategory="Incidents"
          stats={[
            { label: "Total In Queue", value: totalInQueueCount, highlight: true },
            { label: "Active", value: activeCount },
            { label: "Awaiting Resources", value: awaitingResourcesCount },
            { label: "Unassigned", value: unassignedCount },
          ]}
        />
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-slate-800 bg-slate-900/40 px-3 pt-2">
          <IntakeSourceFilterTabs
            activeTab={activeSourceTab}
            counts={sourceTabCounts}
            onChange={setActiveSourceTab}
            variant="toolbar"
          />
          <div className="mb-2 flex shrink-0 items-center gap-2">
            <CurrentTeamOnDutyChip variant="header" />
            <button
              type="button"
              onClick={() => {
                setPageError(null);
                setPageSuccess(null);
                setIsFormModalOpen(true);
              }}
              className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-primary-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Incident</span>
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20 backdrop-blur-sm">
          {/* Master-Detail Layout */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-950 to-transparent z-10 pointer-events-none"></div>
            {/* Left Panel: Incident queue */}
            <div className={`${selectedQueueItem ? "hidden lg:flex" : "flex"} flex-col min-h-0 w-full lg:w-[400px] border-r border-slate-800 bg-slate-900/10`}>
              <div className="flex-1 overflow-y-auto px-3 pt-2 pb-3 custom-scrollbar">
                <IntakeTeamGroupedList
                  items={filteredOperationalItems}
                  teams={teams}
                  recentIncidents={recentIncidents}
                  selectedItemId={selectedQueueItem?.id ?? null}
                  duplicateCounts={duplicateCounts}
                  onSelect={setSelectedQueueItem}
                />
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

              {selectedExistingIncident?.status === "awaiting_resources" || selectedExistingIncident?.status === "liaison_pending" ? (
                <section className="mb-3 shrink-0 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                        Awaiting Dispatch
                      </h3>
                      <p className="mt-1 text-xs text-amber-100/70">
                        Select any available live resource. Suggested resources are listed first.
                      </p>
                      {hasNearbySuggestedFallbackForExistingIncident ? (
                        <p className="mt-1 text-xs font-semibold text-amber-100">
                          No suggested resource is available in {selectedExistingIncident?.quadrant ? QUADRANT_LABELS[selectedExistingIncident.quadrant] : "this quadrant"}; nearby quadrant fallback options are available.
                        </p>
                      ) : null}
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
                        Available Resources
                      </p>
                      <div className="mt-2 max-h-28 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70 p-2 custom-scrollbar">
                        {isLoadingResources ? (
                          <p className="text-xs text-slate-500">Loading resources...</p>
                        ) : matchingResourcesForExistingIncident.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No available resource is currently ready for dispatch.
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
                                {selectedExistingRule ? (
                                  getResourceFallbackLabel(resource, selectedExistingRule, selectedExistingIncident?.quadrant || null) ? (
                                    <span className="ml-auto shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-200">
                                      {getResourceFallbackLabel(resource, selectedExistingRule, selectedExistingIncident?.quadrant || null)}
                                    </span>
                                  ) : isIncidentResourceSuggested(resource, selectedExistingRule) ? (
                                    <span className="ml-auto shrink-0 rounded border border-primary-500/30 bg-primary-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-200">
                                      Suggested
                                    </span>
                                  ) : null
                                ) : null}
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

        {rejectingReport ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              onClick={() => {
                if (!isRejecting) {
                  setRejectingReport(null);
                  setRejectReason("");
                }
              }}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/40">
              <h2 className="text-lg font-semibold text-slate-100">Reject civilian report?</h2>
              <p className="mt-2 text-sm text-slate-400">
                Report{" "}
                <span className="font-mono font-semibold text-slate-200">
                  {rejectingReport.id?.slice(-6).toUpperCase()}
                </span>{" "}
                will leave the Intake queue. The civilian will see your reason.
              </p>
              <label className="mt-4 block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Reason
                </span>
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  disabled={isRejecting}
                  className="min-h-[104px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  placeholder="e.g. Duplicate report, false alarm, insufficient information..."
                />
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={() => {
                    setRejectingReport(null);
                    setRejectReason("");
                  }}
                  className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRejecting || !rejectReason.trim()}
                  onClick={() => void handleConfirmRejectAppReport()}
                  className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {isRejecting ? "Rejecting..." : "Reject Report"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
                          <p className="text-xs text-slate-300">Suggested agencies: <span className="text-primary-400 font-bold">{selectedRule.recommendedAgencies.join(", ")}</span></p>
                          <p className="text-xs text-slate-300">Priority: <span className="text-amber-400 uppercase font-black">{selectedRule.priority}</span></p>
                        </div>
                      )}
                    </section>
                    
                    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                       <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest mb-3">Live Dispatch</h3>
                       {hasNearbySuggestedFallbackForNewIncident ? (
                         <p className="mb-2 text-xs font-semibold text-amber-200">
                           No suggested resource is available in {formState.quadrant ? QUADRANT_LABELS[formState.quadrant] : "this quadrant"}; nearby quadrant fallback options are shown.
                         </p>
                       ) : null}
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
                                <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-300">{r.name}</span>
                                {selectedRule ? (
                                  getResourceFallbackLabel(r, selectedRule, formState.quadrant || null) ? (
                                    <span className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-200">
                                      {getResourceFallbackLabel(r, selectedRule, formState.quadrant || null)}
                                    </span>
                                  ) : isIncidentResourceSuggested(r, selectedRule) ? (
                                    <span className="shrink-0 rounded border border-primary-500/30 bg-primary-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-200">
                                      Suggested
                                    </span>
                                  ) : null
                                ) : null}
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
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<InlineLoader label="Retrieving incident data..." />}>
      <IntakeContent />
    </Suspense>
  );
}
