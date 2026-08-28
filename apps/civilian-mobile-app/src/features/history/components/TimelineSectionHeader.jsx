import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function TimelineSectionHeader({ title, count }) {
  const { historyTheme } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        paddingTop: 16,
        paddingBottom: 10,
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: t.text,
        letterSpacing: -0.2,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

