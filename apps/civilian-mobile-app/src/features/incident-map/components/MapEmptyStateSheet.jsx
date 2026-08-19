import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { AlertCircle, ShieldCheck } from "lucide-react-native";

export default function MapEmptyStateSheet({ theme, isLight, bottomInset, onReportEmergency }) {
  const gradientColors = isLight
    ? ["rgba(52, 199, 89, 0.12)", "rgba(245, 245, 247, 0.95)"]
    : ["rgba(124, 255, 77, 0.08)", "rgba(31, 36, 43, 0.85)"];

  return (
    <BottomSheetScrollView
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: bottomInset + 24,
        alignItems: "center",
      }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={gradientColors} style={styles.iconShell}>
        <ShieldCheck size={40} color={theme.primary} strokeWidth={2} />
      </LinearGradient>

      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        You're Safe
      </Text>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        No active emergency report.
      </Text>

      <Text style={[styles.helpText, { color: theme.textSecondary }]}>
        Need help? Report an emergency anytime.
      </Text>

      <Pressable
        onPress={onReportEmergency}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Report an emergency"
      >
        <AlertCircle size={20} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.ctaText}>Report Emergency</Text>
      </Pressable>
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  iconShell: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 6,
  },
  helpText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 28,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
