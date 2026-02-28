import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useAppTheme } from "@/utils/useAppTheme";

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const openEmail = async () => {
    const url = "mailto:support@rescueapp.local?subject=RESCUE%20Support";
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Not available", "No email app available on this device.");
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Help & Support</Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Need help? Contact support or open the pages below.
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { borderColor: colors.text }]}
        onPress={() => router.push("/report-issue")}
      >
        <Text style={[styles.primaryButtonText, { color: colors.text }]}>Report an issue</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, { borderColor: colors.text }]}
        onPress={() => router.push("/faq")}
      >
        <Text style={[styles.primaryButtonText, { color: colors.text }]}>Open FAQ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={openEmail}>
        <Text style={styles.secondaryButtonText}>Contact support by email</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    marginTop: 2,
  },
  subtitle: {
    marginTop: 18,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 14,
    borderWidth: 2,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 14,
    backgroundColor: "#007AFF",
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});

