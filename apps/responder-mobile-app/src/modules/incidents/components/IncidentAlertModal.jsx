import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle, MapPin, BellRing } from "lucide-react-native";
import { normalizePriority } from "@packages/firebase";
import { radii, spacing, useResqTheme } from "@/theme";

const PRIORITY_LABEL = {
  critical: "CRITICAL",
  high: "HIGH PRIORITY",
  medium: "MEDIUM PRIORITY",
  low: "LOW PRIORITY",
};

const priorityColor = (colors, level) =>
  ({
    critical: colors.priorityCritical ?? colors.critical ?? colors.error,
    high: colors.priorityHigh ?? colors.warning,
    medium: colors.priorityMedium ?? colors.info,
    low: colors.priorityLow ?? colors.textSecondary,
  }[level] ?? colors.warning);

/**
 * Blocking assignment alarm.
 *
 * Acknowledge accepts the incident and stops the alarm.
 * View details opens the case without accepting.
 */
export default function IncidentAlertModal({
  incident,
  onAcknowledge,
  isAcknowledging,
}) {
  const { colors } = useResqTheme();
  const router = useRouter();
  const pulse = useRef(new Animated.Value(0)).current;

  const visible = Boolean(incident);

  useEffect(() => {
    if (!visible) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 620,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  if (!incident) return null;

  const level = normalizePriority(incident.priority);
  const accent = priorityColor(colors, level);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.62] });

  const openDetails = () => {
    if (incident.id) router.push(`/incident/${incident.id}`);
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: accent },
          ]}
        >
          <View style={styles.iconWrap}>
            <Animated.View
              style={[
                styles.pulseRing,
                { backgroundColor: accent, opacity: glow, transform: [{ scale }] },
              ]}
            />
            <View style={[styles.iconCircle, { backgroundColor: accent }]}>
              <BellRing size={30} color={colors.white ?? "#FFFFFF"} />
            </View>
          </View>

          <Text style={[styles.priority, { color: accent }]}>
            {PRIORITY_LABEL[level] ?? "NEW ASSIGNMENT"}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {incident.incidentTypeLabel ||
              incident.incidentSubtypeLabel ||
              incident.incidentCategory ||
              "New incident assigned"}
          </Text>

          {incident.locationText || incident.address || incident.barangay ? (
            <View style={styles.locationRow}>
              <MapPin size={15} color={colors.textSecondary} />
              <Text
                style={[styles.location, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {incident.locationText || incident.address || incident.barangay}
              </Text>
            </View>
          ) : null}

          {incident.description ? (
            <View
              style={[
                styles.descriptionWrap,
                { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.description, { color: colors.text }]}
                numberOfLines={3}
              >
                {incident.description}
              </Text>
            </View>
          ) : null}

          <View style={styles.noticeRow}>
            <AlertTriangle size={13} color={colors.textMuted} />
            <Text style={[styles.notice, { color: colors.textMuted }]}>
              Acknowledge accepts this incident and marks you En Route. View opens
              the case without accepting.
            </Text>
          </View>

          <TouchableOpacity
            onPress={onAcknowledge}
            disabled={isAcknowledging}
            style={[
              styles.primaryButton,
              { backgroundColor: accent },
              isAcknowledging && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Acknowledge alert, accept incident, and go en route"
          >
            <Text style={[styles.primaryText, { color: colors.white ?? "#FFFFFF" }]}>
              {isAcknowledging ? "ACKNOWLEDGING…" : "ACKNOWLEDGE"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openDetails}
            disabled={isAcknowledging}
            style={[
              styles.secondaryButton,
              { borderColor: colors.border },
              isAcknowledging && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="View incident details without accepting"
          >
            <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
              View details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: spacing.lg,
    alignItems: "center",
  },
  iconWrap: {
    width: 78,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  pulseRing: {
    position: "absolute",
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  priority: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  location: {
    fontSize: 13,
    flexShrink: 1,
    textAlign: "center",
  },
  descriptionWrap: {
    width: "100%",
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.md,
  },
  notice: {
    fontSize: 11,
  },
  primaryButton: {
    width: "100%",
    height: 54,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  secondaryButton: {
    width: "100%",
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
});
