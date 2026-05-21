import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, Animated, Platform } from "react-native";
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Skeleton */}
      <View
        style={[
          styles.headerSkeleton,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 20,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <ShimmerBlock style={styles.backButtonSkeleton} />
          <View style={styles.headerTitleContainer}>
            <ShimmerBlock style={styles.titleSkeleton} />
            <ShimmerBlock style={styles.subtitleSkeleton} />
          </View>
        </View>
      </View>

      {/* Main Content Scroll Skeleton */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.scrollContent, { paddingBottom: insets.bottom + 160 }]}>
          
          {/* Card 1: Title block & Status Badge Skeleton */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ShimmerBlock style={styles.categoryTitleSkeleton} />
            <View style={styles.badgeRow}>
              <ShimmerBlock style={styles.badgeSkeleton} />
              <ShimmerBlock style={styles.badgeSkeleton} />
            </View>
          </View>

          {/* Card 2: Map & Location Details Skeleton */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ShimmerBlock style={styles.cardHeaderTitleSkeleton} />
            <ShimmerBlock style={styles.mapSkeleton} />
            <ShimmerBlock style={styles.locationTextSkeleton} />
            <ShimmerBlock style={styles.landmarkTextSkeleton} />
            <ShimmerBlock style={styles.coordTextSkeleton} />
          </View>

          {/* Card 3: Description Skeleton */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ShimmerBlock style={styles.cardHeaderTitleSkeleton} />
            <ShimmerBlock style={styles.descLine1} />
            <ShimmerBlock style={styles.descLine2} />
            <ShimmerBlock style={styles.descLine3} />
          </View>

          {/* Card 4: Collapsible Additional Details Skeleton */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.collapsibleHeaderRow}>
              <ShimmerBlock style={styles.collapsibleTitleSkeleton} />
              <ShimmerBlock style={styles.chevronSkeleton} />
            </View>
          </View>

          {/* Card 5: Collapsible Reporter Skeleton */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.collapsibleHeaderRow}>
              <ShimmerBlock style={styles.collapsibleTitleSkeleton} />
              <ShimmerBlock style={styles.chevronSkeleton} />
            </View>
          </View>

          {/* Card 6: Collapsible Timeline Skeleton */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.collapsibleHeaderRow}>
              <ShimmerBlock style={styles.collapsibleTitleSkeleton} />
              <ShimmerBlock style={styles.chevronSkeleton} />
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar Skeleton */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <View style={styles.bottomBarRow}>
          <ShimmerBlock style={styles.primaryBtnSkeleton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSkeleton: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonSkeleton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
    gap: 6,
  },
  titleSkeleton: {
    width: 140,
    height: 18,
    borderRadius: radii.sm,
  },
  subtitleSkeleton: {
    width: 80,
    height: 12,
    borderRadius: radii.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  categoryTitleSkeleton: {
    width: 180,
    height: 22,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  badgeSkeleton: {
    width: 70,
    height: 20,
    borderRadius: radii.sm,
  },
  cardHeaderTitleSkeleton: {
    width: 120,
    height: 14,
    borderRadius: radii.sm,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  mapSkeleton: {
    width: "100%",
    height: 200,
    borderRadius: radii.md,
    marginVertical: spacing.xs,
  },
  locationTextSkeleton: {
    width: "90%",
    height: 16,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
  },
  landmarkTextSkeleton: {
    width: "60%",
    height: 14,
    borderRadius: radii.sm,
  },
  coordTextSkeleton: {
    width: "40%",
    height: 12,
    borderRadius: radii.sm,
  },
  descLine1: {
    width: "100%",
    height: 14,
    borderRadius: radii.sm,
  },
  descLine2: {
    width: "95%",
    height: 14,
    borderRadius: radii.sm,
  },
  descLine3: {
    width: "75%",
    height: 14,
    borderRadius: radii.sm,
  },
  collapsibleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  collapsibleTitleSkeleton: {
    width: 130,
    height: 14,
    borderRadius: radii.sm,
  },
  chevronSkeleton: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnSkeleton: {
    width: "100%",
    height: 48,
    borderRadius: radii.md,
  },
});
