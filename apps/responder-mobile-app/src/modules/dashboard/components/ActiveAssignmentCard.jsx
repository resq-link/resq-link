import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ArrowRight, MapPin, Check } from "lucide-react-native";
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

export default function ActiveAssignmentCard({
  case: caseData,
  onPress,
  onStatusUpdate,
  responderCoords,
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
  const showInlineAccept = nextAction === "Accept";
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
        card: {
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: isLight ? colors.border : colors.borderSolid,
          backgroundColor: isLight ? "#FFFFFF" : colors.surfaceCard || "#101B2E",
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
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
          gap: 8,
        },
        typeRow: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
        },
        typeIconWell: {
          width: 24,
          height: 24,
          borderRadius: 7,
          alignItems: "center",
          justifyContent: "center",
        },
        typeLabel: {
          fontFamily: "Inter_700Bold",
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: colors.textMuted,
          flex: 1,
        },
        title: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 15,
          color: colors.text,
          marginBottom: 4,
        },
        locationRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          marginBottom: 8,
        },
        location: {
          flex: 1,
          fontFamily: "Inter_400Regular",
          fontSize: 12,
          color: colors.textSecondary,
        },
        footerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        },
        cta: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
          color: colors.accent,
        },
        acceptButton: {
          marginTop: 8,
          minHeight: 36,
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
      activeOpacity={0.88}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Active assignment: ${incidentLabel}`}
    >
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <View style={styles.typeRow}>
            <View style={[styles.typeIconWell, { backgroundColor: typeIcon.iconBg }]}>
              <TypeIcon size={13} color={typeIcon.iconColor} strokeWidth={2.2} />
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
          <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.location} numberOfLines={1}>
            {caseData.locationText || caseData.address || "No location"}
            {metaLine ? ` · ${metaLine}` : ""}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <CaseStatusBadge status={caseData.status} />
          {!showInlineAccept ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Text style={styles.cta}>{nextAction}</Text>
              <ArrowRight size={14} color={colors.accent} strokeWidth={2.2} />
            </View>
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
                <Check size={14} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.acceptText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
