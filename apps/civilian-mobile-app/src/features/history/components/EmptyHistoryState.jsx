import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AlertCircle, Clock3 } from "lucide-react-native";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function EmptyHistoryState({ filtered, onReport }) {
  const { historyTheme, isLight } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        alignItems: "center",
        paddingTop: 48,
        paddingHorizontal: 24,
      },
      iconShell: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
        borderWidth: 1,
        borderColor: t.border,
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: historyTypography.title,
        color: t.text,
        marginBottom: 8,
        textAlign: "center",
      },
      subtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: historyTypography.body,
        color: t.textSecondary,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
      },
      cta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: t.primary,
      },
      ctaText: {
        fontFamily: "Inter_700Bold",
        fontSize: historyTypography.body,
        color: t.background,
      },
      pressed: {
        opacity: 0.9,
      },
    }),
    historyTheme
  );

  const gradientColors = isLight
    ? ["rgba(52, 199, 89, 0.1)", "rgba(245, 245, 247, 0.9)"]
    : ["rgba(124, 255, 77, 0.08)", "rgba(31, 36, 43, 0.6)"];

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={gradientColors}
        style={styles.iconShell}
      >
        <Clock3 size={36} color={historyTheme.primary} strokeWidth={2} />
      </LinearGradient>
      <Text style={styles.title}>
        {filtered ? "No matching reports" : "No reports yet"}
      </Text>
      <Text style={styles.subtitle}>
        {filtered
          ? "Try a different search or filter."
          : "Your emergency history will appear here."}
      </Text>
      {!filtered && onReport ? (
        <Pressable
          onPress={onReport}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Report an emergency"
        >
          <AlertCircle size={18} color={historyTheme.background} strokeWidth={2.4} />
          <Text style={styles.ctaText}>Report Emergency</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
