import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Line, Path, Defs, RadialGradient, Stop } from "react-native-svg";
import { Siren, MapPin, ShieldCheck, Radio, Sparkles } from "lucide-react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// --- Visual 1: SOS Beacon ---
function SOSBeaconVisual({ authTheme, colors, isLight }) {
  const pulse = useSharedValue(0);
  const coreGlow = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }),
      -1,
      false
    );
    coreGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [pulse, coreGlow]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.65, 1.4]) }],
    opacity: interpolate(pulse.value, [0, 0.4, 1], [0, isLight ? 0.45 : 0.6, 0]),
  }));

  const ring2Style = useAnimatedStyle(() => {
    const p = (pulse.value + 0.33) % 1;
    return {
      transform: [{ scale: interpolate(p, [0, 1], [0.65, 1.4]) }],
      opacity: interpolate(p, [0, 0.4, 1], [0, isLight ? 0.35 : 0.5, 0]),
    };
  });

  const ring3Style = useAnimatedStyle(() => {
    const p = (pulse.value + 0.66) % 1;
    return {
      transform: [{ scale: interpolate(p, [0, 1], [0.65, 1.4]) }],
      opacity: interpolate(p, [0, 0.4, 1], [0, isLight ? 0.25 : 0.4, 0]),
    };
  });

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(coreGlow.value, [0, 1], [0.98, 1.05]) }],
  }));

  const accentColor = isLight ? "#34C759" : "#7CFF4D";

  return (
    <View style={styles.stageCanvas}>
      {/* Expanding Ripple Rings */}
      <Animated.View
        style={[
          styles.sonarRing,
          { borderColor: accentColor, width: 220, height: 220, borderRadius: 110 },
          ring1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.sonarRing,
          { borderColor: accentColor, width: 220, height: 220, borderRadius: 110 },
          ring2Style,
        ]}
      />
      <Animated.View
        style={[
          styles.sonarRing,
          { borderColor: accentColor, width: 220, height: 220, borderRadius: 110 },
          ring3Style,
        ]}
      />

      {/* Ambient background glow */}
      <View style={[styles.haloBackdrop, { backgroundColor: isLight ? "rgba(52,199,89,0.12)" : "rgba(124,255,77,0.14)" }]} />

      {/* Central SOS Emblem */}
      <Animated.View style={[styles.centerEmblemWrap, coreStyle]}>
        <LinearGradient
          colors={
            isLight
              ? ["#FFFFFF", "#F2F8F4"]
              : ["rgba(28, 38, 32, 0.95)", "rgba(16, 22, 19, 0.98)"]
          }
          style={[
            styles.centerEmblem,
            { borderColor: isLight ? "rgba(52, 199, 89, 0.3)" : "rgba(124, 255, 77, 0.4)" },
          ]}
        >
          <LinearGradient
            colors={
              isLight
                ? ["#34C759", "#248A3D"]
                : ["#7CFF4D", "#34C759"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Siren size={30} color={isLight ? "#FFFFFF" : "#0D0F12"} strokeWidth={2.4} />
          </LinearGradient>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// --- Visual 2: GPS Radar ---
function GPSRadarVisual({ authTheme, colors, isLight }) {
  const rotation = useSharedValue(0);
  const pinBounce = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
    pinBounce.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [rotation, pinBounce]);

  const radarSweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pinStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(pinBounce.value, [0, 1], [0, -6]) },
      { scale: interpolate(pinBounce.value, [0, 1], [1, 1.08]) },
    ],
  }));

  const radarColor = isLight ? "rgba(10, 132, 255, 0.22)" : "rgba(10, 132, 255, 0.3)";

  return (
    <View style={styles.stageCanvas}>
      {/* Circular Radar Grid */}
      <View style={[styles.radarOuterRing, { borderColor: radarColor }]}>
        <View style={[styles.radarMidRing, { borderColor: radarColor }]}>
          <View style={[styles.radarInnerRing, { borderColor: radarColor }]} />
        </View>
      </View>

      {/* Crosshairs */}
      <View style={[styles.crosshairH, { backgroundColor: radarColor }]} />
      <View style={[styles.crosshairV, { backgroundColor: radarColor }]} />

      {/* Rotating Radar Sweep Beam */}
      <Animated.View style={[styles.radarSweepWrap, radarSweepStyle]}>
        <LinearGradient
          colors={
            isLight
              ? ["rgba(10, 132, 255, 0.35)", "rgba(10, 132, 255, 0.05)", "transparent"]
              : ["rgba(10, 132, 255, 0.45)", "rgba(10, 132, 255, 0.08)", "transparent"]
          }
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 0 }}
          style={styles.radarSweepSector}
        />
      </Animated.View>

      {/* Central Pin Landmark */}
      <Animated.View style={[styles.centerEmblemWrap, pinStyle]}>
        <LinearGradient
          colors={
            isLight
              ? ["#FFFFFF", "#EFF6FF"]
              : ["rgba(20, 30, 48, 0.95)", "rgba(12, 18, 30, 0.98)"]
          }
          style={[
            styles.centerEmblem,
            { borderColor: isLight ? "rgba(10, 132, 255, 0.35)" : "rgba(10, 132, 255, 0.45)" },
          ]}
        >
          <LinearGradient
            colors={["#0A84FF", "#0062D6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <MapPin size={28} color="#FFFFFF" strokeWidth={2.4} />
          </LinearGradient>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// --- Visual 3: Shield of Protection ---
function ShieldProtectionVisual({ authTheme, colors, isLight }) {
  const floatAnim = useSharedValue(0);
  const orbitAngle = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    orbitAngle.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, [floatAnim, orbitAngle]);

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatAnim.value, [0, 1], [3, -3]) },
      { scale: interpolate(floatAnim.value, [0, 1], [0.99, 1.02]) },
    ],
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitAngle.value}deg` }],
  }));

  const accentColor = isLight ? "#34C759" : "#7CFF4D";

  return (
    <View style={styles.stageCanvas}>
      {/* Orbital ring */}
      <Animated.View style={[styles.shieldOrbitRing, { borderColor: isLight ? "rgba(52,199,89,0.2)" : "rgba(124,255,77,0.25)" }, orbitStyle]}>
        <View style={[styles.orbitSatellite, { backgroundColor: accentColor }]} />
      </Animated.View>

      {/* Ambient background glow */}
      <View style={[styles.haloBackdrop, { backgroundColor: isLight ? "rgba(52,199,89,0.12)" : "rgba(124,255,77,0.16)" }]} />

      {/* Central Shield Card */}
      <Animated.View style={[styles.centerEmblemWrap, shieldStyle]}>
        <LinearGradient
          colors={
            isLight
              ? ["#FFFFFF", "#F2FAF4"]
              : ["rgba(26, 38, 30, 0.95)", "rgba(15, 24, 18, 0.98)"]
          }
          style={[
            styles.centerEmblem,
            { borderColor: isLight ? "rgba(52, 199, 89, 0.35)" : "rgba(124, 255, 77, 0.45)" },
          ]}
        >
          <LinearGradient
            colors={
              isLight
                ? ["#34C759", "#1F8A4C"]
                : ["#7CFF4D", "#34C759"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <ShieldCheck size={30} color={isLight ? "#FFFFFF" : "#0D0F12"} strokeWidth={2.4} />
          </LinearGradient>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

export default function WelcomeVisualStage({ activeIndex, authTheme, colors, isLight }) {
  return (
    <View style={styles.container}>
      {activeIndex === 0 && (
        <SOSBeaconVisual authTheme={authTheme} colors={colors} isLight={isLight} />
      )}
      {activeIndex === 1 && (
        <GPSRadarVisual authTheme={authTheme} colors={colors} isLight={isLight} />
      )}
      {activeIndex === 2 && (
        <ShieldProtectionVisual authTheme={authTheme} colors={colors} isLight={isLight} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  stageCanvas: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  sonarRing: {
    position: "absolute",
    borderWidth: 1.5,
  },
  haloBackdrop: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  centerEmblemWrap: {
    borderRadius: 36,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
    }),
  },
  centerEmblem: {
    width: 108,
    height: 108,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  radarOuterRing: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  radarMidRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  radarInnerRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
  },
  crosshairH: {
    position: "absolute",
    width: 210,
    height: 1,
  },
  crosshairV: {
    position: "absolute",
    width: 1,
    height: 210,
  },
  radarSweepWrap: {
    position: "absolute",
    width: 210,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
  },
  radarSweepSector: {
    width: 105,
    height: 105,
    position: "absolute",
    top: 0,
    right: 0,
    borderTopRightRadius: 105,
  },
  shieldOrbitRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  orbitSatellite: {
    position: "absolute",
    top: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
