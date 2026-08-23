import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ArrowRight } from "lucide-react-native";
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
import WelcomeVisualStage from "@/features/auth/components/WelcomeVisualStage";

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const SLIDES = [
  {
    key: "emergency",
    tag: "RAPID EMERGENCY DISPATCH",
    title: "Emergency Assistance at Your Fingertips",
    subtitle:
      "One tap connects you instantly to emergency dispatchers and nearby verified first responders.",
  },
  {
    key: "gps",
    tag: "LIVE PRECISION TRACKING",
    title: "Pinpoint Location, Zero Guesswork",
    subtitle:
      "Your exact coordinates and situation updates are shared securely with responders in real time.",
  },
  {
    key: "safety",
    tag: "VERIFIED SAFETY NETWORK",
    title: "24/7 Protection & Official Units",
    subtitle:
      "Certified public safety units, medical personnel, and incident tracking always on standby.",
  },
];

function WelcomeBackground({ authTheme, isLight }) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 12000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [drift]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-20, 20]) },
      { translateY: interpolate(drift.value, [0, 1], [-15, 15]) },
      { scale: interpolate(drift.value, [0, 1], [1, 1.08]) },
    ],
    opacity: interpolate(drift.value, [0, 1], [0.6, 0.9]),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[authTheme.background, authTheme.gradientMid, authTheme.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          "transparent",
          isLight ? "rgba(52, 199, 89, 0.05)" : "rgba(124, 255, 77, 0.07)",
          "transparent",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbPrimary,
          orbStyle,
          {
            backgroundColor: isLight
              ? "rgba(52, 199, 89, 0.09)"
              : "rgba(124, 255, 77, 0.12)",
          },
        ]}
      />
    </View>
  );
}

export default function SplashGateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { user, isLoading, loadUser, setUser } = useUserStore();
  const { colors, authTheme, isLight } = useAppTheme();

  const [activeSlide, setActiveSlide] = useState(0);

  const screenOpacity = useSharedValue(0);
  const slideContentAnim = useSharedValue(1);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Auto carousel slide timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4800);
    return () => clearInterval(timer);
  }, []);

  // Animate text transition on slide change
  useEffect(() => {
    slideContentAnim.value = 0;
    slideContentAnim.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeSlide, slideContentAnim]);

  // Startup auth gate & entrance animation
  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      screenOpacity.value = withTiming(1, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (UI_MODE) {
      router.replace("/dashboard");
      return;
    }

    let unsubscribe = () => {};

    try {
      const auth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
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
          screenOpacity.value = withTiming(1, {
            duration: 650,
            easing: Easing.out(Easing.cubic),
          });
        } catch (error) {
          if (__DEV__) {
            console.error("Auth state redirect failed:", error);
          }
          await setUser(null);
          screenOpacity.value = withTiming(1, {
            duration: 650,
            easing: Easing.out(Easing.cubic),
          });
        }
      });
    } catch (error) {
      if (__DEV__) {
        console.error("Firebase auth init failed:", error);
      }
      screenOpacity.value = withTiming(1, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
    }

    return unsubscribe;
  }, [isLoading]);

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: slideContentAnim.value,
    transform: [
      {
        translateY: interpolate(slideContentAnim.value, [0, 1], [10, 0]),
      },
    ],
  }));

  const handleSlideSelect = useCallback((index) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveSlide(index);
  }, []);

  const handleGetStarted = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.replace(ROUTES.login);
  };

  const isCompact = screenH < 720;
  const contentMaxWidth = Math.min(screenW - spacing.lg * 2, 420);
  const bottomPad = Math.max(insets.bottom, spacing.md);

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: authTheme.background,
        },
        screen: {
          flex: 1,
          paddingTop: insets.top + (isCompact ? spacing.sm : spacing.md),
          paddingBottom: bottomPad,
          paddingHorizontal: spacing.lg,
          justifyContent: "space-between",
        },
        headerBar: {
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          paddingHorizontal: spacing.xs,
          height: 38,
        },
        logoImage: {
          width: 140,
          height: 34,
        },
        visualStageWrap: {
          alignItems: "center",
          justifyContent: "center",
          marginVertical: isCompact ? spacing.xs : spacing.md,
        },
        narrativeCard: {
          width: contentMaxWidth,
          alignSelf: "center",
          borderRadius: 24,
          paddingHorizontal: spacing.lg,
          paddingTop: isCompact ? spacing.md : spacing.xl,
          paddingBottom: isCompact ? spacing.md : spacing.lg,
          backgroundColor: isLight
            ? "rgba(255, 255, 255, 0.88)"
            : "rgba(20, 24, 31, 0.82)",
          borderWidth: 1,
          borderColor: isLight
            ? "rgba(0, 0, 0, 0.06)"
            : "rgba(255, 255, 255, 0.08)",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isLight ? 0.06 : 0.24,
              shadowRadius: 16,
            },
            android: { elevation: 4 },
          }),
        },
        paginationRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: isCompact ? spacing.sm : spacing.md,
        },
        pagePill: {
          height: 6,
          borderRadius: 3,
        },
        tagText: {
          fontFamily: "Inter_700Bold",
          fontSize: 10.5,
          letterSpacing: 0.8,
          color: isLight ? "#248A3D" : "#7CFF4D",
          marginBottom: 4,
        },
        headline: {
          fontFamily: "Inter_700Bold",
          fontSize: isCompact ? 22 : 26,
          lineHeight: isCompact ? 28 : 32,
          letterSpacing: -0.4,
          color: colors.text,
          marginBottom: spacing.xs,
        },
        subcopy: {
          fontFamily: "Inter_400Regular",
          fontSize: isCompact ? 13.5 : 14.5,
          lineHeight: isCompact ? 19 : 21,
          color: colors.textSecondary,
          marginBottom: isCompact ? spacing.md : spacing.lg,
        },
        ctaShadow: {
          width: "100%",
          ...Platform.select({
            ios: {
              shadowColor: authTheme.primaryGreen,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isLight ? 0.22 : 0.38,
              shadowRadius: 16,
            },
            android: { elevation: 6 },
          }),
        },
        ctaPressable: {
          width: "100%",
          borderRadius: 18,
          overflow: "hidden",
          minHeight: 52,
        },
        ctaGradient: {
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.xl,
          gap: 8,
        },
        ctaLabel: {
          fontFamily: "Inter_700Bold",
          fontSize: 16,
          letterSpacing: 0.2,
          color: authTheme.ctaText,
        },
        secondaryAction: {
          alignSelf: "center",
          marginTop: spacing.md,
          paddingVertical: 4,
          paddingHorizontal: 8,
        },
        secondaryActionText: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 13,
          color: colors.textSecondary,
        },
        secondaryActionHighlight: {
          color: isLight ? "#248A3D" : "#7CFF4D",
        },
      }),
    [
      authTheme,
      colors,
      contentMaxWidth,
      insets.top,
      bottomPad,
      isLight,
      isCompact,
    ]
  );

  if (isLoading || user) {
    return null;
  }

  const currentSlide = SLIDES[activeSlide];

  return (
    <View style={dynamicStyles.root}>
      <WelcomeBackground authTheme={authTheme} isLight={isLight} />
      <StatusBar
        style={colors.statusBarStyle}
        backgroundColor={colors.background}
      />

      <Animated.View style={[dynamicStyles.screen, screenAnimatedStyle]}>
        {/* Top Centered Brand Logo */}
        <View style={dynamicStyles.headerBar}>
          <Image
            source={require("../../../../assets/images/resq-link-logo.png")}
            style={dynamicStyles.logoImage}
            resizeMode="contain"
            accessibilityLabel="RESQ Link"
          />
        </View>

        {/* Dynamic Interactive Artwork Stage */}
        <View style={dynamicStyles.visualStageWrap}>
          <WelcomeVisualStage
            activeIndex={activeSlide}
            authTheme={authTheme}
            colors={colors}
            isLight={isLight}
          />
        </View>

        {/* Bottom Narrative Card */}
        <View style={dynamicStyles.narrativeCard}>
          {/* Animated Interactive Pagination Pills */}
          <View style={dynamicStyles.paginationRow}>
            {SLIDES.map((slide, index) => {
              const isActive = activeSlide === index;
              return (
                <TouchableOpacity
                  key={slide.key}
                  onPress={() => handleSlideSelect(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      dynamicStyles.pagePill,
                      {
                        width: isActive ? 24 : 7,
                        backgroundColor: isActive
                          ? isLight
                            ? "#34C759"
                            : "#7CFF4D"
                          : isLight
                          ? "rgba(0,0,0,0.12)"
                          : "rgba(255,255,255,0.18)",
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Headline & Subtitle with transition */}
          <Animated.View style={textAnimatedStyle}>
            <Text style={dynamicStyles.tagText}>{currentSlide.tag}</Text>
            <Text style={dynamicStyles.headline} accessibilityRole="header">
              {currentSlide.title}
            </Text>
            <Text style={dynamicStyles.subcopy}>{currentSlide.subtitle}</Text>
          </Animated.View>

          {/* Primary Action Button */}
          <View style={dynamicStyles.ctaShadow}>
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                dynamicStyles.ctaPressable,
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
                style={dynamicStyles.ctaGradient}
              >
                <Text style={dynamicStyles.ctaLabel}>Get Started</Text>
                <ArrowRight
                  size={18}
                  color={authTheme.ctaText}
                  strokeWidth={2.5}
                />
              </LinearGradient>
            </Pressable>
          </View>

          {/* Secondary Action Link */}
          <TouchableOpacity
            onPress={() => router.replace(ROUTES.login)}
            style={dynamicStyles.secondaryAction}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
          >
            <Text style={dynamicStyles.secondaryActionText}>
              Already have an account?{" "}
              <Text style={dynamicStyles.secondaryActionHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
    width: 320,
    height: 320,
    top: -60,
    right: -100,
  },
});
