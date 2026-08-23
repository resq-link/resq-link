import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  acknowledgeIncidentAlert,
  saveResponderPushToken,
  removeResponderPushToken,
} from "@packages/firebase";

/**
 * Remote push for incident assignments.
 *
 * Delivery is split by platform because the platforms genuinely differ:
 *
 * - Android gets a MAX-importance channel with the alarm sound and a vibration
 *   pattern, set to bypass Do Not Disturb. That is a real alarm on a locked,
 *   silenced phone.
 * - iOS cannot loop a sound from a remote push without Apple's Critical Alerts
 *   entitlement, so the Cloud Function re-sends at intervals while the alert is
 *   unacknowledged, and the in-app loop takes over once the app is opened.
 *
 * Tray actions (Acknowledge / View) are registered via a notification category
 * that must match `ALERT_CATEGORY` on the Cloud Function payload.
 *
 * The looping audio itself lives in `priorityAlertService`; this module only
 * covers registration, the channel, categories, and OS-level notification I/O.
 */

export const INCIDENT_ALERT_CHANNEL = "incident-alerts";
/** Must match functions/src/expoPush.ts ALERT_CATEGORY. */
export const INCIDENT_ALERT_CATEGORY = "incident-alert";
export const ACKNOWLEDGE_ACTION = "ACKNOWLEDGE";
export const VIEW_ACTION = "VIEW";
/** Must match the bundled file in assets/sounds and app.json's expo-notifications plugin. */
export const ALARM_SOUND = "incident_alarm.wav";

let cachedToken = null;
let categoriesReady = false;
let responseSubscription = null;

// An assignment has to break through whatever the responder is doing, so the
// banner and sound fire even when the app is already in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Android requires the channel to exist before the first notification arrives,
 * and channel settings are immutable after creation — changing the sound or
 * importance later needs a new channel id.
 */
export async function ensureIncidentAlertChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(INCIDENT_ALERT_CHANNEL, {
    name: "Incident assignments",
    description: "Alarms for incidents dispatched to you while on duty.",
    importance: Notifications.AndroidImportance.MAX,
    sound: ALARM_SOUND,
    vibrationPattern: [0, 400, 200, 400, 200, 400],
    enableVibrate: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });
}

/**
 * Register tray actions so a responder can acknowledge without opening the app.
 * iOS shows these as notification buttons; Android as action chips.
 */
export async function ensureIncidentAlertCategory() {
  if (categoriesReady) return;
  try {
    await Notifications.setNotificationCategoryAsync(INCIDENT_ALERT_CATEGORY, [
      {
        identifier: ACKNOWLEDGE_ACTION,
        buttonTitle: "Acknowledge",
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
          isDestructive: false,
        },
      },
      {
        identifier: VIEW_ACTION,
        buttonTitle: "View case",
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
    categoriesReady = true;
  } catch (error) {
    console.warn(
      "[push] Failed to register notification category:",
      error?.message ?? error
    );
  }
}

const resolveProjectId = () =>
  Constants?.expoConfig?.extra?.eas?.projectId ??
  Constants?.easConfig?.projectId ??
  null;

/**
 * Request permission, obtain the Expo push token, and store it against the
 * signed-in responder. Safe to call on every launch.
 *
 * Returns the token, or null when push is unavailable (simulator, permission
 * denied, or missing EAS project id) — all of which are non-fatal: the in-app
 * alarm still works whenever the app is open.
 */
export async function registerForIncidentPush() {
  await ensureIncidentAlertChannel();
  await ensureIncidentAlertCategory();

  if (!Device.isDevice) {
    // Simulators cannot receive remote push.
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: true,
        // allowCriticalAlerts requires an Apple entitlement — see module docs.
      },
    });
    status = requested.status;
  }

  if (status !== "granted") {
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn(
      "[push] No EAS projectId found; cannot obtain an Expo push token."
    );
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    if (!token) return null;

    cachedToken = token;
    await saveResponderPushToken(
      token,
      Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web"
    );
    return token;
  } catch (error) {
    // Never let push registration break sign-in.
    console.warn("[push] Failed to register push token:", error?.message ?? error);
    return null;
  }
}

/** Detach this device on sign-out so it stops receiving another user's alerts. */
export async function unregisterIncidentPush() {
  if (!cachedToken) return;
  try {
    await removeResponderPushToken(cachedToken);
  } catch (error) {
    console.warn("[push] Failed to remove push token:", error?.message ?? error);
  } finally {
    cachedToken = null;
  }
}

/** Clear delivered alert notifications once the responder has acknowledged. */
export async function dismissIncidentNotifications(incidentId) {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((item) => {
          const data = item?.request?.content?.data;
          return !incidentId || data?.incidentId === incidentId;
        })
        .map((item) => Notifications.dismissNotificationAsync(item.request.identifier))
    );
  } catch {
    // Dismissal is best-effort; a stale banner is not worth surfacing.
  }
}

async function acknowledgeFromNotification(incidentId) {
  if (!incidentId || incidentId === "undefined" || incidentId === "null") return;
  try {
    await acknowledgeIncidentAlert(incidentId);
    await dismissIncidentNotifications(incidentId);
  } catch (error) {
    console.warn(
      "[push] Failed to acknowledge from notification action:",
      error?.message ?? error
    );
  }
}

/**
 * Handle tray actions (Acknowledge / View) and cold-start taps.
 *
 * `onView` is optional — when the responder taps View or the banner itself,
 * the host can navigate to the case after acknowledging.
 */
export function subscribeToIncidentNotificationActions({ onView } = {}) {
  if (responseSubscription) {
    responseSubscription.remove();
    responseSubscription = null;
  }

  const handleResponse = async (response) => {
    if (!response) return;
    const actionId = response.actionIdentifier;
    const data = response.notification?.request?.content?.data ?? {};
    const incidentId = typeof data.incidentId === "string" ? data.incidentId : null;
    if (!incidentId) return;

    // Default tap and Acknowledge both clear the alarm; View also opens the case.
    if (
      actionId === ACKNOWLEDGE_ACTION ||
      actionId === VIEW_ACTION ||
      actionId === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      await acknowledgeFromNotification(incidentId);
    }

    if (
      (actionId === VIEW_ACTION || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) &&
      typeof onView === "function"
    ) {
      onView(incidentId);
    }
  };

  responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    void handleResponse(response);
  });

  // Cold start: the OS may have buffered the action that launched the app.
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) void handleResponse(response);
  });

  return () => {
    responseSubscription?.remove();
    responseSubscription = null;
  };
}
