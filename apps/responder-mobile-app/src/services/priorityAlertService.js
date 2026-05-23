import * as Haptics from "expo-haptics";
import { AppState } from "react-native";
import { normalizePriority, requiresRepeatingAlert } from "@packages/firebase";

let highRepeatTimer = null;
let criticalLoopTimer = null;

export async function stopPriorityAlerts() {
  if (highRepeatTimer) {
    clearInterval(highRepeatTimer);
    highRepeatTimer = null;
  }
  if (criticalLoopTimer) {
    clearInterval(criticalLoopTimer);
    criticalLoopTimer = null;
  }
}

async function playPriorityPattern(priority, intensified = false) {
  if (AppState.currentState !== "active") return;

  if (priority === "critical") {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (intensified) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    return;
  }

  if (priority === "high") {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    return;
  }

  if (priority === "medium") {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    return;
  }

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function playPriorityAlert(priority, options = {}) {
  const level = normalizePriority(priority);
  await stopPriorityAlerts();

  if (level === "critical") {
    const run = () => playPriorityPattern("critical", options.intensified);
    await run();
    criticalLoopTimer = setInterval(run, options.intensified ? 2400 : 3000);
    return;
  }

  if (level === "high" && requiresRepeatingAlert(level)) {
    const run = () => playPriorityPattern("high");
    await run();
    highRepeatTimer = setInterval(run, 4000);
    return;
  }

  await playPriorityPattern(level);
}

export function shouldAlertForIncident(incident) {
  if (!incident) return false;
  if (incident.alertAcknowledged || incident.acknowledgedBy) return false;
  const priority = normalizePriority(incident.priority);
  return priority === "critical" || priority === "high" || priority === "medium";
}
