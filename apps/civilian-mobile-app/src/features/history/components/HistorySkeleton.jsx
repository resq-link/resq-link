import React, { useEffect } from "react";
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

function Bone({ boneStyle, style }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 750 }),
        withTiming(0.3, { duration: 750 })
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

function SkeletonCard({ styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.telemetryStripe} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Bone boneStyle={styles.bone} style={styles.icon} />
          <View style={styles.headerText}>
            <Bone boneStyle={styles.bone} style={styles.callsign} />
            <Bone boneStyle={styles.bone} style={styles.title} />
          </View>
          <Bone boneStyle={styles.bone} style={styles.chip} />
        </View>
        <Bone boneStyle={styles.bone} style={styles.detailsBox} />
        <View style={styles.footer}>
          <Bone boneStyle={styles.bone} style={styles.footerLeft} />
          <Bone boneStyle={styles.bone} style={styles.footerRight} />
        </View>
      </View>
    </View>
  );
}

export default function HistorySkeleton() {
  const { historyTheme, isLight } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        paddingTop: 8,
        gap: 12,
      },
      bone: {
        backgroundColor: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)",
        borderRadius: 6,
      },
      card: {
        flexDirection: "row",
        borderRadius: 16,
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.border,
        overflow: "hidden",
      },
      telemetryStripe: {
        width: 5,
        backgroundColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.12)",
      },
      content: {
        flex: 1,
        padding: 14,
        gap: 10,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      },
      headerText: {
        flex: 1,
        gap: 5,
      },
      icon: {
        width: 44,
        height: 44,
        borderRadius: 14,
      },
      callsign: {
        height: 10,
        width: "35%",
        borderRadius: 4,
      },
      title: {
        height: 15,
        width: "60%",
        borderRadius: 5,
      },
      chip: {
        width: 72,
        height: 22,
        borderRadius: 6,
      },
      detailsBox: {
        height: 52,
        borderRadius: 10,
      },
      footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 2,
      },
      footerLeft: {
        width: "40%",
        height: 12,
        borderRadius: 4,
      },
      footerRight: {
        width: "25%",
        height: 12,
        borderRadius: 4,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      {[0, 1, 2].map((i) => (
        <SkeletonCard key={i} styles={styles} />
      ))}
    </View>
  );
}

