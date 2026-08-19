import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import Constants from "expo-constants";
import { spacing, useResqTheme } from "@/theme";

export default function AboutView() {
  const { colors, statusBarStyle } = useResqTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: spacing.lg,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          marginBottom: spacing.lg,
        },
        backButton: {
          marginRight: spacing.md,
          padding: 4,
        },
        title: {
          fontFamily: "Inter_700Bold",
          fontSize: 20,
          color: colors.text,
        },
        content: {
          marginTop: spacing.lg,
        },
        appName: {
          fontFamily: "Inter_700Bold",
          fontSize: 24,
          color: colors.text,
          marginBottom: 8,
        },
        version: {
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: spacing.xl,
        },
        description: {
          fontFamily: "Inter_400Regular",
          fontSize: 15,
          color: colors.textSecondary,
          lineHeight: 22,
        },
      }),
    [colors]
  );

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.background} />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 20, paddingBottom: spacing.lg },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>About</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.appName}>RESCUE Responder</Text>
        <Text style={styles.version}>Version {appVersion}</Text>
        <Text style={styles.description}>
          Emergency responder app for BFP, Police, and other first responders.
          View assigned cases, update status, and navigate to incident
          locations.
        </Text>
      </View>
    </View>
  );
}
