import React, { memo, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  getIncidentStatusColors,
  getIncidentStatusLabel,
  INCIDENT_STATUS_DOT_PULSE,
  normalizeOperationalStatus,
  shouldPulseIncidentStatus,
} from "@packages/firebase";
import { useAppTheme } from "@/utils/useAppTheme";

const AnimatedDot = Animated.createAnimatedComponent(View);
const { scaleTo, opacityTo, durationMs } = INCIDENT_STATUS_DOT_PULSE;

function IncidentStatusIndicatorComponent({ status, style, textStyle, size = "sm" }) {
  const { isLight } = useAppTheme();
  const mode = isLight ? "light" : "dark";
  const operational = normalizeOperationalStatus(status);
  const pulse = shouldPulseIncidentStatus(status);
  const colors = getIncidentStatusColors(status, mode);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!pulse) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    scale.value = withRepeat(
      withTiming(scaleTo, {
        duration: durationMs / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withTiming(opacityTo, {
        duration: durationMs / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [operational, pulse, scale, opacity]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const dotSize = size === "md" ? 8 : 6;

  return (
    <View style={[styles.row, style]} accessibilityRole="text">
      <AnimatedDot
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: colors.dot,
          },
          pulse ? dotAnimatedStyle : null,
        ]}
      />
      <Text
        style={[
          styles.text,
          size === "md" && styles.textMd,
          { color: colors.text },
          textStyle,
        ]}
      >
        {getIncidentStatusLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {},
  text: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  textMd: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});

export default memo(IncidentStatusIndicatorComponent);
