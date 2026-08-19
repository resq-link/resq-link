import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ArrowLeft, ArrowRight, Send } from "lucide-react-native";
import { reportTypography } from "@/features/emergency/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function BottomActionBar({
  step,
  totalSteps,
  canContinue,
  isSubmitting,
  onBack,
  onContinue,
  onSubmit,
  bottomInset,
}) {
  const { reportTheme } = useAppTheme();
  const primaryScale = useSharedValue(1);
  const isLastStep = step === totalSteps - 1;
  const isFirstStep = step === 0;
  const enabled = canContinue && !isSubmitting;

  const styles = useThemedStyles(
    (t) => ({
      bar: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: t.border,
        backgroundColor: t.background,
      },
      secondaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minWidth: 96,
        minHeight: 58,
        borderRadius: 16,
        paddingHorizontal: 16,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
      },
      secondaryText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.body,
        color: t.text,
      },
      primaryOuter: {
        flex: 1,
        minHeight: 58,
        borderRadius: 18,
        overflow: "hidden",
        shadowColor: t.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.32,
        shadowRadius: 18,
        elevation: 8,
      },
      primaryOuterFull: {
        flex: 1,
        width: "100%",
      },
      primaryOuterDisabled: {
        shadowOpacity: 0,
        elevation: 0,
      },
      primaryGradient: {
        flex: 1,
        minHeight: 58,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 24,
      },
      primaryGradientDisabled: {
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 18,
      },
      primaryText: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        letterSpacing: 0.2,
      },
      primaryTextActive: {
        color: t.background,
      },
      primaryTextDisabled: {
        color: t.textSecondary,
      },
      pressed: {
        opacity: 0.88,
      },
    }),
    reportTheme
  );

  const primaryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: primaryScale.value }],
  }));

  const handlePrimaryPress = () => {
    if (isLastStep) {
      onSubmit?.();
    } else {
      onContinue?.();
    }
  };

  const label = isLastStep ? "Submit Report" : "Continue";
  const PrimaryIcon = isLastStep ? Send : ArrowRight;

  const primaryContent = (
    <>
      <Text
        style={[
          styles.primaryText,
          enabled ? styles.primaryTextActive : styles.primaryTextDisabled,
        ]}
      >
        {label}
      </Text>
      {enabled ? (
        <PrimaryIcon
          size={22}
          color={reportTheme.background}
          strokeWidth={2.5}
        />
      ) : null}
    </>
  );

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 14) }]}>
      {!isFirstStep ? (
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={onBack}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={reportTheme.text} strokeWidth={2.4} />
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
      ) : null}

      <AnimatedPressable
        style={[
          styles.primaryOuter,
          isFirstStep && styles.primaryOuterFull,
          primaryAnimatedStyle,
          !enabled && styles.primaryOuterDisabled,
        ]}
        onPress={handlePrimaryPress}
        onPressIn={() => {
          if (enabled) {
            primaryScale.value = withSpring(0.98, { damping: 14, stiffness: 360 });
          }
        }}
        onPressOut={() => {
          primaryScale.value = withSpring(1, { damping: 12, stiffness: 300 });
        }}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {enabled ? (
          <LinearGradient
            colors={
              isLastStep
                ? ["#6EEF3A", reportTheme.primary]
                : ["#5AE832", reportTheme.primary]
            }
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.primaryGradient}
          >
            {primaryContent}
          </LinearGradient>
        ) : (
          <View style={[styles.primaryGradient, styles.primaryGradientDisabled]}>
            {primaryContent}
          </View>
        )}
      </AnimatedPressable>
    </View>
  );
}
