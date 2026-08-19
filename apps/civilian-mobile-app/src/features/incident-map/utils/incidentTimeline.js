import { normalizeOperationalStatus } from "@packages/firebase";
import { formatTimestamp } from "@/features/incident-map/utils/mapUtils";

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

/**
 * Builds timeline steps from real Firestore fields only.
 * @returns {Array<{ key: string, label: string, at: Date | null, formattedAt: string | null }>}
 */
export function buildIncidentTimeline(report) {
  if (!report) return [];

  const steps = [];
  const status = normalizeOperationalStatus(report.status);
  const rawStatus = (report.status || "").toLowerCase();

  const push = (key, label, at) => {
    const date = toDate(at);
    steps.push({
      key,
      label,
      at: date,
      formattedAt: formatTimestamp(date),
    });
  };

  push("submitted", "Report Submitted", report.createdAt);

  if (report.viewedAt) {
    push("reviewing", "Dispatcher Reviewing", report.viewedAt);
  }

  if (report.acknowledgedAt) {
    push("acknowledged", "Dispatcher Acknowledged", report.acknowledgedAt);
  }

  if (report.dispatcherId && !report.viewedAt && !report.acknowledgedAt) {
    push("assigned_dispatcher", "Dispatcher Assigned", report.updatedAt);
  }

  if (report.assignedResponderId || report.responder || report.assignedTeamName) {
    push(
      "responder_assigned",
      "Responder Assigned",
      report.acceptedAt || report.updatedAt
    );
  }

  if (report.acceptedAt) {
    push("responder_accepted", "Responder Accepted", report.acceptedAt);
  }

  if (
    rawStatus === "enroute" ||
    rawStatus === "en_route" ||
    rawStatus === "responding" ||
    rawStatus === "dispatched"
  ) {
    push("en_route", "En Route", report.updatedAt);
  } else if (status === "active" && report.acceptedAt) {
    push("en_route", "En Route", report.updatedAt);
  }

  if (report.touchdownAt || status === "on_scene" || rawStatus === "on_scene") {
    push("on_scene", "On Scene", report.touchdownAt || report.updatedAt);
  }

  if (
    status === "resolved" ||
    rawStatus === "done" ||
    rawStatus === "resolved" ||
    report.movedToHistoryAt
  ) {
    push("resolved", "Resolved", report.movedToHistoryAt || report.updatedAt);
  }

  return steps;
}

export function getCurrentTimelineKey(report) {
  if (!report) return null;
  const status = normalizeOperationalStatus(report.status);
  const rawStatus = (report.status || "").toLowerCase();

  if (status === "resolved" || rawStatus === "done") return "resolved";
  if (status === "on_scene" || report.touchdownAt) return "on_scene";
  if (
    rawStatus === "enroute" ||
    rawStatus === "en_route" ||
    rawStatus === "responding"
  ) {
    return "en_route";
  }
  if (report.acceptedAt) return "responder_accepted";
  if (report.assignedResponderId || report.responder) return "responder_assigned";
  if (report.acknowledgedAt) return "acknowledged";
  if (report.viewedAt) return "reviewing";
  if (status === "active") return "en_route";
  return "submitted";
}
