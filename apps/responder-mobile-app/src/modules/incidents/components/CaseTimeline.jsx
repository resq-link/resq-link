import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Check, Clock } from "lucide-react-native";
import { radii, spacing } from "@/theme";

export default function CaseTimeline({ caseData, colors, formatDate, formatResponseTime }) {
  const getStepState = (stepKey) => {
    const status = String(caseData.status || "").toLowerCase();
    const hasAccepted = !!caseData.acceptedAt;
    const hasTouchdown = !!caseData.touchdownAt;
    const hasPostReport = !!caseData.postIncidentReport?.submittedAt;
    const isEnRouteOrBeyond =
      status === "enroute" ||
      status === "on_scene" ||
      status === "done" ||
      status === "resolved" ||
      hasTouchdown ||
      hasPostReport;

    switch (stepKey) {
      case "reported":
        return { state: "completed", time: caseData.createdAt };

      case "accepted":
        if (hasAccepted) return { state: "completed", time: caseData.acceptedAt };
        if (isEnRouteOrBeyond) return { state: "completed" };
        if (status === "pending" || status === "dispatched" || status === "awaiting_resources") {
          return { state: "active" };
        }
        return { state: "future" };

      case "enroute":
        if (status === "on_scene" || status === "done" || status === "resolved" || hasTouchdown || hasPostReport) {
          return { state: "completed" };
        }
        if (status === "enroute") return { state: "active" };
        return { state: "future" };

      case "touchdown":
        if (hasTouchdown) return { state: "completed", time: caseData.touchdownAt };
        if (hasPostReport || status === "done" || status === "resolved") return { state: "completed" };
        if (status === "on_scene") return { state: "active" };
        return { state: "future" };

      case "post_report":
        if (hasPostReport) {
          return { state: "completed", time: caseData.postIncidentReport.submittedAt };
        }
        if (status === "done" || status === "resolved") return { state: "active" };
        return { state: "future" };

      default:
        return { state: "future" };
    }
  };

  const rawSteps = [
    { key: "reported", label: "Incident Reported" },
    { key: "accepted", label: "Case Accepted" },
    { key: "enroute", label: "En Route to Scene" },
    { key: "touchdown", label: "Touchdown on Scene" },
    { key: "post_report", label: "Post-Incident Report" },
  ].map((step) => ({
    ...step,
    ...getStepState(step.key),
  }));

  const steps = rawSteps.map((step, index) => {
    const hasCompletedLaterStep = rawSteps
      .slice(index + 1)
      .some((laterStep) => laterStep.state === "completed");

    if (step.state !== "completed" && hasCompletedLaterStep) {
      return { ...step, state: "completed" };
    }

    return step;
  });

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const hasActiveStep = steps.some((step) => step.state === "active");
    if (!hasActiveStep) return undefined;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim, steps]);

  const renderDot = (step) => {
    if (step.state === "completed") {
      return (
        <View style={[styles.dot, styles.completedDot, { backgroundColor: colors.accent }]}>
          <Check size={10} color="#FFFFFF" strokeWidth={3} />
        </View>
      );
    }

    if (step.state === "active") {
      return (
        <View style={styles.activeDotContainer}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                backgroundColor: colors.accent,
                opacity: pulseAnim,
                transform: [
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [0.4, 1],
                      outputRange: [1, 1.8],
                    }),
                  },
                ],
              },
            ]}
          />
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        </View>
      );
    }

    return <View style={[styles.dot, styles.futureDot, { borderColor: colors.border }]} />;
  };

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const lineColor =
          step.state === "completed" && steps[index + 1]?.state === "completed"
            ? colors.accent
            : colors.border;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.leftCol}>
              {renderDot(step)}
              {!isLast ? <View style={[styles.line, { backgroundColor: lineColor }]} /> : null}
            </View>

            <View style={styles.rightCol}>
              <Text
                style={[
                  styles.label,
                  {
                    color:
                      step.state === "completed"
                        ? colors.text
                        : step.state === "active"
                          ? colors.accent
                          : colors.textMuted,
                    fontFamily:
                      step.state === "active" ? "SpaceGrotesk_700Bold" : "SpaceGrotesk_600SemiBold",
                  },
                ]}
              >
                {step.label}
              </Text>

              {step.time ? (
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  {formatDate(step.time)}
                </Text>
              ) : step.state === "completed" ? (
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  Completed
                </Text>
              ) : step.state === "active" ? (
                <Text style={[styles.activeStatusText, { color: colors.accent }]}>
                  In Progress
                </Text>
              ) : (
                <Text style={[styles.pendingText, { color: colors.textMuted }]}>Pending</Text>
              )}

              {step.key === "accepted" &&
              step.state === "completed" &&
              caseData.responseTimeSeconds != null ? (
                <View
                  style={[
                    styles.responsePill,
                    {
                      backgroundColor: colors.surfaceHighlight,
                      borderColor: colors.accent + "30",
                    },
                  ]}
                >
                  <Clock size={12} color={colors.accent} style={styles.responseIcon} />
                  <Text style={[styles.responseText, { color: colors.accent }]}>
                    {formatResponseTime(caseData.responseTimeSeconds)} response
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 65,
  },
  leftCol: {
    alignItems: "center",
    marginRight: spacing.md,
    width: 24,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  completedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  activeDotContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  pulseRing: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    zIndex: 1,
  },
  futureDot: {
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  line: {
    width: 2,
    position: "absolute",
    top: 14,
    bottom: -10,
    zIndex: 1,
  },
  rightCol: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  label: {
    fontSize: 14,
  },
  timeText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  activeStatusText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  pendingText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  responsePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  responseIcon: {
    marginRight: 4,
  },
  responseText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 11,
  },
});
