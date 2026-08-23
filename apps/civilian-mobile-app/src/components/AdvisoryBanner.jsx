import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { AlertTriangle, ChevronRight, Megaphone, Radio, ShieldAlert } from "lucide-react-native";
import { useRouter } from "expo-router";

const SEVERITY_THEMES = {
  critical: {
    bg: "#450a0a",
    border: "#ef4444",
    badgeBg: "#ef4444",
    badgeText: "#ffffff",
    label: "CRITICAL ALERT",
    beacon: "#ef4444",
  },
  severe: {
    bg: "#431407",
    border: "#f97316",
    badgeBg: "#f97316",
    badgeText: "#ffffff",
    label: "SEVERE WARNING",
    beacon: "#f97316",
  },
  moderate: {
    bg: "#451a03",
    border: "#f59e0b",
    badgeBg: "#f59e0b",
    badgeText: "#18181b",
    label: "MODERATE ADVISORY",
    beacon: "#f59e0b",
  },
  info: {
    bg: "#082f49",
    border: "#0ea5e9",
    badgeBg: "#0ea5e9",
    badgeText: "#ffffff",
    label: "PUBLIC NOTICE",
    beacon: "#0ea5e9",
  },
};

export default function AdvisoryBanner({ advisories = [], theme }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.3, { duration: 1000, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withTiming(0.1, { duration: 1000, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // Cycle if multiple advisories
  useEffect(() => {
    if (advisories.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % advisories.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [advisories.length]);

  if (!advisories || advisories.length === 0) return null;

  const current = advisories[currentIndex] || advisories[0];
  const severityKey = String(current.severity || "info").toLowerCase();
  const themeMeta = SEVERITY_THEMES[severityKey] || SEVERITY_THEMES.info;

  const beaconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePress = () => {
    if (current?.id) {
      router.push({
        pathname: "/advisory-detail",
        params: { id: current.id },
      });
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: themeMeta.bg,
          borderColor: themeMeta.border,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={`Public Advisory: ${current.title}`}
      >
        <View style={styles.topRow}>
          <View style={styles.badgeWrap}>
            {/* Pulsing Beacon Indicator */}
            <View style={styles.beaconWrap}>
              <Animated.View
                style={[
                  styles.beaconRing,
                  { backgroundColor: themeMeta.beacon },
                  beaconAnim,
                ]}
              />
              <View style={[styles.beaconDot, { backgroundColor: themeMeta.beacon }]} />
            </View>

            <View style={[styles.badge, { backgroundColor: themeMeta.badgeBg }]}>
              <Text style={[styles.badgeText, { color: themeMeta.badgeText }]}>
                {themeMeta.label}
              </Text>
            </View>

            {advisories.length > 1 && (
              <Text style={styles.counterText}>
                {currentIndex + 1}/{advisories.length}
              </Text>
            )}
          </View>

          <View style={styles.actionPrompt}>
            <Text style={styles.actionPromptText}>View details</Text>
            <ChevronRight size={14} color="#f4f4f5" />
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {current.title}
        </Text>

        <Text style={styles.summary} numberOfLines={2}>
          {current.summary || current.content}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  pressable: {
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  badgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  beaconWrap: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  beaconRing: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  beaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  counterText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#a1a1aa",
  },
  actionPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionPromptText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#f4f4f5",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#ffffff",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  summary: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#e4e4e7",
    lineHeight: 16,
  },
});
