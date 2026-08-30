import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform, PermissionsAndroid } from "react-native";
import { isRunningInExpoGo } from "expo";
import {
  saveCivilianPushToken,
  removeCivilianPushToken,
} from "@packages/firebase";

/**
 * Civilian remote push for advisories and emergency report status updates.
 * Lazy-loaded so Expo Go (SDK 53+) does not throw on import — Android push
 * was removed from Expo Go. Use a development build for real push testing.
 */

export const EMERGENCY_UPDATE_CHANNEL = "emergency-updates";
export const CIVILIAN_ALERT_CHANNEL = "civilian-alerts";

let cachedToken = null;
let responseSubscription = null;
let notificationsModule = null;
let handlerConfigured = false;
let loggedExpoGoSkip = false;

/** Remote push requires a dev/production build — not Expo Go on Android (SDK 53+). */
export function isRemotePushAvailable() {
  return !isRunningInExpoGo();
}

async function getNotificationsModule() {
  if (!isRemotePushAvailable()) {
    if (__DEV__ && !loggedExpoGoSkip) {
      loggedExpoGoSkip = true;
      console.info(
        "[civilian-push] Remote push skipped in Expo Go — use a development build for push."
      );
    }
    return null;
  }

  if (!notificationsModule) {
    notificationsModule = await import("expo-notifications");

    if (!handlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      handlerConfigured = true;
    }
  }

  return notificationsModule;
}

/**
 * Configure MAX-importance Android notification channels for advisories and emergency updates.
 */
export async function ensureCivilianNotificationChannels() {
  const Notifications = await getNotificationsModule();
  if (!Notifications || Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync(CIVILIAN_ALERT_CHANNEL, {
      name: "Public Advisories & Bulletins",
      description: "Critical city-wide advisories, weather warnings, and safety notices.",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 350, 150, 350],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
      bypassDnd: true,
    });

    await Notifications.setNotificationChannelAsync(EMERGENCY_UPDATE_CHANNEL, {
      name: "Emergency Report Updates",
      description: "Real-time dispatch and status updates for your reported emergencies.",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
      bypassDnd: true,
    });
  } catch (error) {
    console.warn("[civilian-push] Failed to set notification channels:", error?.message ?? error);
  }
}

const resolveProjectId = () =>
  Constants?.expoConfig?.extra?.eas?.projectId ??
  Constants?.easConfig?.projectId ??
  "6f35acd3-b528-4968-ad8d-c21f0162886d";

/**
 * Request notification permissions, fetch Expo push token, and save to Firestore users/{uid}.
 */
export async function registerForCivilianPush(explicitUid = null) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  await ensureCivilianNotificationChannels();

  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android" && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (!granted) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }
    } catch (permErr) {
      console.warn("[civilian-push] Android runtime permission request failed:", permErr);
    }
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: true,
      },
    });
    status = requested.status;
  }

  if (status !== "granted") {
    console.warn("[civilian-push] Notification permission not granted (status:", status, ")");
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn("[civilian-push] No EAS projectId found; cannot obtain Expo push token.");
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    if (!token) return null;

    cachedToken = token;
    const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
    await saveCivilianPushToken(token, platform, explicitUid);
    return token;
  } catch (error) {
    console.warn("[civilian-push] Failed to register push token:", error?.message ?? error);
    return null;
  }
}

/**
 * Detach this device's token on sign-out.
 */
export async function unregisterCivilianPush(explicitUid = null) {
  if (!cachedToken) return;
  try {
    await removeCivilianPushToken(cachedToken, explicitUid);
  } catch (error) {
    console.warn("[civilian-push] Failed to remove push token:", error?.message ?? error);
  } finally {
    cachedToken = null;
  }
}

/**
 * Subscribe to notification tap / interaction responses (both foreground and cold-start).
 */
export function subscribeToCivilianNotificationResponse({ onNavigate } = {}) {
  let disposed = false;
  let localSubscription = null;

  const handleResponse = (response) => {
    if (!response) return;
    const data = response.notification?.request?.content?.data ?? {};
    if (typeof onNavigate === "function") {
      onNavigate(data);
    }
  };

  void getNotificationsModule().then((Notifications) => {
    if (!Notifications || disposed) return;

    if (responseSubscription) {
      responseSubscription.remove();
      responseSubscription = null;
    }

    localSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    responseSubscription = localSubscription;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && !disposed) handleResponse(response);
    });
  });

  return () => {
    disposed = true;
    localSubscription?.remove();
    if (responseSubscription === localSubscription) {
      responseSubscription = null;
    }
  };
}
