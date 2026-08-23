import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  saveCivilianPushToken,
  removeCivilianPushToken,
} from "@packages/firebase";

export const EMERGENCY_UPDATE_CHANNEL = "emergency-updates";

let cachedToken = null;
let responseSubscription = null;

// Present alert banner, sound, and badge even if app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configure high-priority Android notification channel for emergency updates.
 */
export async function ensureCivilianNotificationChannel() {
  if (Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync(EMERGENCY_UPDATE_CHANNEL, {
      name: "Emergency updates",
      description: "Real-time updates and status changes for your reported emergencies.",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
  } catch (error) {
    console.warn("[civilian-push] Failed to set notification channel:", error?.message ?? error);
  }
}

const resolveProjectId = () =>
  Constants?.expoConfig?.extra?.eas?.projectId ??
  Constants?.easConfig?.projectId ??
  "6f35acd3-b528-4968-ad8d-c21f0162886d";

/**
 * Request notification permissions, fetch Expo push token, and save to Firestore users/{uid}.
 */
export async function registerForCivilianPush() {
  await ensureCivilianNotificationChannel();

  if (!Device.isDevice) {
    // Simulators cannot receive remote push notifications
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
      },
    });
    status = requested.status;
  }

  if (status !== "granted") {
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
    await saveCivilianPushToken(token, platform);
    return token;
  } catch (error) {
    console.warn("[civilian-push] Failed to register push token:", error?.message ?? error);
    return null;
  }
}

/**
 * Detach this device's token on sign-out.
 */
export async function unregisterCivilianPush() {
  if (!cachedToken) return;
  try {
    await removeCivilianPushToken(cachedToken);
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
  if (responseSubscription) {
    responseSubscription.remove();
    responseSubscription = null;
  }

  const handleResponse = (response) => {
    if (!response) return;
    const data = response.notification?.request?.content?.data ?? {};
    if (typeof onNavigate === "function") {
      onNavigate(data);
    }
  };

  responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

  // Check if app was opened via notification on cold start
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleResponse(response);
  });

  return () => {
    responseSubscription?.remove();
    responseSubscription = null;
  };
}
