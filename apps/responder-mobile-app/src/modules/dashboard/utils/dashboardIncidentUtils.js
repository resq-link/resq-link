import { distanceKm, formatDistance } from "@/utils/mapIncidentHelpers";
import {
  hasSceneReport,
  isResponderAssignmentPendingAccept,
  resolveIncidentDisplayFields,
} from "@packages/firebase";

export function getIncidentTypeLabel(incidentOrType) {
  if (typeof incidentOrType === "object" && incidentOrType !== null) {
    return resolveIncidentDisplayFields(incidentOrType).incidentTypeLabel;
  }
  return resolveIncidentDisplayFields({
    incidentType: incidentOrType,
  }).incidentTypeLabel;
}

export function getIncidentRowTitle(incident) {
  const { incidentTypeLabel, incidentTitle } = resolveIncidentDisplayFields(incident);
  return incidentTitle || incidentTypeLabel;
}

export function formatRelativeTimeShort(dateInput) {
  if (!dateInput) return "";
  let dateObj;
  if (typeof dateInput?.toDate === "function") {
    dateObj = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else if (dateInput?._seconds) {
    dateObj = new Date(dateInput._seconds * 1000);
  } else {
    dateObj = new Date(dateInput);
  }
  if (Number.isNaN(dateObj.getTime())) return "Recent";

  const diffMs = Date.now() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getIncidentCoordinates(caseData) {
  const latitude = Number(caseData?.latitude ?? caseData?.location?.latitude);
  const longitude = Number(caseData?.longitude ?? caseData?.location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

export function formatIncidentDistance(responderCoords, caseData) {
  const incidentCoords = getIncidentCoordinates(caseData);
  if (!responderCoords || !incidentCoords) return null;
  const km = distanceKm(responderCoords, incidentCoords);
  if (km == null || Number.isNaN(km)) return null;
  return formatDistance(km);
}

export function formatLocationMeta(responderCoords, caseData) {
  const distanceLabel = formatIncidentDistance(responderCoords, caseData);
  const timeLabel = formatRelativeTimeShort(
    caseData?.updatedAt || caseData?.createdAt
  );
  if (distanceLabel && timeLabel) return `${distanceLabel} · ${timeLabel}`;
  return distanceLabel || timeLabel || "";
}

/** Short next-action labels for compact dashboard CTAs. */
export function getCompactNextAction(caseData, user) {
  if (!caseData || !user?.uid) return "Open";

  const userAssignment = caseData.responderAssignments?.[user.uid];
  const isAssigned =
    (caseData.assignedResourceIds && caseData.assignedResourceIds.includes(user.uid)) ||
    Boolean(userAssignment);

  if (!isAssigned) return "Open";

  if (isResponderAssignmentPendingAccept(caseData, user.uid)) {
    return "Accept";
  }

  if (userAssignment) {
    if (userAssignment.status === "enroute" && !userAssignment.touchdownAt) {
      return "On Scene";
    }
    if (userAssignment.status === "on_scene" || userAssignment.touchdownAt) {
      const sceneReport =
        userAssignment.sceneReport || caseData.sceneReports?.[user.uid];
      if (
        !hasSceneReport(sceneReport) &&
        !userAssignment.postIncidentReport?.submittedAt &&
        !caseData.postIncidentReports?.[user.uid]?.submittedAt
      ) {
        return "Report";
      }
      return "Open";
    }
    if (userAssignment.status === "resolved" || userAssignment.status === "declined") {
      return "Open";
    }
  }

  // Resource-dispatch path: responder UID is in assignedResourceIds but has no
  // responderAssignments slot yet. A peer accepting flips top-level status to
  // enroute — still show Accept so this officer can accept independently.
  if (
    !userAssignment &&
    caseData.assignedResourceIds?.includes(user.uid)
  ) {
    return "Accept";
  }

  // Fallback to legacy single-status structure
  const status = String(caseData.status || "").toLowerCase();
  if (
    status === "pending" ||
    status === "dispatched" ||
    status === "awaiting_resources" ||
    status === "active"
  ) {
    return "Accept";
  }
  if (status === "enroute" && !caseData.touchdownAt) {
    return "On Scene";
  }
  if (caseData.touchdownAt) {
    const hasReport =
      hasSceneReport(caseData.sceneReports?.[user.uid]) ||
      caseData.postIncidentReport?.submittedAt;
    if (!hasReport) {
      return "Report";
    }
  }
  return "Open";
}

