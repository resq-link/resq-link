import React, { useEffect } from "react";
import { View, Image, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, ShieldCheck, Siren } from "lucide-react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const FEATURES = [
  { key: "report", Icon: Siren, angle: -90 },
  { key: "location", Icon: MapPin, angle: 30 },
  { key: "secure", Icon: ShieldCheck, angle: 150 },
];

function OrbitChip({ Icon, angle, drift, authTheme, colors, isLight }) {
  const radius = 118;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  const chipStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x },
      { translateY: y + interpolate(drift.value, [0, 1], [0, -4]) },
    ],
  }));

  const chipShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isLight ? 0.08 : 0.25,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
  });

  return (
    <Animated.View style={[styles.chipWrap, chipStyle, chipShadow]}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: isLight ? "rgba(255,255,255,0.92)" : "rgba(31,36,43,0.88)",
            borderColor: colors.border,
          },
        ]}
      >
        <Icon size={20} color={authTheme.primaryGreen} strokeWidth={2} />
      </View>
    </Animated.View>
  );
}

export default function WelcomeHeroIllustration({ authTheme, colors, isLight }) {
  const breathe = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [breathe, drift]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breathe.value, [0, 1], [1, 1.06]) }],
    opacity: interpolate(breathe.value, [0, 1], [0.85, 1]),
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(drift.value, [0, 1], [2, -2]) }],
  }));

  const logoShadow = Platform.select({
    ios: {
      shadowColor: authTheme.primaryGreen,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isLight ? 0.14 : 0.28,
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
      <Animated.View style={[styles.haloOuter, haloStyle]}>
        <LinearGradient
          colors={
            isLight
              ? ["rgba(52,199,89,0.06)", "rgba(52,199,89,0.14)", "rgba(52,199,89,0.04)"]
              : ["rgba(124,255,77,0.05)", "rgba(124,255,77,0.16)", "rgba(124,255,77,0.04)"]
          }
          style={styles.haloGradient}
        />
      </Animated.View>

      <View style={[styles.haloRing, { borderColor: authTheme.glowGreen }]} />
      <View style={[styles.haloRing, styles.haloRingInner, { borderColor: authTheme.glowGreenSoft }]} />

      {FEATURES.map(({ key, Icon, angle }) => (
        <OrbitChip
          key={key}
          Icon={Icon}
          angle={angle}
          drift={drift}
          authTheme={authTheme}
          colors={colors}
          isLight={isLight}
        />
      ))}

      <Animated.View style={[styles.logoPlate, logoShadow, logoStyle]}>
        <LinearGradient
          colors={
            isLight
              ? ["#FFFFFF", "#F7F7FA"]
              : ["rgba(37,42,50,0.98)", "rgba(28,32,38,0.95)"]
          }
          style={[styles.logoPlateGradient, { borderColor: colors.border }]}
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
    width: 300,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  haloOuter: {
    position: "absolute",
    width: 232,
    height: 232,
    borderRadius: 116,
    overflow: "hidden",
  },
  haloGradient: {
    flex: 1,
    borderRadius: 116,
  },
  haloRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
  },
  haloRingInner: {
    width: 188,
    height: 188,
    borderRadius: 94,
    opacity: 0.7,
  },
  chipWrap: {
    position: "absolute",
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlate: {
    borderRadius: 24,
    overflow: "hidden",
  },
  logoPlateGradient: {
    width: 196,
    height: 88,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 156,
    height: 40,
  },
});
