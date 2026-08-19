import { normalizeOperationalStatus } from "@packages/firebase";

export function toDisplayTimestamp(value) {
  if (!value) return null;
  const date =
    value instanceof Date
      ? value
      : typeof value === "object" && value && "toDate" in value
        ? value.toDate()
        : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Human-readable incident status for the confirmation screen.
 * Derived from Firestore report fields only — ignores additional-details workflow.
 */
export function getIncidentStatusPresentation(report) {
  if (!report) {
    return {
      title: "Report Received",
      description: "Your emergency report is being loaded…",
      showPulse: true,
      key: "loading",
    };
  }

  const rawStatus = (report.status || "").toLowerCase().trim();
  const normalized = normalizeOperationalStatus(report.status);

  if (normalized === "cancelled") {
    return {
      title: "Incident Cancelled",
      description: "This emergency report was cancelled.",
      showPulse: false,
      key: "cancelled",
    };
  }

  if (normalized === "resolved" || rawStatus === "done") {
    return {
      title: "Incident Resolved",
      description: "This emergency has been marked as resolved.",
      showPulse: false,
      key: "resolved",
    };
  }

  if (normalized === "on_scene" || report.touchdownAt || rawStatus === "on_scene") {
    return {
      title: "Responders On Scene",
      description:
        "Emergency responders have arrived and are handling the incident.",
      showPulse: false,
      key: "on_scene",
    };
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
    return {
      title: "Responders En Route",
      description: "Responders are currently traveling to your location.",
      showPulse: true,
      key: "en_route",
    };
  }

  if (
    report.assignedResponderId ||
    report.responder ||
    report.assignedTeamName ||
    report.acceptedAt
  ) {
    return {
      title: "Responders Assigned",
      description: "Emergency responders have been assigned to your incident.",
      showPulse: true,
      key: "assigned",
    };
  }

  if (report.viewedAt || report.viewedByName || report.acknowledgedAt) {
    return {
      title: "Dispatcher Reviewing",
      description: "The dispatcher is currently verifying your emergency report.",
      showPulse: true,
      key: "reviewing",
    };
  }

  if (normalized === "pending" || rawStatus === "linked") {
    return {
      title: "Waiting for Dispatcher",
      description:
        "Your emergency report has been received and is waiting to be reviewed.",
      showPulse: true,
      key: "waiting",
    };
  }

  return {
    title: "Report Received",
    description: "Your emergency report has been submitted successfully.",
    showPulse: true,
    key: "received",
  };
}

export function getLastUpdatedTimestamp(report) {
  return (
    toDisplayTimestamp(report?.updatedAt) ||
    toDisplayTimestamp(report?.createdAt)
  );
}
