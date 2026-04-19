import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { Mail, Lock } from "lucide-react-native";
import FormInput from "@/components/FormInput";
import ErrorAlert from "@/components/ErrorAlert";
import useUserStore from "@/utils/userStore";
import { signInDispatcherWithVerification } from "@/utils/auth/dispatcherAuth";
import { spacing, useResqTheme } from "@/theme";

export default function LoginScreen() {
  const { t, statusBarStyle } = useResqTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useUserStore();

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validatePassword = (val) => val.length >= 6;

  const canSubmit = useMemo(
    () =>
      email &&
      password &&
      validateEmail(email) &&
      validatePassword(password),
    [email, password]
  );

  const handleLogin = async () => {
    if (!email || !validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password || !validatePassword(password)) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const { profile } = await signInDispatcherWithVerification(
        email,
        password
      );
      await setUser({
        uid: profile.uid,
        email: profile.email,
        role: profile.role,
        active: profile.active,
      });
      setIsSubmitting(false);
      router.replace("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setIsSubmitting(false);
      let errorMessage = "Login failed. Please try again.";
      if (err.message?.includes("user-not-found"))
        errorMessage = "No account found with this email.";
      else if (err.message?.includes("wrong-password"))
        errorMessage = "Incorrect password. Please try again.";
      else if (err.message?.includes("invalid-email"))
        errorMessage = "Invalid email address.";
      else if (err.message?.includes("Access denied"))
        errorMessage = "Access denied. Responder account required.";
      else if (err.message?.includes("deactivated")) errorMessage = err.message;
      else if (err.message) errorMessage = err.message;
      setError(errorMessage);
    }
  };

  const bottomPad = Math.max(insets.bottom, spacing.lg);

  const inputCommon = useMemo(
    () => ({
      focusAccentColor: t.loginIconTint,
      borderColor: t.loginBorder,
      inputBackgroundColor: t.loginSurfaceCard,
      labelColor: t.loginTextPrimary,
      textColor: t.loginTextPrimary,
      placeholderColor: t.loginTextMuted,
      requiredColor: t.alertAccent,
      minHeight: 56,
      borderRadius: 18,
    }),
    [t]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: t.loginBgBottom,
        },
        decorWrap: {
          ...StyleSheet.absoluteFillObject,
          height: 400,
        },
        decorSvg: {
          position: "absolute",
          top: 0,
          left: 0,
        },
        decorFade: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 120,
        },
        headerBlock: {
          marginBottom: spacing.xl,
          alignItems: "center",
        },
        logo: {
          width: 220,
          height: 58,
          marginBottom: spacing.xl,
        },
        title: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 34,
          letterSpacing: -0.8,
          color: t.loginTextPrimary,
          marginBottom: spacing.sm,
          textAlign: "center",
          alignSelf: "stretch",
        },
        subtitle: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 16,
          lineHeight: 24,
          color: t.loginTextSubtitle,
          maxWidth: 320,
          textAlign: "center",
        },
        card: {
          borderRadius: 22,
          borderWidth: 1,
          borderColor: t.loginBorderStrong,
          backgroundColor: t.loginSurfaceCard,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.35,
          shadowRadius: 24,
          elevation: 12,
        },
        cardInner: {
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xxl,
        },
        forgotWrap: {
          alignSelf: "flex-end",
          marginTop: -spacing.md,
          marginBottom: spacing.lg,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.xs,
        },
        forgotText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: t.loginLink,
          opacity: 0.85,
        },
        ctaOuter: {
          borderRadius: 18,
          overflow: "hidden",
          marginBottom: spacing.lg,
        },
        ctaGradient: {
          minHeight: 56,
          paddingVertical: 16,
          alignItems: "center",
          justifyContent: "center",
        },
        ctaText: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 17,
          letterSpacing: 0.4,
          color: t.white,
        },
        ctaDisabled: {
          opacity: 0.85,
        },
        ctaPressed: {
          opacity: 0.92,
          transform: [{ scale: 0.992 }],
        },
        footerNote: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          lineHeight: 18,
          color: t.loginTextMuted,
          textAlign: "center",
          opacity: 0.85,
        },
      }),
    [t]
  );

  return (
    <View style={styles.root}>
      <StatusBar style={statusBarStyle} />

      <LinearGradient
        colors={[t.loginBgTop, t.loginBgMid, t.loginBgBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft brand glow + abstract rescue/radar motif */}
      <View style={styles.decorWrap} pointerEvents="none">
        <Svg width={screenW} height={420} style={styles.decorSvg}>
          <Circle
            cx={screenW * 0.5}
            cy={72}
            r={200}
            fill={t.accent}
            fillOpacity={0.07}
          />
          <Circle
            cx={screenW * 0.5}
            cy={88}
            r={260}
            fill={t.loginDecorFill}
            fillOpacity={0.025}
          />
          <Circle
            cx={screenW * 0.82}
            cy={140}
            r={118}
            stroke={t.loginDecorLine}
            strokeOpacity={0.06}
            strokeWidth={1}
            fill="none"
          />
          <Circle
            cx={screenW * 0.82}
            cy={140}
            r={168}
            stroke={t.loginDecorLine}
            strokeOpacity={0.05}
            strokeWidth={1}
            fill="none"
          />
          <Circle
            cx={screenW * 0.18}
            cy={200}
            r={96}
            stroke={t.accent}
            strokeOpacity={0.07}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
        <LinearGradient
          colors={["transparent", t.loginBgBottom]}
          style={styles.decorFade}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + spacing.md,
            paddingHorizontal: spacing.lg,
            paddingBottom: bottomPad + spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + headline */}
          <View style={styles.headerBlock}>
            <Image
              source={require("../../assets/images/resq-link-logo.png")}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="RES.Q"
            />
            <Text style={styles.title}>Responder</Text>
            <Text style={styles.subtitle}>
              Sign in to access your assigned cases
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <LinearGradient
              colors={[t.loginCardShineTop, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.cardInner}>
              <ErrorAlert
                message={error}
                onDismiss={() => setError("")}
                variant="soft"
              />

              <FormInput
                label="Email"
                placeholder="username@agency.ph"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                required
                leftIcon={<Mail size={20} color={t.loginIconTint} strokeWidth={2} />}
                {...inputCommon}
              />

              <FormInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                required
                leftIcon={<Lock size={20} color={t.loginIconTint} strokeWidth={2} />}
                {...inputCommon}
              />

              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Password help",
                    "Contact your dispatch administrator to reset your responder password."
                  )
                }
                style={({ pressed }) => [
                  styles.forgotWrap,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              <Pressable
                onPress={handleLogin}
                disabled={!canSubmit || isSubmitting}
                style={({ pressed }) => [
                  styles.ctaOuter,
                  !canSubmit || isSubmitting
                    ? styles.ctaDisabled
                    : pressed && styles.ctaPressed,
                ]}
              >
                <LinearGradient
                  colors={
                    !canSubmit || isSubmitting
                      ? [t.loginCtaDisabledStart, t.loginCtaDisabledEnd]
                      : [t.loginCtaStart, t.loginCtaEnd]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={t.white} size="small" />
                  ) : (
                    <Text style={styles.ctaText}>Sign In</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Text style={styles.footerNote}>
                For authorized responders only. Need help? Contact your dispatch
                admin.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

