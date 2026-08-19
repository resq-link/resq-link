import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import useUserStore from "@/stores/userStore";
import { UI_MODE } from "@/services/api";
import { ROUTES } from "@/constants/routes";
import { getFirebaseAuth, onAuthStateChanged } from "@packages/firebase";
import { useAppTheme } from "@/hooks/useAppTheme";
import WelcomeHeroIllustration from "@/features/auth/components/WelcomeHeroIllustration";

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const typography = {
  title: 28,
  body: 16,
  button: 17,
};

function WelcomeBackground({ authTheme }) {
  const driftA = useSharedValue(0);
  const driftB = useSharedValue(0);

  useEffect(() => {
    driftA.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 12000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    driftB.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 16000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [driftA, driftB]);

  const orbAStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(driftA.value, [0, 1], [-28, 28]) },
      { translateY: interpolate(driftA.value, [0, 1], [-18, 22]) },
      { scale: interpolate(driftA.value, [0, 1], [1, 1.08]) },
    ],
  }));

  const orbBStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(driftB.value, [0, 1], [20, -32]) },
      { translateY: interpolate(driftB.value, [0, 1], [12, -24]) },
    ],
    opacity: interpolate(driftB.value, [0, 1], [0.5, 0.85]),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[authTheme.background, authTheme.gradientMid, authTheme.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", authTheme.glowGreenSoft, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbPrimary,
          orbAStyle,
          { backgroundColor: authTheme.orbPrimary },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbSecondary,
          orbBStyle,
          { backgroundColor: authTheme.orbSecondary },
        ]}
      />
    </View>
  );
}

export default function Index() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const { user, isLoading, loadUser, setUser } = useUserStore();
  const { colors, authTheme, isLight } = useAppTheme();

  const screenOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(24);
  const copyTranslateY = useSharedValue(20);
  const ctaTranslateY = useSharedValue(16);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading || !user) return;

    if (UI_MODE) {
      router.replace("/dashboard");
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const status = user?.status;
        if (status === "pending_email_verification") {
          router.replace(ROUTES.emailVerification);
          return;
        }
        if (status === "pending_kyc_review" || status === "rejected") {
          router.replace(ROUTES.accountPending);
          return;
        }
        router.replace("/dashboard");
        return;
      }

      await setUser(null);
      router.replace(ROUTES.login);
    });

    return unsubscribe;
  }, [user, isLoading, router, setUser]);

  useEffect(() => {
    if (!fontsLoaded || isLoading || user) return;

    screenOpacity.value = withTiming(1, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
    heroTranslateY.value = withTiming(0, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    copyTranslateY.value = withTiming(0, {
      duration: 750,
      easing: Easing.out(Easing.cubic),
    });
    ctaTranslateY.value = withTiming(0, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [fontsLoaded, isLoading, user, screenOpacity, heroTranslateY, copyTranslateY, ctaTranslateY]);

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const copyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: copyTranslateY.value }],
  }));

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: ctaTranslateY.value }],
  }));

  const contentMaxWidth = Math.min(screenW - spacing.lg * 2, 440);
  const bottomPad = Math.max(insets.bottom, spacing.lg);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: authTheme.background,
        },
        screen: {
          flex: 1,
          paddingTop: insets.top + spacing.xl,
          paddingHorizontal: spacing.lg,
          paddingBottom: bottomPad + spacing.sm,
        },
        content: {
          flex: 1,
          width: contentMaxWidth,
          alignSelf: "center",
          alignItems: "center",
          justifyContent: "center",
        },
        title: {
          fontFamily: "Inter_700Bold",
          fontSize: typography.title,
          lineHeight: 34,
          letterSpacing: -0.4,
          color: colors.text,
          textAlign: "center",
          marginTop: spacing.xxl,
        },
        subtitle: {
          fontFamily: "Inter_400Regular",
          fontSize: typography.body,
          lineHeight: 24,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: spacing.md,
          maxWidth: 340,
        },
        footer: {
          width: contentMaxWidth,
          alignSelf: "center",
          alignItems: "center",
        },
        ctaShadow: Platform.select({
          ios: {
            shadowColor: authTheme.primaryGreen,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isLight ? 0.22 : 0.35,
            shadowRadius: 16,
          },
          android: { elevation: 6 },
        }),
        ctaPressable: {
          width: "100%",
          borderRadius: 20,
          overflow: "hidden",
          minHeight: 56,
        },
        ctaGradient: {
          minHeight: 56,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.xl,
        },
        ctaLabel: {
          fontFamily: "Inter_600SemiBold",
          fontSize: typography.button,
          color: authTheme.ctaText,
        },
      }),
    [authTheme, colors, contentMaxWidth, insets.top, bottomPad, isLight]
  );

  if (!fontsLoaded || isLoading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <View style={styles.root}>
      <WelcomeBackground authTheme={authTheme} />
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <Animated.View style={[styles.screen, screenAnimatedStyle]}>
        <View style={styles.content}>
          <Animated.View style={heroAnimatedStyle}>
            <WelcomeHeroIllustration
              authTheme={authTheme}
              colors={colors}
              isLight={isLight}
            />
          </Animated.View>

          <Animated.View style={[copyAnimatedStyle, { alignItems: "center" }]}>
            <Text style={styles.title} accessibilityRole="header">
              Emergency Assistance at Your Fingertips
            </Text>
            <Text style={styles.subtitle}>
              One secure platform for reporting emergencies, sharing your location,
              and helping responders arrive prepared.
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={styles.footer}>
          <View style={styles.ctaShadow}>
            <Pressable
              onPress={() => router.push(ROUTES.login)}
              style={({ pressed }) => [
                styles.ctaPressable,
                pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Get Started"
              accessibilityHint="Opens the sign-in screen"
            >
              <LinearGradient
                colors={[authTheme.ctaStart, authTheme.ctaEnd]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaLabel}>Get Started</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbPrimary: {
    width: 280,
    height: 280,
    top: -80,
    right: -100,
  },
  orbSecondary: {
    width: 220,
    height: 220,
    bottom: 120,
    left: -90,
  },
});
