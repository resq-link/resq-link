import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { createHistoryCardShell } from "@/theme/factories";

function Bone({ boneStyle, style }) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 700 }),
        withTiming(0.35, { duration: 700 })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[boneStyle, style, animatedStyle]} />;
}

function SkeletonCard({ styles, cardShell, featured = false }) {
  return (
    <View style={[styles.card, cardShell]}>
      <Bone boneStyle={styles.bone} style={styles.accent} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Bone boneStyle={styles.bone} style={styles.icon} />
          <View style={styles.headerText}>
            {featured ? <Bone boneStyle={styles.bone} style={styles.live} /> : null}
            <Bone boneStyle={styles.bone} style={styles.title} />
            <Bone boneStyle={styles.bone} style={styles.subtitle} />
          </View>
          <Bone boneStyle={styles.bone} style={styles.chip} />
        </View>
        <Bone boneStyle={styles.bone} style={styles.panel} />
        <Bone boneStyle={styles.bone} style={styles.footer} />
      </View>
    </View>
  );
}

export default function HistorySkeleton() {
  const { historyTheme } = useAppTheme();
  const cardShell = useMemo(
    () => createHistoryCardShell(historyTheme),
    [historyTheme]
  );
  const featuredShell = useMemo(
    () => createHistoryCardShell(historyTheme, { featured: true }),
    [historyTheme]
  );

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        paddingTop: 8,
      },
      bone: {
        backgroundColor: t.surface,
        borderRadius: 8,
      },
      card: {
        marginBottom: 12,
      },
      accent: {
        height: 4,
        width: "100%",
        borderRadius: 0,
      },
      content: {
        padding: 16,
        gap: 12,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      },
      headerText: {
        flex: 1,
        gap: 6,
      },
      icon: {
        width: 44,
        height: 44,
        borderRadius: 14,
      },
      live: {
        width: 52,
        height: 16,
        borderRadius: 999,
      },
      title: {
        height: 16,
        width: "58%",
        borderRadius: 8,
      },
      subtitle: {
        height: 12,
        width: "38%",
        borderRadius: 6,
      },
      chip: {
        width: 78,
        height: 26,
        borderRadius: 999,
      },
      panel: {
        height: 88,
        borderRadius: 14,
      },
      footer: {
        height: 44,
        borderRadius: 14,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      <SkeletonCard styles={styles} cardShell={featuredShell} featured />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} styles={styles} cardShell={cardShell} />
      ))}
    </View>
  );
}
