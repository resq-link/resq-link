import { normalizeOperationalStatus } from "@packages/firebase";
import { getIncidentMeta, isActiveReport } from "@/features/history/constants";

export function normalizeHistoryReport(raw) {
  const createdAt =
    raw.createdAt instanceof Date
      ? raw.createdAt
      : raw.created_at
        ? new Date(raw.created_at)
        : new Date();

  const updatedAt =
    raw.updatedAt instanceof Date
      ? raw.updatedAt
      : raw.updated_at
        ? new Date(raw.updated_at)
        : null;

  const agencyLabel = raw.assignedAgency
    ? formatAgencyLabel(raw)
    : raw.assignedTeamName || null;

  return {
    id: raw.id,
    incidentType: raw.incidentType || raw.incident_type || "other_emergency",
    typeProfile: raw.typeProfile || raw.type_profile || raw.profile || null,
    locationText: raw.locationText || raw.location_text || "456 Elm Street, Springfield",
    destination:
      raw.destination ||
      raw.destination_text ||
      agencyLabel ||
      raw.hospital ||
      raw.safeZone ||
      "739 Main Street, Springfield",
    distance:
      raw.distance ||
      raw.distance_text ||
      (typeof raw.responseTimeSeconds === "number" && raw.responseTimeSeconds > 0
        ? `${Math.max(1, Math.round(raw.responseTimeSeconds / 60))}Km`
        : "12Km"),
    payment: raw.payment || raw.amount || raw.cost || "$12",
    status: raw.status || "pending",
    description: raw.description || null,
    createdAt,
    updatedAt,
    incidentId: raw.incidentId || raw.incident_id || null,
    assignedResponderId: raw.assignedResponderId || raw.assigned_responder_id || null,
    assignedAgency: raw.assignedAgency || raw.assigned_agency || null,
    suggestedAgency: raw.suggestedAgency || raw.suggested_agency || null,
    assignedTeamName: raw.assignedTeamName || raw.assigned_team_name || null,
    responseTimeSeconds:
      typeof raw.responseTimeSeconds === "number"
        ? raw.responseTimeSeconds
        : typeof raw.response_time_seconds === "number"
          ? raw.response_time_seconds
          : null,
    reportSource: raw.reportSource || raw.report_source || raw.source || null,
  };
}

export function groupReportsByActiveAndPast(reports) {
  const active = [];
  const past = [];

  reports.forEach((report) => {
    if (isActiveReport(report.status)) {
      active.push(report);
    } else {
      past.push(report);
    }
  });

  const sections = [];
  if (active.length > 0) {
    sections.push({
      title: "Active incidents",
      data: active.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    });
  }
  if (past.length > 0) {
    sections.push({
      title: "Past incidents",
      data: past.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    });
  }

  return sections;
}

export function getTimelineGroup(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "Earlier";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  if (d >= startOfWeek) return "This Week";
  return "Earlier";
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Earlier"];

export function groupReportsByTimeline(reports) {
  const buckets = {};
  GROUP_ORDER.forEach((g) => {
    buckets[g] = [];
  });

  reports.forEach((report) => {
    const group = getTimelineGroup(report.createdAt);
    buckets[group].push(report);
  });

  return GROUP_ORDER.filter((title) => buckets[title].length > 0).map((title) => ({
    title,
    data: buckets[title].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    ),
  }));
}

export function filterReports(reports, statusFilter, typeFilter) {
  return reports.filter((report) => {
    const normalized = normalizeOperationalStatus(report.status);

    if (statusFilter !== "all") {
      if (statusFilter === "active" && !isActiveReport(report.status)) {
        return false;
      }
      if (statusFilter !== "active" && normalized !== statusFilter) {
        return false;
      }
    }

    if (typeFilter !== "all" && report.incidentType !== typeFilter) {
      return false;
    }

    return true;
  });
}

export function searchReports(reports, query) {
  const q = query.trim().toLowerCase();
  if (!q) return reports;

  return reports.filter((report) => {
    const meta = getIncidentMeta(report.incidentType, report.typeProfile);
    const haystack = [
      meta.label,
      report.incidentType,
      report.locationText,
      report.id,
      report.incidentId,
      report.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function formatCardTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const group = getTimelineGroup(d);
  if (group === "Today") return `Today • ${time}`;
  if (group === "Yesterday") return `Yesterday • ${time}`;
  const datePart = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return `${datePart} • ${time}`;
}

const AGENCY_LABELS = {
  BFP: "Bureau of Fire Protection",
  PNP: "Philippine National Police",
  AMBULANCE: "Emergency Medical Services",
  EMS: "Emergency Medical Services",
  RESCUE: "Rescue Services",
  CDDRMO: "Disaster Response",
};

export function formatReportId(report) {
  const id = report?.incidentId || report?.id;
  if (!id) return "—";
  const short = String(id).replace(/^inc[-_]?/i, "").slice(0, 8).toUpperCase();
  return `#${short}`;
}

export function formatCardDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const group = getTimelineGroup(d);
  if (group === "Today") return "Today";
  if (group === "Yesterday") return "Yesterday";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function formatCardClock(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAgencyLabel(report) {
  const agency = report?.assignedAgency || report?.suggestedAgency;
  if (agency && AGENCY_LABELS[agency]) return AGENCY_LABELS[agency];
  if (report?.assignedTeamName) return report.assignedTeamName;
  if (agency) return String(agency).replace(/_/g, " ");
  return null;
}

export function formatReportSource(report) {
  const source = report?.reportSource;
  if (!source) return null;
  const normalized = String(source).toLowerCase();
  if (normalized.includes("mobile") || normalized.includes("app")) {
    return "RESQ-Link App";
  }
  return String(source);
}

export function formatResponseDuration(report) {
  if (typeof report?.responseTimeSeconds === "number" && report.responseTimeSeconds > 0) {
    return formatDurationSeconds(report.responseTimeSeconds);
  }

  const start = report?.createdAt instanceof Date ? report.createdAt : new Date(report?.createdAt);
  const end =
    report?.updatedAt instanceof Date
      ? report.updatedAt
      : report?.updatedAt
        ? new Date(report.updatedAt)
        : null;

  if (!end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const seconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  if (seconds < 60) return null;
  return formatDurationSeconds(seconds);
}

function formatDurationSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m response`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m response` : `${hours}h response`;
}

export function findActiveReport(reports) {
  return (
    reports.find((r) => isActiveReport(r.status)) ||
    null
  );
}

export function splitActiveFromHistory(reports) {
  const active = findActiveReport(reports);
  const rest = active
    ? reports.filter((r) => r.id !== active.id)
    : reports;
  return { active, rest };
}
