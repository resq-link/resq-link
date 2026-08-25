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
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
      "AIzaSyCWLfP5vbHiFTiDQCG3YVxKu8iehstmo0g"
  ).trim();
};

export const hasGoogleMapsApiKey = () => getConfiguredGoogleMapsKey().length > 0;

/**
 * Android needs a Maps SDK key for Google tiles.
 * iOS uses Apple Maps (MapKit) natively which works reliably on all iOS devices.
 */
export const canRenderNativeMap = () => {
  if (Platform.OS === "web") return true;
  return true;
};

/** @deprecated Use canRenderNativeMap */
export const canRenderGoogleMapsProvider = canRenderNativeMap;

/**
 * Android uses Google Maps; iOS uses Apple Maps (MapKit) natively.
 */
export const getNativeMapProvider = () => {
  if (Platform.OS === "android") {
    return PROVIDER_GOOGLE;
  }
  return undefined;
};
