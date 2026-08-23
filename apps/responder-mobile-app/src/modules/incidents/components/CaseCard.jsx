import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MapPin, Clock, ArrowRight, ShieldAlert, CheckCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import useUserStore from "@/store/userStore";
import { acceptIncidentCase } from "@/services/incidentService";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";
import { normalizePriority } from "@packages/firebase";
import { radii, spacing, useResqTheme } from "@/theme";

export default function CaseCard({ case: caseData, onPress, onStatusUpdate }) {
  const { colors, resolvedScheme } = useResqTheme();
  const isLight = resolvedScheme === "light";
  const priority = normalizePriority(caseData.priority);
  const [isAccepting, setIsAccepting] = useState(false);
  const { user } = useUserStore();

  const isAssignedResponder =
    user && caseData.assignedResourceIds && caseData.assignedResourceIds.includes(user.uid);
  const showAcceptButton =
    isAssignedResponder &&
    (caseData.status === "pending" ||
      caseData.status === "dispatched" ||
      caseData.status === "awaiting_resources" ||
      caseData.status === "active");

  const handleAcceptCase = async () => {
    if (!caseData.id) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsAccepting(true);
      const updatedCase = await acceptIncidentCase(caseData.id);
      onStatusUpdate?.(caseData.id, updatedCase.status || "enroute");
    } catch (err) {
      console.error("Error accepting case:", err);
    } finally {
      setIsAccepting(false);
    }
  };

  const formatRelativeTime = (dateInput) => {
    if (!dateInput) return "Unknown";
    let dateObj;
    if (typeof dateInput?.toDate === "function") {
      dateObj = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (dateInput?._seconds) {
      dateObj = new Date(dateInput._seconds * 1000);
    } else {
      dateObj = new Date(dateInput);
    }

    if (isNaN(dateObj.getTime())) return "Recent";

    const diffMs = Date.now() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getIncidentTypeName = (type) => {
    const typeMap = {
      fire: "Fire Emergency",
      medical: "Medical Emergency",
      vehicular_accident: "Vehicular Accident",
      police_emergency: "Police Emergency",
      electrical_powerline_hazard: "Powerline Hazard",
      other_emergency: "Other Emergency",
      flood_rescue: "Flood Rescue",
    };
    return typeMap[type] || "Emergency Incident";
  };

  const getPriorityColor = () => {
    if (priority === "critical") return "#DC2626";
    if (priority === "high") return "#7C3AED";
    if (priority === "medium") return "#EAB308";
    return "#10B981";
  };

  const priorityColor = getPriorityColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.84}
      style={[
        styles.card,
        {
          backgroundColor: isLight ? "#FFFFFF" : "#101E34",
          borderColor: isLight
            ? priority === "critical"
              ? "rgba(220, 38, 38, 0.45)"
              : "rgba(0, 0, 0, 0.08)"
            : priority === "critical"
            ? "rgba(220, 38, 38, 0.55)"
            : "rgba(255, 255, 255, 0.08)",
          shadowColor: isLight ? "#000000" : priorityColor,
          shadowOpacity: isLight ? 0.06 : 0.16,
        },
      ]}
    >
      {/* Left priority accent indicator bar */}
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: priorityColor,
          },
        ]}
      />

      <View style={styles.content}>
        {/* Top meta row: Category, Reference, and Priority Badge */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.typeHeaderRow}>
              <Text
                style={[
                  styles.title,
                  { color: isLight ? "#0F172A" : "#F8FAFC" },
                ]}
                numberOfLines={1}
              >
                {getIncidentTypeName(caseData.incidentType)}
              </Text>
              {caseData.referenceNumber && (
                <View
                  style={[
                    styles.refBadge,
                    {
                      backgroundColor: isLight
                        ? "rgba(59, 130, 246, 0.10)"
                        : "rgba(59, 130, 246, 0.18)",
                    },
                  ]}
                >
                  <Text style={styles.refBadgeText}>
                    #{caseData.referenceNumber}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.badgesRow}>
              <CaseStatusBadge status={caseData.status} />
              <PriorityBadge priority={priority} />
            </View>
          </View>

          <ArrowRight
            size={18}
            color={isLight ? "#94A3B8" : "#64748B"}
            strokeWidth={2}
          />
        </View>

        {/* Incident description */}
        {caseData.description ? (
          <Text
            style={[
              styles.description,
              { color: isLight ? "#475569" : "#94A3B8" },
            ]}
            numberOfLines={2}
          >
            {caseData.description}
          </Text>
        ) : null}

        {/* Location & Time Footer */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: isLight
                ? "rgba(0, 0, 0, 0.05)"
                : "rgba(255, 255, 255, 0.06)",
            },
          ]}
        >
          <View style={styles.locationRow}>
            <MapPin
              size={13}
              color={isLight ? "#64748B" : "#94A3B8"}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.locationText,
                { color: isLight ? "#475569" : "#CBD5E1" },
              ]}
              numberOfLines={1}
            >
              {caseData.locationText || caseData.address || "Location on map"}
            </Text>
          </View>

          <View style={styles.timeRow}>
            <Clock
              size={12}
              color={isLight ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.timeText,
                { color: isLight ? "#64748B" : "#94A3B8" },
              ]}
            >
              {formatRelativeTime(caseData.createdAt)}
            </Text>
          </View>
        </View>

        {/* Quick Accept CTA Button */}
        {showAcceptButton && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleAcceptCase();
            }}
            disabled={isAccepting}
            activeOpacity={0.88}
            style={[
              styles.acceptButton,
              {
                backgroundColor: isAccepting
                  ? isLight
                    ? "#CBD5E1"
                    : "#334155"
                  : "#2563EB",
              },
            ]}
          >
            <ShieldAlert size={16} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.acceptButtonText}>
              {isAccepting ? "Accepting Dispatch..." : "Accept Case & En Route"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  content: {
    padding: 16,
    paddingLeft: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  typeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  refBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  refBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#3B82F6",
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 2,
    marginBottom: 10,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  locationRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  locationText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12.5,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11.5,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  acceptButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
