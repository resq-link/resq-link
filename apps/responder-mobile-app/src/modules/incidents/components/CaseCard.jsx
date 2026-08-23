import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { MapPin, Clock, ArrowRight, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { toast } from "@/utils/toast";
import useUserStore from "@/store/userStore";
import { acceptIncidentCase } from "@/services/incidentService";
import { normalizePriority, resolveIncidentDisplayFields } from "@packages/firebase";
import { toOperationalError } from "@/utils/operationalError";
import { getPriorityColor } from "@/utils/priorityColors";
import CaseStatusBadge from "./CaseStatusBadge";
import PriorityBadge from "./PriorityBadge";
import { radii, spacing, useResqTheme } from "@/theme";


export default function CaseCard({ case: caseData, onPress, onStatusUpdate }) {
  const { colors, resolvedScheme } = useResqTheme();
  const isLight = resolvedScheme === "light";
  const priority = normalizePriority(caseData.priority);
  const priorityColor = getPriorityColor(priority, colors);
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

  const handleAcceptCase = async (e) => {
    e?.stopPropagation?.();
    if (!caseData.id) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsAccepting(true);
      toast.message("Accepting incident…");
      const updatedCase = await acceptIncidentCase(caseData.id);
      onStatusUpdate?.(caseData.id, updatedCase.status || "enroute");
      toast.success("Incident accepted");
    } catch (err) {
      console.error("[accept]", err);
      toast.error(toOperationalError(err, "Unable to accept incident"));
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
    return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const { incidentTypeLabel } = resolveIncidentDisplayFields(caseData);
  const incidentLabel = incidentTypeLabel || "Emergency Incident";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.84}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceCard,
          borderColor: isLight ? colors.border : colors.borderSolid,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: priorityColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.typeHeaderRow}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {incidentLabel}
              </Text>
              {caseData.referenceNumber ? (
                <View
                  style={[
                    styles.refBadge,
                    { backgroundColor: colors.accentSubtle ?? colors.chipBg },
                  ]}
                >
                  <Text style={[styles.refBadgeText, { color: colors.accent }]}>
                    #{caseData.referenceNumber}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.badgesRow}>
              <PriorityBadge priority={priority} />
              <CaseStatusBadge status={caseData.status} />
            </View>
          </View>

          <ArrowRight size={18} color={colors.textMuted} strokeWidth={2} />
        </View>

        {caseData.description ? (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {caseData.description}
          </Text>
        ) : null}

        <View style={[styles.footer, { borderTopColor: colors.divider ?? colors.border }]}>
          <View style={styles.locationRow}>
            <MapPin size={13} color={colors.textMuted} strokeWidth={2.2} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {caseData.locationText || caseData.address || "Location on map"}
            </Text>
          </View>

          <View style={styles.timeRow}>
            <Clock size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {formatRelativeTime(caseData.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.viewRow}>
          <Text style={[styles.viewText, { color: colors.accent }]}>View Incident →</Text>
        </View>

        {showAcceptButton ? (
          <TouchableOpacity
            onPress={handleAcceptCase}
            disabled={isAccepting}
            activeOpacity={0.88}
            style={[
              styles.acceptButton,
              { backgroundColor: isAccepting ? colors.disabled : colors.accent },
            ]}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
            )}
            <Text style={styles.acceptButtonText}>
              {isAccepting ? "Accepting…" : "Accept Incident"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    padding: spacing.lg,
    paddingLeft: spacing.lg + 4,
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
    gap: spacing.sm,
    marginBottom: 6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  refBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  refBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
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
    fontSize: 13,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  viewRow: {
    marginTop: spacing.sm,
  },
  viewText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    paddingVertical: 12,
    minHeight: 48,
  },
  acceptButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
