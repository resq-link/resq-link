import React, { memo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Radio } from "lucide-react-native";
import StatusBadge from "@/components/badges/StatusBadge";
import { getIncidentMeta } from "@/features/history/constants";
import {
  getIncidentStatusPresentation,
  getLastUpdatedTimestamp,
} from "@/features/emergency/utils/incidentStatus";

const ACCENT = "#9AFF55";

function CompactPulse() {
  const channelWave = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(channelWave, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, {
          toValue: 1,
          duration: 1700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    ringLoop.start();

    return () => {
      loop.stop();
      ringLoop.stop();
    };
  }, [channelWave, ringPulse]);

  const hubScale = channelWave.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.06, 1],
  });
  const ringScale = ringPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.65],
  });
  const ringOpacity = ringPulse.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0.45, 0.3, 0],
  });

  return (
    <View style={styles.pulseWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { borderColor: ACCENT, opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.hub,
          { backgroundColor: `${ACCENT}24`, transform: [{ scale: hubScale }] },
        ]}
      >
        <Radio size={22} color={ACCENT} strokeWidth={2.4} />
      </Animated.View>
    </View>
  );
}

function IncidentStatusSection({ report, colors }) {
  const presentation = getIncidentStatusPresentation(report);
  const meta = getIncidentMeta(report?.incidentType, report?.typeProfile);
  const lastUpdated = getLastUpdatedTimestamp(report);
  const metaLine = [meta.label, lastUpdated ? `Updated ${lastUpdated}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.wrap}>
      <View style={styles.mainRow}>
        {presentation.showPulse ? <CompactPulse /> : null}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={2}
              accessibilityRole="header"
            >
              {presentation.title}
            </Text>
            <StatusBadge status={report?.status || "pending"} />
          </View>

          {metaLine ? (
            <Text
              style={[styles.meta, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {metaLine}
            </Text>
          ) : null}

          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={3}
          >
            {presentation.description}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default memo(IncidentStatusSection);

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 2,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pulseWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  ring: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  hub: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  meta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
