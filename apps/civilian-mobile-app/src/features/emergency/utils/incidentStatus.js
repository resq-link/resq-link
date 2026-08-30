import {
  getCivilianIncidentStatusPresentation,
  getCivilianStatusShortLabel as getSharedCivilianStatusShortLabel,
} from "@packages/firebase";

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

/** Civilian-facing status — linked operational incident is authoritative after elevation. */
export function getIncidentStatusPresentation(report) {
  return getCivilianIncidentStatusPresentation(report);
}

export function getLastUpdatedTimestamp(report) {
  return (
    toDisplayTimestamp(report?.updatedAt) ||
    toDisplayTimestamp(report?.createdAt)
  );
}

/** Short label for compact UI (bottom bar, floating card). */
export function getCivilianStatusShortLabel(report) {
  return getSharedCivilianStatusShortLabel(report);
}

/** Accent color for compact status chips. */
export function getCivilianStatusColor(report) {
  const key = getIncidentStatusPresentation(report).key;
  if (key === "on_scene") return "#059669";
  if (key === "en_route") return "#0284C7";
  if (key === "assigned" || key === "elevated") return "#D97706";
  if (key === "reviewing" || key === "waiting") return "#D97706";
  return "#64748B";
}
