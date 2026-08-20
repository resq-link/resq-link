import { Platform } from "react-native";
import Constants from "expo-constants";

const getConfiguredGoogleMapsKey = () => {
  const expoConfig = Constants.expoConfig || {};
  return String(
    expoConfig.extra?.googleMaps?.apiKey ||
    expoConfig.android?.config?.googleMaps?.apiKey ||
    ""
  ).trim();
};

export const canRenderGoogleMapsProvider = () => {
  if (Platform.OS !== "android") return true;
  if (Constants.appOwnership === "expo") return true;
  return getConfiguredGoogleMapsKey().length > 0;
};
