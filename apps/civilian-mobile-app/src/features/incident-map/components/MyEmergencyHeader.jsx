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
  getCivilianStatusLine,
  getCivilianStatusPresentation,
} from "@/features/incident-map/utils/civilianMapPresentation";

const AnimatedDot = Animated.createAnimatedComponent(View);

const TITLE_SIZE = 24;
const SUBTITLE_SIZE = 13;

function CivilianStatusBadge({ report, isLight }) {
  const presentation = getCivilianStatusPresentation(report);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!presentation.pulse) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    scale.value = withRepeat(
      withTiming(1.35, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.45, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [presentation.key, presentation.pulse, opacity, scale]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const textColor = isLight ? presentation.text : presentation.textDark;

  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: isLight
            ? `${presentation.dot}14`
            : `${presentation.dot}24`,
          borderColor: isLight
            ? `${presentation.dot}55`
            : `${presentation.dot}66`,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${presentation.label}`}
    >
      <AnimatedDot
        style={[
          styles.dot,
          { backgroundColor: presentation.dot },
          presentation.pulse ? dotStyle : null,
        ]}
      />
      <Text style={[styles.statusText, { color: textColor }]}>
        {presentation.label}
      </Text>
    </View>
  );
}

function SafeStatusBadge({ isLight, theme }) {
  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: isLight
            ? "rgba(52, 199, 89, 0.12)"
            : "rgba(52, 199, 89, 0.18)",
          borderColor: isLight
            ? "rgba(52, 199, 89, 0.35)"
            : "rgba(52, 199, 89, 0.45)",
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel="Status: Safe"
    >
      <View style={[styles.dot, { backgroundColor: theme.primary ?? "#34C759" }]} />
      <Text
        style={[
          styles.statusText,
          { color: isLight ? "#15803D" : "#86EFAC" },
        ]}
      >
        Safe
      </Text>
    </View>
  );
}

function MyEmergencyHeader({ theme, report, isLight, isIncidentMode }) {
  const subtitle = isIncidentMode && report
    ? getCivilianStatusLine(report)
    : "Track and manage your emergency reports";

  return (
    <View style={styles.wrap} accessibilityRole="header">
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          My Emergency
        </Text>
        <Text
          style={[styles.subtitle, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      {isIncidentMode && report ? (
        <CivilianStatusBadge report={report} isLight={isLight} />
      ) : (
        <SafeStatusBadge isLight={isLight} theme={theme} />
      )}
    </View>
  );
}

export default memo(MyEmergencyHeader);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: TITLE_SIZE,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: SUBTITLE_SIZE,
    lineHeight: 18,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    minHeight: 32,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.25,
  },
});
