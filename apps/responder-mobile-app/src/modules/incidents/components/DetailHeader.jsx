import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Flame,
  Activity,
  Car,
  ShieldAlert,
  Zap,
  AlertTriangle,
  Clock,
} from "lucide-react-native";
import { radii, spacing, useResqTheme } from "@/theme";
import CaseStatusBadge from "./CaseStatusBadge";

// Format helper for elapsed time
function formatElapsedTime(createdAt) {
  if (!createdAt) return "Reported just now";
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMins < 1) return "Reported just now";
  if (diffMins < 60) return `Reported ${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Reported ${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `Reported ${diffDays}d ago`;
}

// Icon mapping based on category
function getCategoryIcon(category, size, color) {
  switch (category) {
    case "fire":
      return <Flame size={size} color={color} strokeWidth={2.2} />;
    case "medical":
      return <Activity size={size} color={color} strokeWidth={2.2} />;
    case "vehicular_accident":
      return <Car size={size} color={color} strokeWidth={2.2} />;
    case "police_emergency":
      return <ShieldAlert size={size} color={color} strokeWidth={2.2} />;
    case "electrical_powerline_hazard":
      return <Zap size={size} color={color} strokeWidth={2.2} />;
    default:
      return <AlertTriangle size={size} color={color} strokeWidth={2.2} />;
  }
}

// Urgency Name Mapper
function getPriorityLabel(priority) {
  switch (priority?.toLowerCase()) {
    case "critical":
      return "CRITICAL";
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    case "low":
      return "LOW";
    default:
      return "MEDIUM";
  }
}

// Incident Type Name Mapper
function getIncidentTypeName(type) {
  const typeMap = {
    fire: "Fire",
    medical: "Medical Emergency",
    vehicular_accident: "Vehicular Accident",
    police_emergency: "Police Emergency",
    electrical_powerline_hazard: "Electrical / Powerline Hazard",
    other_emergency: "Other Emergency",
  };
  return typeMap[type] || "Emergency";
}

export default function DetailHeader({
  priority = "medium",
  incidentCategory = "other",
  status,
  createdAt,
  onBackPress,
}) {
  const { colors, resolvedScheme } = useResqTheme();
  const insets = useSafeAreaInsets();
  const [elapsedText, setElapsedText] = useState(formatElapsedTime(createdAt));

  // Ticker for elapsed time
  useEffect(() => {
    setElapsedText(formatElapsedTime(createdAt));
    const interval = setInterval(() => {
      setElapsedText(formatElapsedTime(createdAt));
    }, 15000); // update every 15s
    return () => clearInterval(interval);
  }, [createdAt]);

  // Configure background gradient colors based on priority & resolvedScheme
  const getGradientColors = () => {
    const isDark = resolvedScheme === "dark";
    switch (priority?.toLowerCase()) {
      case "critical":
        return isDark
          ? ["#A1172A", "#420A12"]
          : ["#FADBD8", "#FDEDEC"];
      case "high":
        return isDark
          ? ["#A74C23", "#4A1F0D"]
          : ["#FDEBD0", "#FEF9E7"];
      case "medium":
        return isDark
          ? [colors.surface, "#0A1220"]
          : ["#FFFFFF", "#F2F4F4"];
      case "low":
        return isDark
          ? [colors.surface, "#111827"]
          : ["#FFFFFF", "#F8F9FA"];
      default:
        return [colors.surface, colors.background];
    }
  };

  // Determine text & icon colors
  const isCritical = priority?.toLowerCase() === "critical";
  const isHigh = priority?.toLowerCase() === "high";
  const isDark = resolvedScheme === "dark";

  let headerTextColor = colors.text;
  let subTextColor = colors.textSecondary;
  let backArrowColor = colors.textSecondary;
  let badgeBg = "rgba(0,0,0,0.1)";
  let badgeTextColor = colors.textSecondary;

  if (isCritical) {
    headerTextColor = isDark ? "#FFFFFF" : "#78281F";
    subTextColor = isDark ? "rgba(255,255,255,0.75)" : "#943126";
    backArrowColor = isDark ? "#FFFFFF" : "#78281F";
    badgeBg = isDark ? "rgba(255,255,255,0.2)" : "rgba(120,40,31,0.12)";
    badgeTextColor = isDark ? "#FFD0D0" : "#78281F";
  } else if (isHigh) {
    headerTextColor = isDark ? "#FFFFFF" : "#7E5109";
    subTextColor = isDark ? "rgba(255,255,255,0.75)" : "#9A7D0A";
    backArrowColor = isDark ? "#FFFFFF" : "#7E5109";
    badgeBg = isDark ? "rgba(255,255,255,0.2)" : "rgba(126,81,9,0.12)";
    badgeTextColor = isDark ? "#FFE0B2" : "#7E5109";
  }

  const gradientColors = getGradientColors();

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onBackPress}
          style={[styles.backButton, { backgroundColor: isCritical || isHigh ? "rgba(0,0,0,0.05)" : "transparent" }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={backArrowColor} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            {getCategoryIcon(incidentCategory, 22, headerTextColor)}
            <Text style={[styles.title, { color: headerTextColor }]} numberOfLines={1}>
              {getIncidentTypeName(incidentCategory)}
            </Text>
          </View>

          <View style={styles.contextRow}>
            <View style={styles.metaRow}>
              <Clock size={13} color={subTextColor} style={styles.metaIcon} />
              <Text style={[styles.subtitle, { color: subTextColor }]} numberOfLines={1}>
                {elapsedText}
              </Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={[styles.priorityBadge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.priorityText, { color: badgeTextColor }]} numberOfLines={1}>
                  {getPriorityLabel(priority)}
                </Text>
              </View>
              {status && (
                <CaseStatusBadge
                  status={status}
                  style={styles.statusBadge}
                  textStyle={styles.statusBadgeText}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: "relative",
    width: "100%",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 99,
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    rowGap: 6,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    minHeight: 27,
    justifyContent: "center",
  },
  priorityText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statusBadge: {
    minHeight: 27,
    justifyContent: "center",
  },
  statusBadgeText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  metaIcon: {
    marginRight: 4,
  },
  subtitle: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
  },
});
