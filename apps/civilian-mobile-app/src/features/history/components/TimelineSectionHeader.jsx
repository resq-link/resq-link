import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function TimelineSectionHeader({ title, count }) {
  const { historyTheme, isLight } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingTop: 14,
        paddingBottom: 8,
      },
      nodeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: t.primary,
        shadowColor: t.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 1,
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: 11.5,
        color: t.text,
        letterSpacing: 0.8,
        textTransform: "uppercase",
      },
      countBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 5,
        backgroundColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
      },
      countText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 10,
        color: t.textSecondary,
      },
      hairline: {
        flex: 1,
        height: 1,
        backgroundColor: t.border,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.nodeDot} />
      <Text style={styles.title}>{title}</Text>
      {count != null ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
      <View style={styles.hairline} />
    </View>
  );
}

