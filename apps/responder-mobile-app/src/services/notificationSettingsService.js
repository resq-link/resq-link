import AsyncStorage from "@react-native-async-storage/async-storage";

export const NOTIFICATION_SETTINGS_KEY = "responder_notification_settings";

/** @type {{ caseAlerts: boolean }} */
let cached = { caseAlerts: true };
const listeners = new Set();

export function getNotificationSettings() {
  return { ...cached };
}

export function subscribeNotificationSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  const snapshot = getNotificationSettings();
  listeners.forEach((fn) => fn(snapshot));
}

export async function loadNotificationSettings() {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return getNotificationSettings();
    const parsed = JSON.parse(raw);
    cached = { caseAlerts: parsed.caseAlerts !== false };
    notify();
    return getNotificationSettings();
  } catch (e) {
    console.error("[notifications] Failed to load settings:", e);
    return getNotificationSettings();
  }
}

export async function saveNotificationSettings(settings) {
  cached = { caseAlerts: settings.caseAlerts !== false };
  await AsyncStorage.setItem(
    NOTIFICATION_SETTINGS_KEY,
    JSON.stringify(cached)
  );
  notify();
  return getNotificationSettings();
}

/** Critical assignments always alert; other tiers respect caseAlerts preference. */
export function shouldPlayCaseAlert(priority) {
  if (cached.caseAlerts !== false) return true;
  const level = String(priority || "").toLowerCase();
  return level === "critical";
}
