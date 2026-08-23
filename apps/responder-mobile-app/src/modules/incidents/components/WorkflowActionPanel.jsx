import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { Check, ClipboardList, Navigation } from "lucide-react-native";
import { toast } from "@/utils/toast";
import ErrorAlert from "@/components/feedback/ErrorAlert";
import { radii, spacing } from "@/theme";

/**
 * Single primary CTA for incident workflow — secondary actions stay subordinate.
 */
export default function WorkflowActionPanel({
  colors,
  resolvedScheme,
  insets,
  error,
  onDismissError,
  showAcceptButton,
  isUpdating,
  onAccept,
  onDecline,
  canMarkTouchdown,
  isTouchdownUpdating,
  touchdownDistanceMeters,
  onTouchdown,
  canSubmitSceneAssessment,
  canSubmitPostReport,
  showPostReportBlocked,
  hasSceneAssessment,
  isSubmittingSceneAssessment,
  isSubmittingPostReport,
  onOpenSceneAssessment,
  onOpenPostReport,
  isResolved,
}) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        panel: {
          position: "absolute",
          left: spacing.lg,
          right: spacing.lg,
          bottom: Math.max(insets.bottom, spacing.md),
          zIndex: 30,
        },
        sheetError: {
          marginBottom: spacing.sm,
        },
        actionRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        },
        primaryActionButton: {
          flex: 1,
          minHeight: 52,
          borderRadius: radii.lg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          paddingHorizontal: spacing.md,
        },
        primaryActionText: {
          fontFamily: "Inter_700Bold",
          fontSize: 15,
          color: "#FFFFFF",
        },
        secondaryActionButton: {
          minHeight: 52,
          minWidth: 96,
          borderRadius: radii.lg,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.error + "45",
          backgroundColor: colors.background,
        },
        secondaryActionText: {
          fontFamily: "Inter_700Bold",
          fontSize: 14,
          color: colors.error,
        },
        secondaryOutlineActionButton: {
          minHeight: 52,
          borderRadius: radii.lg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        secondaryOutlineActionText: {
          fontFamily: "Inter_700Bold",
          fontSize: 15,
          color: colors.text,
        },
        actionIcon: {
          marginRight: spacing.sm,
        },
        actionDisabled: {
          opacity: 0.55,
        },
        proximityText: {
          fontFamily: "Inter_400Regular",
          fontSize: 13,
          color: colors.textSecondary,
          textAlign: "center",
          marginBottom: spacing.sm,
        },
        completedPanel: {
          flexDirection: "row",
          alignItems: "center",
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.accent + "88",
          backgroundColor:
            resolvedScheme === "dark"
              ? "rgba(26, 143, 104, 0.78)"
              : "rgba(240, 253, 250, 0.94)",
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          minHeight: 58,
          overflow: "hidden",
        },
        completedText: {
          fontFamily: "Inter_700Bold",
          fontSize: 15,
          color: colors.accent,
        },
        completedSubtext: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
          color: colors.text,
          marginTop: 2,
        },
        disabledPostReportButton: {
          minHeight: 52,
          borderRadius: radii.lg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceHighlight,
          opacity: 0.72,
        },
        disabledPostReportText: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 15,
          color: colors.textMuted,
        },
        postReportHelperText: {
          fontFamily: "Inter_400Regular",
          fontSize: 12,
          lineHeight: 17,
          color: colors.textMuted,
          textAlign: "center",
          paddingHorizontal: spacing.sm,
          marginTop: spacing.xs,
        },
      }),
    [colors, insets.bottom, resolvedScheme]
  );

  const formatDistance = (meters) => {
    if (meters == null) return null;
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km from incident`;
    return `${Math.round(meters)} m from incident`;
  };

  let primary = null;

  if (showAcceptButton) {
    primary = (
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={onAccept}
          disabled={isUpdating}
          activeOpacity={0.85}
          style={[
            styles.primaryActionButton,
            { backgroundColor: colors.accent },
            isUpdating && styles.actionDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Accept this emergency case"
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.actionIcon} />
          ) : (
            <Check size={19} color="#FFFFFF" style={styles.actionIcon} />
          )}
          <Text style={styles.primaryActionText}>
            {isUpdating ? "Accepting incident…" : "Accept Incident"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDecline}
          disabled={isUpdating}
          activeOpacity={0.85}
          style={[styles.secondaryActionButton, isUpdating && styles.actionDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Decline this emergency case"
        >
          <Text style={styles.secondaryActionText}>Decline</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (canMarkTouchdown) {
    primary = (
      <>
        {touchdownDistanceMeters != null ? (
          <Text style={styles.proximityText}>{formatDistance(touchdownDistanceMeters)}</Text>
        ) : null}
        <TouchableOpacity
          onPress={onTouchdown}
          disabled={isTouchdownUpdating}
          activeOpacity={0.85}
          style={[
            styles.primaryActionButton,
            { backgroundColor: colors.accent },
            isTouchdownUpdating && styles.actionDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mark arrival at scene"
        >
          {isTouchdownUpdating ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.actionIcon} />
          ) : (
            <Navigation size={20} color="#FFFFFF" style={styles.actionIcon} />
          )}
          <Text style={styles.primaryActionText}>
            {isTouchdownUpdating ? "Marking Touchdown…" : "Touchdown"}
          </Text>
        </TouchableOpacity>
      </>
    );
  } else if (canSubmitSceneAssessment && !hasSceneAssessment) {
    primary = (
      <TouchableOpacity
        onPress={onOpenSceneAssessment}
        disabled={isSubmittingSceneAssessment}
        activeOpacity={0.85}
        style={[
          styles.primaryActionButton,
          { backgroundColor: colors.accent },
          isSubmittingSceneAssessment && styles.actionDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Submit scene assessment"
      >
        <ClipboardList size={19} color="#FFFFFF" style={styles.actionIcon} />
        <Text style={styles.primaryActionText}>
          {isSubmittingSceneAssessment ? "Submitting…" : "Scene Assessment"}
        </Text>
      </TouchableOpacity>
    );
  } else if (canSubmitPostReport) {
    primary = (
      <TouchableOpacity
        onPress={onOpenPostReport}
        disabled={isSubmittingPostReport}
        activeOpacity={0.85}
        style={[
          styles.primaryActionButton,
          { backgroundColor: colors.accent },
          isSubmittingPostReport && styles.actionDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Submit post incident report"
      >
        <Check size={19} color="#FFFFFF" style={styles.actionIcon} />
        <Text style={styles.primaryActionText}>
          {isSubmittingPostReport ? "Submitting…" : "Post Report"}
        </Text>
      </TouchableOpacity>
    );
  } else if (canSubmitSceneAssessment && hasSceneAssessment) {
    primary = (
      <TouchableOpacity
        onPress={onOpenSceneAssessment}
        disabled={isSubmittingSceneAssessment}
        activeOpacity={0.85}
        style={[
          styles.secondaryOutlineActionButton,
          isSubmittingSceneAssessment && styles.actionDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Update scene assessment"
      >
        <ClipboardList size={19} color={colors.text} style={styles.actionIcon} />
        <Text style={styles.secondaryOutlineActionText}>Update Assessment</Text>
      </TouchableOpacity>
    );
  } else if (showPostReportBlocked) {
    primary = (
      <>
        <TouchableOpacity
          onPress={() => toast.message("Complete Scene Assessment first")}
          activeOpacity={0.85}
          style={styles.disabledPostReportButton}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
        >
          <Check size={19} color={colors.textMuted} style={styles.actionIcon} />
          <Text style={styles.disabledPostReportText}>Post Report</Text>
        </TouchableOpacity>
        <Text style={styles.postReportHelperText}>
          Complete Scene Assessment before submitting your final report.
        </Text>
      </>
    );
  } else if (isResolved) {
    primary = (
      <BlurView
        intensity={80}
        tint={resolvedScheme === "dark" ? "dark" : "light"}
        style={styles.completedPanel}
      >
        <Check size={20} color={colors.accent} style={styles.actionIcon} />
        <View>
          <Text style={styles.completedText}>Case Completed</Text>
          <Text style={styles.completedSubtext}>This case is finalized.</Text>
        </View>
      </BlurView>
    );
  }

  if (!primary && !error) return null;

  return (
    <View style={styles.panel}>
      {error ? (
        <View style={styles.sheetError}>
          <ErrorAlert message={error} onDismiss={onDismissError} />
        </View>
      ) : null}
      {primary}
    </View>
  );
}
