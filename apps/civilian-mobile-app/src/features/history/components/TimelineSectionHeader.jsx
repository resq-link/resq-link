import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function TimelineSectionHeader({ title, count }) {
  const { historyTheme } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 6,
        paddingBottom: 8,
      },
      pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: historyTypography.section,
        color: t.text,
        letterSpacing: 0.4,
        textTransform: "uppercase",
      },
      count: {
        fontFamily: "Inter_600SemiBold",
        fontSize: historyTypography.badge,
        color: t.textSecondary,
        minWidth: 18,
        textAlign: "center",
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Text style={styles.title}>{title}</Text>
        {count != null ? <Text style={styles.count}>{count}</Text> : null}
      </View>
    </View>
  );
}
