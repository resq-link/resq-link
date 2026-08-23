import React, { memo, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Check, Clock, Radio, X } from "lucide-react-native";
import { getStatusPresentation } from "@/features/history/constants";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";

function LiveBeacon({ color, size = 6 }) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.8);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(0.8, { duration: 0 })
      ),
      -1,
      false
    );
  }, [pulseScale, pulseOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={[styles.beaconWrap, { width: size + 8, height: size + 8 }]}>
      <Animated.View
        style={[
          styles.beaconRing,
          ringStyle,
          {
            width: size + 4,
            height: size + 4,
            borderRadius: (size + 4) / 2,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.beaconCore,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

function StatusChip({ status, size = "sm" }) {
  const { historyTheme, isLight } = useAppTheme();
  const presentation = getStatusPresentation(status, historyTheme, isLight);
  const compact = size === "sm";

  return (
    <View
      style={[
        styles.lozenge,
        compact ? styles.lozengeSm : styles.lozengeMd,
        {
          backgroundColor: presentation.bg,
          borderColor: presentation.border,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status ${presentation.label}`}
    >
      {presentation.pulse ? (
        <LiveBeacon color={presentation.color} size={compact ? 5 : 6} />
      ) : presentation.tagText === "RESOLVED" ? (
        <Check size={compact ? 10 : 12} color={presentation.color} strokeWidth={3} />
      ) : presentation.tagText === "CANCELLED" ? (
        <X size={compact ? 10 : 12} color={presentation.color} strokeWidth={2.5} />
      ) : (
        <View
          style={[
            styles.solidDot,
            {
              backgroundColor: presentation.color,
              width: compact ? 5 : 6,
              height: compact ? 5 : 6,
              borderRadius: 3,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          compact ? styles.labelSm : styles.labelMd,
          { color: presentation.color },
        ]}
        numberOfLines={1}
      >
        {presentation.tagText || presentation.label}
      </Text>
    </View>
  );
}

export default memo(StatusChip);

const styles = StyleSheet.create({
  lozenge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  lozengeSm: {
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lozengeMd: {
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  beaconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  beaconRing: {
    position: "absolute",
  },
  beaconCore: {},
  solidDot: {},
  label: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  labelSm: {
    fontSize: 9.5,
  },
  labelMd: {
    fontSize: 11,
  },
});

