import { Platform } from "react-native";
import Constants from "expo-constants";
import { PROVIDER_GOOGLE } from "react-native-maps";

const getConfiguredGoogleMapsKey = () => {
  const expoConfig = Constants.expoConfig || {};
  return String(
    expoConfig.extra?.googleMaps?.apiKey ||
    expoConfig.android?.config?.googleMaps?.apiKey ||
    ""
  ).trim();
};

const hasIosGoogleMapsNativeConfig = () => {
  const expoConfig = Constants.expoConfig || {};
  return Boolean(expoConfig.ios?.infoPlist?.GMSApiKey);
};

/** Matches responder-mobile-app: Android needs a key; iOS can always render a map. */
export const canRenderGoogleMapsProvider = () => {
  if (Platform.OS !== "android") return true;
  if (Constants.appOwnership === "expo") return true;
  return getConfiguredGoogleMapsKey().length > 0;
};

/** Use Google tiles only when the native build supports them. */
export const getNativeMapProvider = () => {
  if (Constants.appOwnership === "expo") return PROVIDER_GOOGLE;

  if (Platform.OS === "android") {
    return getConfiguredGoogleMapsKey().length > 0 ? PROVIDER_GOOGLE : undefined;
  }

  return hasIosGoogleMapsNativeConfig() ? PROVIDER_GOOGLE : undefined;
};
