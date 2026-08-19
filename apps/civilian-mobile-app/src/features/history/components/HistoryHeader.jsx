import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function HistoryHeader({ onBack, reportCount }) {
  const { historyTheme } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 8,
      },
      backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
      },
      center: {
        flex: 1,
        paddingHorizontal: 12,
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: historyTypography.title,
        color: t.text,
        letterSpacing: -0.3,
      },
      subtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: historyTypography.caption,
        color: t.textSecondary,
        marginTop: 2,
      },
      countPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: t.primaryMuted,
        borderWidth: 1,
        borderColor: t.primary,
        minWidth: 44,
        alignItems: "center",
      },
      countText: {
        fontFamily: "Inter_700Bold",
        fontSize: historyTypography.badge + 1,
        color: t.primary,
      },
      pressed: {
        opacity: 0.85,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Go back to home"
      >
        <ChevronLeft size={22} color={historyTheme.text} strokeWidth={2.4} />
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.title}>History</Text>
        {!reportCount ? null : (
          <Text style={styles.subtitle}>
            {reportCount} report{reportCount === 1 ? "" : "s"}
          </Text>
        )}
      </View>
      {!reportCount ? (
        <View style={{ width: 44 }} />
      ) : (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{reportCount}</Text>
        </View>
      )}
    </View>
  );
}
