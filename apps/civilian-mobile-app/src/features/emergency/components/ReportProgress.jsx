import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { reportTypography, STEP_LABELS } from "@/features/emergency/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function ReportProgress({ currentStep, totalSteps = STEP_LABELS.length }) {
  const { reportTheme } = useAppTheme();
  const progress = useSharedValue(0);

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        marginBottom: 20,
      },
      track: {
        height: 4,
        borderRadius: 999,
        backgroundColor: t.surface,
        overflow: "hidden",
        marginBottom: 12,
      },
      fill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: t.primary,
      },
      labels: {
        flexDirection: "row",
        justifyContent: "space-between",
      },
      labelItem: {
        alignItems: "center",
        flex: 1,
        minWidth: 0,
      },
      dot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
        marginBottom: 6,
        alignItems: "center",
        justifyContent: "center",
      },
      dotActive: {
        backgroundColor: t.primary,
        borderColor: t.primary,
        shadowColor: t.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 3,
      },
      dotComplete: {
        backgroundColor: t.primaryMuted,
        borderColor: "rgba(124, 255, 77, 0.45)",
      },
      dotText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 10,
        color: t.textSecondary,
      },
      dotTextActive: {
        fontFamily: "Inter_700Bold",
        fontSize: 11,
        color: t.background,
      },
      dotTextDone: {
        fontFamily: "Inter_700Bold",
        fontSize: 10,
        color: t.primary,
      },
      label: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.caption - 1,
        color: t.textSecondary,
        textAlign: "center",
      },
      labelActive: {
        fontFamily: "Inter_600SemiBold",
        color: t.text,
      },
      labelComplete: {
        color: t.primary,
      },
    }),
    reportTheme
  );

  useEffect(() => {
    const maxIndex = Math.max(totalSteps - 1, 1);
    progress.value = withSpring(currentStep / maxIndex, {
      damping: 18,
      stiffness: 120,
    });
  }, [currentStep, totalSteps, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <View style={styles.labels}>
        {STEP_LABELS.map((label, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          const stepNum = index + 1;
          return (
            <View key={label} style={styles.labelItem}>
              <View
                style={[
                  styles.dot,
                  isComplete && styles.dotComplete,
                  isActive && styles.dotActive,
                ]}
              >
                {isComplete ? (
                  <Text style={styles.dotTextDone}>{stepNum}</Text>
                ) : isActive ? (
                  <Text style={styles.dotTextActive}>{stepNum}</Text>
                ) : (
                  <Text style={styles.dotText}>{stepNum}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isComplete && styles.labelComplete,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
