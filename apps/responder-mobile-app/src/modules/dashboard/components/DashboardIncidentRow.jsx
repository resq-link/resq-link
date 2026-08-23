import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { MapPin, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { toast } from "@/utils/toast";
import { normalizePriority } from "@packages/firebase";
import useUserStore from "@/store/userStore";
import { acceptIncidentCase } from "@/services/incidentService";
import { toOperationalError } from "@/utils/operationalError";
import { getPriorityColor } from "@/utils/priorityColors";
import PriorityBadge from "@/modules/incidents/components/PriorityBadge";
import CaseStatusBadge from "@/modules/incidents/components/CaseStatusBadge";
import { radii, useResqTheme } from "@/theme";
import {
  formatLocationMeta,
  getCompactNextAction,
  getIncidentRowTitle,
  getIncidentTypeLabel,
} from "@/modules/dashboard/utils/dashboardIncidentUtils";
import { getIncidentTypeIconColors } from "@/modules/dashboard/utils/dashboardIncidentIcons";

export default function DashboardIncidentRow({
  case: caseData,
  onPress,
  onStatusUpdate,
  responderCoords,
  showAcceptInline = true,
}) {
  const { colors, resolvedScheme } = useResqTheme();
  const isLight = resolvedScheme === "light";
  const { user } = useUserStore();
  const priority = normalizePriority(caseData.priority);
  const priorityColor = getPriorityColor(priority, colors);
  const [isAccepting, setIsAccepting] = React.useState(false);

  const incidentLabel = getIncidentTypeLabel(caseData);
  const metaLine = formatLocationMeta(responderCoords, caseData);
  const nextAction = getCompactNextAction(caseData, user);
  const showInlineAccept = showAcceptInline && nextAction === "Accept";
  const typeIcon = getIncidentTypeIconColors(caseData, colors, priorityColor);
  const TypeIcon = typeIcon.Icon;
  const title = getIncidentRowTitle(caseData);

  const handleAccept = async (e) => {
    e?.stopPropagation?.();
    if (!caseData.id || isAccepting) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsAccepting(true);
      toast.message("Accepting…");
      const updatedCase = await acceptIncidentCase(caseData.id);
      onStatusUpdate?.(caseData.id, updatedCase.status || "enroute");
      toast.success("Accepted");
    } catch (err) {
      console.error("[accept]", err);
      toast.error(toOperationalError(err, "Unable to accept incident"));
    } finally {
      setIsAccepting(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: isLight ? colors.border : colors.borderSolid,
          backgroundColor: isLight ? "#FFFFFF" : colors.surfaceCard || "#101B2E",
          marginBottom: 8,
          overflow: "hidden",
        },
        accent: {
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: priorityColor,
        },
        inner: {
          paddingVertical: 10,
          paddingHorizontal: 12,
          paddingLeft: 14,
        },
        topRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 2,
        },
        typeRow: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
        },
        typeIconWell: {
          width: 22,
          height: 22,
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
        },
        typeLabel: {
          flex: 1,
          fontFamily: "Inter_700Bold",
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: colors.textMuted,
        },
        title: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 14,
          color: colors.text,
          marginBottom: 2,
        },
        locationRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 6,
        },
        location: {
          flex: 1,
          fontFamily: "Inter_400Regular",
          fontSize: 12,
          color: colors.textSecondary,
        },
        bottomRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        },
        cta: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          color: colors.accent,
        },
        acceptButton: {
          marginTop: 8,
          minHeight: 34,
          borderRadius: radii.md,
          backgroundColor: colors.accent,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        },
        acceptText: {
          fontFamily: "Inter_700Bold",
          fontSize: 13,
          color: "#FFFFFF",
        },
      }),
    [colors, isLight, priorityColor]
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.86}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${incidentLabel}, ${priority} priority`}
    >
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={styles.typeRow}>
            <View style={[styles.typeIconWell, { backgroundColor: typeIcon.iconBg }]}>
              <TypeIcon size={12} color={typeIcon.iconColor} strokeWidth={2.2} />
            </View>
            <Text style={styles.typeLabel} numberOfLines={1}>
              {incidentLabel}
            </Text>
          </View>
          <PriorityBadge priority={priority} compact />
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.locationRow}>
          <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.location} numberOfLines={1}>
            {caseData.locationText || caseData.address || "No location"}
            {metaLine ? ` · ${metaLine}` : ""}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <CaseStatusBadge status={caseData.status} />
          {!showInlineAccept ? (
            <Text style={styles.cta}>{nextAction} →</Text>
          ) : null}
        </View>

        {showInlineAccept ? (
          <TouchableOpacity
            onPress={handleAccept}
            disabled={isAccepting}
            style={[styles.acceptButton, isAccepting && { opacity: 0.65 }]}
            accessibilityRole="button"
            accessibilityLabel="Accept incident"
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={13} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.acceptText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
