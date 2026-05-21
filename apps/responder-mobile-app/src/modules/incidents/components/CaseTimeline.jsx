import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Check, Clock, AlertCircle } from "lucide-react-native";
import { radii, spacing } from "@/theme";

export default function CaseTimeline({ caseData, colors, formatDate, formatResponseTime }) {
  // Determine states for each step
  const getStepState = (stepKey) => {
    const status = caseData.status;
    const hasAccepted = !!caseData.acceptedAt;
    const hasTouchdown = !!caseData.touchdownAt;
    const hasPostReport = !!caseData.postIncidentReport?.submittedAt;

    switch (stepKey) {
      case "reported":
        return { state: "completed", time: caseData.createdAt };
      
      case "accepted":
        if (hasAccepted) {
          return { state: "completed", time: caseData.acceptedAt };
        }
        if (status === "pending" || status === "dispatched" || status === "awaiting_resources") {
          return { state: "active" };
        }
        return { state: "future" };

      case "enroute":
        if (status === "on_scene" || status === "done" || hasTouchdown) {
          return { state: "completed" };
        }
        if (status === "enroute") {
          return { state: "active" };
        }
        return { state: "future" };

      case "touchdown":
        if (hasTouchdown) {
          return { state: "completed", time: caseData.touchdownAt };
        }
        if (status === "on_scene") {
          return { state: "active" };
        }
        return { state: "future" };

      case "post_report":
        if (hasPostReport) {
          return { state: "completed", time: caseData.postIncidentReport.submittedAt };
        }
        if (status === "done") {
          return { state: "active" };
        }
        return { state: "future" };

      default:
        return { state: "future" };
    }
  };

  const steps = [
    { key: "reported", label: "Incident Reported" },
    { key: "accepted", label: "Case Accepted" },
    { key: "enroute", label: "En Route to Scene" },
    { key: "touchdown", label: "Touchdown on Scene" },
    { key: "post_report", label: "Post-Incident Report" },
  ].map((step) => ({
    ...step,
    ...getStepState(step.key),
  }));

  // Pulse animation for the active step
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const hasActiveStep = steps.some((s) => s.state === "active");
    if (!hasActiveStep) return;

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
  }, [pulseAnim, caseData.status]);

  const renderDot = (step) => {
    if (step.state === "completed") {
      return (
        <View style={[styles.dot, styles.completedDot, { backgroundColor: colors.success }]}>
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

    // Future/Muted
    return <View style={[styles.dot, styles.futureDot, { borderColor: colors.border }]} />;
  };

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const lineColors =
          step.state === "completed" && steps[index + 1]?.state === "completed"
            ? colors.success
            : colors.border;

        return (
          <View key={step.key} style={styles.stepRow}>
            {/* Left Column: Dot & Line */}
            <View style={styles.leftCol}>
              {renderDot(step)}
              {!isLast && <View style={[styles.line, { backgroundColor: lineColors }]} />}
            </View>

            {/* Right Column: Labels & Details */}
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
              ) : step.state === "active" ? (
                <Text style={[styles.activeStatusText, { color: colors.accent }]}>
                  In Progress
                </Text>
              ) : (
                <Text style={[styles.pendingText, { color: colors.textMuted }]}>Pending</Text>
              )}

              {/* Special Addition: Response time pill for Case Accepted */}
              {step.key === "accepted" && step.state === "completed" && caseData.responseTimeSeconds != null && (
                <View
                  style={[
                    styles.responsePill,
                    {
                      backgroundColor: colors.surfaceHighlight,
                      borderColor: colors.success + "30",
                    },
                  ]}
                >
                  <Clock size={12} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={[styles.responseText, { color: colors.success }]}>
                    {formatResponseTime(caseData.responseTimeSeconds)} response
                  </Text>
                </View>
              )}
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
  responseText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 11,
  },
});
