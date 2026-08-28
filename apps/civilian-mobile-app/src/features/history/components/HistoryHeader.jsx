import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function HistoryHeader({
  title = "Incident History",
  subtitle = "Showing all your incident history",
}) {
  const { historyTheme } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        paddingTop: 8,
        paddingBottom: 4,
        gap: 4,
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: 24,
        color: t.text,
        letterSpacing: -0.5,
      },
      subtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: 13.5,
        color: t.textSecondary || "#64748B",
        letterSpacing: -0.1,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}


