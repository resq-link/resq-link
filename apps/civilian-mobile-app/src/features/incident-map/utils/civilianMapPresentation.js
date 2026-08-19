import { normalizeOperationalStatus } from "@packages/firebase";
import { formatTimestamp } from "@/features/incident-map/utils/mapUtils";

/** Fixed civilian-facing timeline stages — no operational details exposed. */
export const CIVILIAN_TIMELINE_STEPS = [
  { key: "submitted", label: "Emergency Submitted" },
  { key: "dispatcher_viewed", label: "Dispatcher Viewed" },
  { key: "team_assigned", label: "Team Assigned" },
  { key: "en_route", label: "Responders En Route" },
  { key: "arrived", label: "Arrived" },
  { key: "closed", label: "Incident Closed" },
];

const STATUS_PRESENTATION = {
  monitoring: {
    label: "Monitoring",
    dot: "#34C759",
    text: "#15803D",
    textDark: "#86EFAC",
    pulse: true,
  },
  dispatching: {
    label: "Dispatching",
    dot: "#FF9500",
    text: "#B45309",
    textDark: "#FCD34D",
    pulse: true,
  },
  en_route: {
    label: "En Route",
    dot: "#007AFF",
    text: "#1D4ED8",
    textDark: "#93C5FD",
    pulse: true,
  },
  arrived: {
    label: "Arrived",
    dot: "#AF52DE",
    text: "#7E22CE",
    textDark: "#D8B4FE",
    pulse: false,
  },
  completed: {
    label: "Completed",
    dot: "#FF3B30",
    text: "#B91C1C",
    textDark: "#FCA5A5",
    pulse: false,
  },
};

function toDate(value) {
  if (!value) return null;
  const date =
    value instanceof Date
      ? value
      : typeof value === "object" && value && "toDate" in value
        ? value.toDate()
        : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTimeOnly(value) {
  const date = toDate(value);
  if (!date) return null;
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Civilian-friendly status badge for the map header and incident card.
 */
export function getCivilianStatusPresentation(report) {
  if (!report) {
    return { key: "monitoring", ...STATUS_PRESENTATION.monitoring };
  }

  const normalized = normalizeOperationalStatus(report.status);
  const rawStatus = (report.status || "").toLowerCase();

  if (normalized === "resolved" || rawStatus === "done") {
    return { key: "completed", ...STATUS_PRESENTATION.completed };
  }

  if (normalized === "cancelled") {
    return {
      key: "completed",
      label: "Cancelled",
      dot: "#9CA3AF",
      text: "#4B5563",
      textDark: "#CBD5E1",
      pulse: false,
    };
  }

  if (normalized === "on_scene" || report.touchdownAt || rawStatus === "on_scene") {
    return { key: "arrived", ...STATUS_PRESENTATION.arrived };
  }

  const enRouteStatuses = new Set([
    "enroute",
    "en_route",
    "responding",
    "dispatched",
  ]);
  if (
    enRouteStatuses.has(rawStatus) ||
    (normalized === "active" && report.acceptedAt)
  ) {
    return { key: "en_route", ...STATUS_PRESENTATION.en_route };
  }

  if (
    report.assignedResponderId ||
    report.responder ||
    report.assignedTeamName ||
    report.acceptedAt
  ) {
    return { key: "dispatching", ...STATUS_PRESENTATION.dispatching };
  }

  if (report.viewedAt || report.acknowledgedAt) {
    return { key: "dispatching", ...STATUS_PRESENTATION.dispatching };
  }

  return { key: "monitoring", ...STATUS_PRESENTATION.monitoring };
}

/**
 * Resolves the current timeline step index (0-based) for fixed civilian stages.
 */
export function getCivilianTimelineIndex(report) {
  if (!report) return 0;

  const normalized = normalizeOperationalStatus(report.status);
  const rawStatus = (report.status || "").toLowerCase();

  if (normalized === "resolved" || rawStatus === "done" || report.movedToHistoryAt) {
    return 5;
  }

  if (normalized === "on_scene" || report.touchdownAt || rawStatus === "on_scene") {
    return 4;
  }

  const enRouteStatuses = new Set([
    "enroute",
    "en_route",
    "responding",
    "dispatched",
  ]);
  if (
    enRouteStatuses.has(rawStatus) ||
    (normalized === "active" && report.acceptedAt)
  ) {
    return 3;
  }

  if (
    report.assignedResponderId ||
    report.responder ||
    report.assignedTeamName ||
    report.acceptedAt
  ) {
    return 2;
  }

  if (report.viewedAt || report.acknowledgedAt) {
    return 1;
  }

  return 0;
}

export function buildCivilianTimeline(report) {
  const currentIndex = getCivilianTimelineIndex(report);

  return CIVILIAN_TIMELINE_STEPS.map((step, index) => ({
    ...step,
    state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
  }));
}

/**
 * Privacy-safe chronological activity feed — no responder identities or operational data.
 */
export function buildCivilianActivityFeed(report) {
  if (!report) return [];

  const entries = [];
  const push = (id, at, message) => {
    const date = toDate(at);
    if (!date) return;
    entries.push({
      id,
      at: date,
      timeLabel: formatTimeOnly(date),
      message,
    });
  };

  push("submitted", report.createdAt, "Your emergency report was received.");

  if (report.viewedAt || report.acknowledgedAt) {
    push(
      "viewed",
      report.viewedAt || report.acknowledgedAt,
      "Dispatcher acknowledged your report."
    );
  }

  if (
    report.assignedResponderId ||
    report.responder ||
    report.assignedTeamName ||
    report.acceptedAt
  ) {
    push(
      "assigned",
      report.acceptedAt || report.updatedAt,
      "A response team has been assigned."
    );
  }

  const rawStatus = (report.status || "").toLowerCase();
  const normalized = normalizeOperationalStatus(report.status);
  const enRouteStatuses = new Set([
    "enroute",
    "en_route",
    "responding",
    "dispatched",
  ]);

  if (
    enRouteStatuses.has(rawStatus) ||
    (normalized === "active" && report.acceptedAt)
  ) {
    push("en_route", report.updatedAt, "The response team is on the way.");
  }

  if (report.touchdownAt || normalized === "on_scene" || rawStatus === "on_scene") {
    push(
      "on_scene",
      report.touchdownAt || report.updatedAt,
      "Emergency services have arrived at the scene."
    );
  }

  if (normalized === "resolved" || rawStatus === "done" || report.movedToHistoryAt) {
    push(
      "resolved",
      report.movedToHistoryAt || report.updatedAt,
      "Your emergency has been marked as resolved."
    );
  }

  if (report.declineReason) {
    push(
      "update",
      report.declinedAt || report.updatedAt,
      "There is an update regarding your report. Please check incident details."
    );
  }

  return entries.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Human-readable status line for the floating incident card. */
export function getCivilianStatusLine(report) {
  const presentation = getCivilianStatusPresentation(report);

  const lines = {
    monitoring: "Waiting for dispatcher review",
    dispatching: "Dispatching responders",
    en_route: "Responders en route to you",
    arrived: "Emergency services on scene",
    completed: "Incident completed",
  };

  return lines[presentation.key] || presentation.label;
}

export function getCivilianEtaFallback(report) {
  const minutes =
    report?.estimatedArrivalMinutes ??
    report?.etaMinutes ??
    report?.estimatedEtaMinutes;

  if (minutes != null && !Number.isNaN(Number(minutes))) {
    const rounded = Math.max(1, Math.round(Number(minutes)));
    return { hasEta: true, label: `${rounded} Minute${rounded === 1 ? "" : "s"}` };
  }

  return {
    hasEta: false,
    label: "Finding the nearest available response team.",
  };
}

export function formatReportedTime(report) {
  const formatted = formatTimestamp(report?.createdAt);
  if (!formatted) return null;
  const timeOnly = formatTimeOnly(report.createdAt);
  return timeOnly ? `Reported ${timeOnly}` : formatted;
}

export function canCancelCivilianReport(report) {
  if (!report) return false;
  const normalized = normalizeOperationalStatus(report.status);
  return normalized === "pending" && !report.viewedAt && !report.acceptedAt;
}

/** National emergency hotline — used for Call Emergency Hotline action. */
export const EMERGENCY_HOTLINE = "911";
