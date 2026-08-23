import { Platform } from "react-native";
import Constants from "expo-constants";
import { PROVIDER_GOOGLE } from "react-native-maps";

const getConfiguredGoogleMapsKey = () => {
  const expoConfig = Constants.expoConfig || {};
  return String(
    expoConfig.extra?.googleMaps?.apiKey ||
      expoConfig.ios?.config?.googleMapsApiKey ||
      expoConfig.android?.config?.googleMaps?.apiKey ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      ""
  ).trim();
};

export const hasGoogleMapsApiKey = () => getConfiguredGoogleMapsKey().length > 0;

/**
 * Android needs a Maps SDK key for Google tiles.
 * iOS can fall back to Apple Maps when no Google key is configured.
 */
export const canRenderNativeMap = () => {
  if (Platform.OS === "ios") return true;
  if (Constants.appOwnership === "expo") return true;
  return hasGoogleMapsApiKey();
};

/** @deprecated Use canRenderNativeMap */
export const canRenderGoogleMapsProvider = canRenderNativeMap;

/**
 * Prefer Google when a key is baked into the native build; otherwise Apple Maps on iOS.
 */
export const getNativeMapProvider = () => {
  if (hasGoogleMapsApiKey()) {
    return PROVIDER_GOOGLE;
  }
  // undefined = platform default (Apple Maps on iOS)
  return undefined;
};
