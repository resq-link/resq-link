import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClipboardCheck, Navigation, CheckCircle2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import CustomButton from "@/components/ui/CustomButton";
import ErrorAlert from "@/components/feedback/ErrorAlert";
import { radii, spacing, useResqTheme } from "@/theme";

export default function StickyActionBar({
  caseData,
  onAcceptCase,
  onDeclinePress,
  isUpdating,
  showAcceptButton,
  canMarkTouchdown,
  isTouchdownUpdating,
  handleTouchdown,
  touchdownDistanceMeters,
  canSubmitPostReport,
  isSubmittingPostReport,
  onPostReportPress,
  error,
  setError,
}) {
  const { colors, resolvedScheme } = useResqTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(150)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 60,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const bottomPadding = Math.max(insets.bottom, spacing.md);

  const containerStyles = [
    styles.container,
    {
      paddingBottom: bottomPadding,
      borderTopColor: colors.border,
      backgroundColor:
        resolvedScheme === "dark"
          ? "rgba(11, 21, 38, 0.85)"
          : "rgba(255, 255, 255, 0.90)",
    },
  ];

  const renderContent = () => {
    if (showAcceptButton) {
      return (
        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <CustomButton
              title={isUpdating ? "Accepting..." : "Accept Case"}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onAcceptCase();
              }}
              disabled={isUpdating}
              variant="primary"
              style={styles.acceptBtn}
              accessibilityLabel="Accept this emergency case"
              accessibilityRole="button"
            />
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDeclinePress();
            }}
            disabled={isUpdating}
            style={[styles.declineBtn, isUpdating && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Decline this emergency case"
          >
            <Text style={[styles.declineBtnText, { color: colors.error }]}>Decline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (canMarkTouchdown) {
      return (
        <View style={styles.operationalRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              handleTouchdown("manual", touchdownDistanceMeters);
            }}
            disabled={isTouchdownUpdating}
            activeOpacity={0.85}
            style={[
              styles.touchdownButton,
              { backgroundColor: colors.accent },
              isTouchdownUpdating && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Mark arrival at scene - Touchdown"
          >
            <Navigation size={20} color={colors.white} style={styles.buttonIcon} />
            <Text style={styles.touchdownButtonText}>
              {isTouchdownUpdating ? "Marking Touchdown..." : "Touchdown"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (canSubmitPostReport) {
      return (
        <View style={styles.operationalRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onPostReportPress();
            }}
            disabled={isSubmittingPostReport}
            activeOpacity={0.85}
            style={[
              styles.postReportButton,
              { backgroundColor: colors.accent },
              isSubmittingPostReport && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Submit post incident report"
          >
            <ClipboardCheck size={20} color={colors.white} style={styles.buttonIcon} />
            <Text style={styles.postReportButtonText}>
              {isSubmittingPostReport ? "Submitting Post Report..." : "Post Report"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (caseData.status === "done" || caseData.status === "resolved") {
      return (
        <View
          style={[
            styles.completedBadge,
            {
              backgroundColor: colors.surfaceHighlight,
              borderColor: colors.accent + "40",
            },
          ]}
        >
          <CheckCircle2 size={18} color={colors.accent} style={styles.buttonIcon} />
          <View>
            <Text style={[styles.completedText, { color: colors.accent }]}>
              Case Completed
            </Text>
            <Text style={[styles.completedSubtext, { color: colors.textSecondary }]}>
              This case is finalized and cannot be modified.
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Animated.View
      style={[
        containerStyles,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={85}
          tint={resolvedScheme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View style={styles.inner}>
        {error ? (
          <View style={styles.errorContainer}>
            <ErrorAlert message={error} onDismiss={() => setError("")} />
          </View>
        ) : null}
        {renderContent()}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    zIndex: 100,
  },
  inner: {
    width: "100%",
  },
  errorContainer: {
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  acceptBtn: {
    paddingVertical: 14,
  },
  declineBtn: {
    minWidth: 100,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtnText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
  operationalRow: {
    gap: spacing.md,
  },
  touchdownButton: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  touchdownButtonText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  postReportButton: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  postReportButtonText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  completedBadge: {
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  completedText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  completedSubtext: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
});
