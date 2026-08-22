import * as WebBrowser from "expo-web-browser";
import { Alert, Linking } from "react-native";

export async function openLegalDocument(url) {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: "#10B981",
      showTitle: true,
      toolbarColor: "#080d0b",
    });
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open link", `Please visit ${url} in your browser.`);
    }
  }
}
