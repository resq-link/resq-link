import { Alert, Linking } from "react-native";

export const EMERGENCY_HOTLINE = "911";

export async function openEmergencyHotline() {
  const url = `tel:${EMERGENCY_HOTLINE}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert(
      "Unable to Call",
      "This device cannot place phone calls. Dial 911 manually if you need emergency help."
    );
    return false;
  }

  await Linking.openURL(url);
  return true;
}
