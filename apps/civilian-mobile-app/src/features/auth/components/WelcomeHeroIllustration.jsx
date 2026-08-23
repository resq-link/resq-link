import React, { useEffect } from "react";
import { View, Image, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function WelcomeHeroIllustration({ authTheme, colors, isLight }) {
  const breathe = useSharedValue(0);
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    floatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [breathe, floatAnim]);

  const haloGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breathe.value, [0, 1], [0.95, 1.06]) }],
    opacity: interpolate(breathe.value, [0, 1], [0.55, 0.9]),
  }));

  const logoCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatAnim.value, [0, 1], [2, -2]) },
      { scale: interpolate(breathe.value, [0, 1], [0.995, 1.005]) },
    ],
  }));

  const cardShadow = Platform.select({
    ios: {
      shadowColor: authTheme.primaryGreen,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isLight ? 0.12 : 0.28,
      shadowRadius: 20,
    },
    android: { elevation: 6 },
  });

  return (
    <View
      style={styles.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Soft ambient halo background */}
      <Animated.View style={[styles.halo, haloGlowStyle]}>
        <LinearGradient
          colors={
            isLight
              ? [
                  "rgba(52, 199, 89, 0.16)",
                  "rgba(52, 199, 89, 0.05)",
                  "transparent",
                ]
              : [
                  "rgba(124, 255, 77, 0.2)",
                  "rgba(52, 199, 89, 0.06)",
                  "transparent",
                ]
          }
          style={styles.haloGradient}
        />
      </Animated.View>

      {/* Subtle outer accent ring */}
      <View
        style={[
          styles.outerRing,
          {
            borderColor: isLight
              ? "rgba(52, 199, 89, 0.12)"
              : "rgba(124, 255, 77, 0.15)",
          },
        ]}
      />

      {/* Clean Glassmorphic Center Card */}
      <Animated.View style={[styles.cardWrap, cardShadow, logoCardStyle]}>
        <LinearGradient
          colors={
            isLight
              ? ["#FFFFFF", "#F7F9FB"]
              : ["rgba(30, 36, 46, 0.94)", "rgba(19, 23, 30, 0.96)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            {
              borderColor: isLight
                ? "rgba(0, 0, 0, 0.06)"
                : "rgba(255, 255, 255, 0.1)",
            },
          ]}
        >
          <Image
            source={require("../../../../assets/images/resq-link-logo.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="RESQ Link"
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 260,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: "hidden",
  },
  haloGradient: {
    flex: 1,
    borderRadius: 110,
  },
  outerRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  cardWrap: {
    borderRadius: 24,
  },
  card: {
    width: 200,
    height: 96,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 156,
    height: 42,
  },
});
