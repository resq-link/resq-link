import Constants from "expo-constants";
import { getFirebaseAuth } from "@packages/firebase";
import { getApiUrl } from "@/utils/api";

export const getAgoraAppId = () =>
  process.env.EXPO_PUBLIC_AGORA_APP_ID ||
  Constants.expoConfig?.extra?.agora?.appId ||
  "";

export async function fetchAgoraRtcToken({ incidentId, channelName }) {
  const currentUser = getFirebaseAuth().currentUser;
  const idToken = await currentUser?.getIdToken();
  if (!idToken) {
    throw new Error("Sign in is required before starting a voice call.");
  }

  const response = await fetch(getApiUrl("/api/agora/token"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ incidentId, channelName }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Unable to get a voice call token.");
  }

  return data;
}
