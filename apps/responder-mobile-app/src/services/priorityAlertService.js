import * as Haptics from "expo-haptics";
import { AppState } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import {
  hasResponderAcknowledgedAlert,
  normalizePriority,
  requiresRepeatingAlert,
} from "@packages/firebase";

/**
 * Tiered field alerts for newly assigned incidents.
 *
 * Two layers run together: haptic patterns (which work with the screen off and
 * respect the phone being pocketed) and a looping alarm tone for critical/high
 * priorities. Both continue until the responder acknowledges — see
 * `shouldAlertForIncident`.
 */

const ALARM_SOURCE = require("../../assets/sounds/incident_alarm.wav");

let highRepeatTimer = null;
let criticalLoopTimer = null;
let alarmPlayer = null;
let audioModeReady = false;

/**
 * Play through the silent switch and keep sounding when back-grounded — a
 * dispatch alarm the responder cannot hear is worthless. Mixing rather than
 * interrupting lets other app audio duck briefly while the alarm plays.
 */
async function ensureAudioMode() {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "mixWithOthers",
    });
    audioModeReady = true;
  } catch {
    // Fall through: haptics still fire even if the audio session is refused.
  }
}

async function startAlarmSound() {
  await ensureAudioMode();
  try {
    if (!alarmPlayer) {
      alarmPlayer = createAudioPlayer(ALARM_SOURCE);
      alarmPlayer.loop = true;
      alarmPlayer.volume = 1;
    }
    await alarmPlayer.seekTo(0);
    alarmPlayer.play();
  } catch {
    // Audio is best-effort; never let it break the alert flow.
  }
}

function stopAlarmSound() {
  if (!alarmPlayer) return;
  try {
    alarmPlayer.pause();
  } catch {
    // ignore
  }
}

/** Release the audio resource entirely — for sign-out or unmount. */
export function releaseAlertResources() {
  stopAlarmSound();
  try {
    alarmPlayer?.remove();
  } catch {
    // ignore
  }
  alarmPlayer = null;
}

export async function stopPriorityAlerts() {
  if (highRepeatTimer) {
    clearInterval(highRepeatTimer);
    highRepeatTimer = null;
  }
  if (criticalLoopTimer) {
    clearInterval(criticalLoopTimer);
    criticalLoopTimer = null;
  }
  stopAlarmSound();
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
    void startAlarmSound();
    criticalLoopTimer = setInterval(run, options.intensified ? 2400 : 3000);
    return;
  }

  if (level === "high" && requiresRepeatingAlert(level)) {
    const run = () => playPriorityPattern("high");
    await run();
    void startAlarmSound();
    highRepeatTimer = setInterval(run, 4000);
    return;
  }

  await playPriorityPattern(level);
}

/**
 * Whether this incident should still be alarming for this responder.
 *
 * Deliberately keyed to the signed-in responder rather than the incident's
 * dispatcher-side `alertAcknowledged`: a dispatcher clearing their console must
 * not silence a phone in the field.
 */
export function shouldAlertForIncident(incident, responderId) {
  if (!incident) return false;
  if (hasResponderAcknowledgedAlert(incident, responderId)) return false;
  const priority = normalizePriority(incident.priority);
  return priority === "critical" || priority === "high" || priority === "medium";
}
