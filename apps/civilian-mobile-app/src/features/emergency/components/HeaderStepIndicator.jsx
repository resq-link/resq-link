import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/**
 * Right header element — branded step badge (replaces empty circular spacer).
 */
export default function HeaderStepIndicator({ currentStep, totalSteps }) {
  const { reportTheme, isLight } = useAppTheme();
  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        width: 50,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
      },
      ring: {
        width: 50,
        height: 50,
        borderRadius: 25,
        padding: 2,
        backgroundColor: t.primaryMuted,
        borderWidth: 1.5,
        borderColor: isLight ? "rgba(52, 199, 89, 0.4)" : "rgba(124, 255, 77, 0.4)",
      },
      inner: {
        flex: 1,
        borderRadius: 23,
        backgroundColor: t.card,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      },
      iconBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: t.primaryMuted,
        alignItems: "center",
        justifyContent: "center",
      },
      fraction: {
        fontFamily: "Inter_700Bold",
        fontSize: 11,
        lineHeight: 13,
      },
      stepNum: {
        color: t.primary,
        fontFamily: "Inter_700Bold",
        fontSize: 12,
      },
      slash: {
        color: t.textSecondary,
        fontFamily: "Inter_400Regular",
        fontSize: 10,
      },
      stepTotal: {
        color: t.textSecondary,
        fontFamily: "Inter_600SemiBold",
        fontSize: 11,
      },
    }),
    reportTheme
  );

  const stepNumber = currentStep + 1;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="text"
      accessibilityLabel={`Step ${stepNumber} of ${totalSteps}`}
    >
      <View style={styles.ring}>
        <View style={styles.inner}>
          <View style={styles.iconBadge}>
            <ShieldAlert size={14} color={reportTheme.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.fraction}>
            <Text style={styles.stepNum}>{stepNumber}</Text>
            <Text style={styles.slash}> / </Text>
            <Text style={styles.stepTotal}>{totalSteps}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
