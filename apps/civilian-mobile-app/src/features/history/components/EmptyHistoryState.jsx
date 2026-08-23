import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle, FilterX, Plus, Radio, ShieldCheck } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function EmptyHistoryState({ filtered, onReport, onResetFilter }) {
  const { historyTheme, isLight } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        alignItems: "center",
        paddingTop: 54,
        paddingHorizontal: 24,
      },
      iconShell: {
        width: 84,
        height: 84,
        borderRadius: 42,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
        borderWidth: 1,
        borderColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)",
        shadowColor: t.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 2,
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: t.text,
        marginBottom: 6,
        textAlign: "center",
        letterSpacing: -0.3,
      },
      subtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        color: t.textSecondary,
        textAlign: "center",
        lineHeight: 19,
        marginBottom: 22,
        maxWidth: 280,
      },
      cta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: t.primary,
        shadowColor: t.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
      },
      ctaText: {
        fontFamily: "Inter_700Bold",
        fontSize: 13,
        color: isLight ? "#FFFFFF" : "#0D0F12",
        letterSpacing: 0.3,
      },
      pressed: {
        opacity: 0.88,
        transform: [{ scale: 0.98 }],
      },
    }),
    historyTheme
  );

  const gradientColors = isLight
    ? ["rgba(52, 199, 89, 0.12)", "rgba(255, 255, 255, 0.95)"]
    : ["rgba(124, 255, 77, 0.14)", "rgba(23, 26, 31, 0.95)"];

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={gradientColors} style={styles.iconShell}>
        {filtered ? (
          <FilterX size={34} color={historyTheme.textSecondary} strokeWidth={2.2} />
        ) : (
          <ShieldCheck size={36} color={historyTheme.primary} strokeWidth={2.2} />
        )}
      </LinearGradient>

      <Text style={styles.title}>
        {filtered ? "No Matching Incidents" : "No Emergency History"}
      </Text>

      <Text style={styles.subtitle}>
        {filtered
          ? "No incident logs match your current search query or active filters."
          : "Your civilian emergency dispatch history and responder timeline will appear here."}
      </Text>

      {!filtered && onReport ? (
        <Pressable
          onPress={onReport}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Report an emergency"
        >
          <Plus size={16} color={isLight ? "#FFFFFF" : "#0D0F12"} strokeWidth={2.6} />
          <Text style={styles.ctaText}>Report New Emergency</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

