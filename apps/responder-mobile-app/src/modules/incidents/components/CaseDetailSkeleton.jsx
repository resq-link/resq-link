import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResqTheme, radii, spacing } from "@/theme";

export default function CaseDetailSkeleton() {
  const { colors } = useResqTheme();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const ShimmerBlock = ({ style }) => (
    <Animated.View
      style={[
        style,
        {
          opacity: pulseAnim,
          backgroundColor: colors.surfaceHighlight || colors.border,
        },
      ]}
    />
  );

  const mapHeight = Math.max(360, insets.top + 330);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map-first layout — matches CaseInfoCard */}
      <ShimmerBlock style={[styles.mapStage, { height: mapHeight }]} />

      <View
        style={[
          styles.detailsSheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 100,
          },
        ]}
      >
        <ShimmerBlock style={styles.sheetHandle} />

        <ShimmerBlock style={styles.titleBone} />
        <ShimmerBlock style={styles.addressBone} />

        <View style={styles.badgeRow}>
          <ShimmerBlock style={styles.badgeBone} />
          <ShimmerBlock style={styles.badgeBone} />
        </View>

        <View style={styles.progressRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.progressStep}>
              <ShimmerBlock style={styles.progressIcon} />
              <ShimmerBlock style={styles.progressLabel} />
            </View>
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <ShimmerBlock style={styles.sectionTitle} />
          <ShimmerBlock style={styles.lineBone} />
          <ShimmerBlock style={[styles.lineBone, { width: "85%" }]} />
        </View>

        <View style={styles.sectionBlock}>
          <ShimmerBlock style={styles.sectionTitle} />
          <ShimmerBlock style={styles.photoBone} />
        </View>

        <View style={styles.sectionBlock}>
          <ShimmerBlock style={styles.sectionTitle} />
          <ShimmerBlock style={styles.lineBone} />
        </View>
      </View>

      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: Math.max(insets.bottom, spacing.md),
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <ShimmerBlock style={styles.actionButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapStage: {
    width: "100%",
  },
  detailsSheet: {
    marginTop: -34,
    padding: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
  },
  titleBone: {
    width: "70%",
    height: 28,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  addressBone: {
    width: "90%",
    height: 16,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  badgeBone: {
    width: 72,
    height: 24,
    borderRadius: radii.sm,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  progressStep: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  progressIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  progressLabel: {
    width: 56,
    height: 10,
    borderRadius: radii.sm,
  },
  sectionBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "transparent",
    gap: spacing.sm,
  },
  sectionTitle: {
    width: 120,
    height: 14,
    borderRadius: radii.sm,
  },
  lineBone: {
    width: "100%",
    height: 14,
    borderRadius: radii.sm,
  },
  photoBone: {
    width: "100%",
    height: 200,
    borderRadius: radii.md,
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  actionButton: {
    width: "100%",
    height: 52,
    borderRadius: radii.lg,
  },
});
