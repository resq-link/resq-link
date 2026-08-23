import { normalizePriority } from "@packages/firebase";

/** Semantic priority color from theme tokens. */
export function getPriorityColor(priority, colors) {
  switch (normalizePriority(priority)) {
    case "critical":
      return colors.priorityCritical;
    case "high":
      return colors.priorityHigh;
    case "medium":
      return colors.priorityMedium;
    case "low":
      return colors.priorityLow;
    default:
      return colors.priorityMedium;
  }
}
