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
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import LoadingScreen from "@/components/LoadingScreen";
import SuccessScreen from "@/components/SuccessScreen";
import useUserStore from "@/stores/userStore";
import { UI_MODE } from "@/services/api";
import { useAppTheme } from "@/hooks/useAppTheme";

let signInCivilian = null;
let firebaseError = null;

if (!UI_MODE) {
  try {
    const firebaseModule = require("@packages/firebase");
    if (firebaseModule && firebaseModule.signInCivilian) {
      signInCivilian = firebaseModule.signInCivilian;
    } else {
      firebaseError =
        "signInCivilian function not exported from Firebase module";
    }
  } catch (error) {
    console.error("Firebase import error:", error);
    firebaseError =
      error.message ||
      error.toString() ||
      "Failed to load Firebase module. Make sure you have created a .env file with Firebase credentials.";
  }
}

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

function LoginErrorAlert({ message, onDismiss, theme }) {
  if (!message) return null;

  return (
    <View
      style={{
        backgroundColor: theme.loginAlertSoftBg,
        borderRadius: 14,
        padding: 14,
        marginBottom: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.loginAlertSoftBorder,
      }}
      accessibilityRole="alert"
    >
      <Text
        style={{
          flex: 1,
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          lineHeight: 20,
          color: theme.loginAlertSoftText,
        }}
      >
        {message}
      </Text>
      {onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ padding: 4, marginLeft: spacing.sm }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: theme.loginAlertSoftText,
              opacity: 0.9,
            }}
          >
            ×
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function LoginFormInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  required = false,
  leftIcon,
  theme,
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderCol = theme.loginBorder;
  const focusCol = theme.loginIconTint;
  const bgCol = theme.loginSurfaceCard;
  const horizontalPad = spacing.lg;
  const leftPad = leftIcon ? 48 : horizontalPad;
  const rightPad = secureTextEntry ? 56 : horizontalPad;

  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <Text
        style={{
          fontFamily: "Inter_600SemiBold",
          fontSize: 14,
          color: theme.loginTextPrimary,
          marginBottom: spacing.sm,
          letterSpacing: 0.3,
        }}
      >
        {label}
        {required ? <Text style={{ color: theme.error }}> *</Text> : null}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          style={{
            minHeight: 56,
            borderWidth: 1.5,
            borderColor: focused ? focusCol : borderCol,
            borderRadius: 18,
            paddingLeft: leftPad,
            paddingRight: rightPad,
            paddingVertical: 14,
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: theme.loginTextPrimary,
            backgroundColor: bgCol,
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.loginTextMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          accessibilityLabel={label}
        />
        {leftIcon ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: horizontalPad - 2,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              width: 32,
              zIndex: 10,
              ...(Platform.OS === "android" ? { elevation: 12 } : {}),
            }}
          >
            {leftIcon}
          </View>
        ) : null}
        {secureTextEntry ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              right: horizontalPad - 4,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              width: 48,
              zIndex: 10,
              ...(Platform.OS === "android" ? { elevation: 12 } : {}),
            }}
          >
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <EyeOff size={22} color={theme.loginTextMuted} />
              ) : (
                <Eye size={22} color={theme.loginTextMuted} />
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { authTheme: t, colors } = useAppTheme();
  const { width: screenW } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
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

    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      if (UI_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const data = {
          success: true,
          user: {
            uid: "mock-user-123",
            email: email,
            name: email === "civilian@test.com" ? "Civilian Test" : "Demo User",
            phone: "+639123456789",
            role: "civilian",
          },
        };

        console.log("UI MODE: Using mock login data");
        await setUser(data.user);
        setIsLoading(false);
        setSuccess(true);

        setTimeout(() => {
          try {
            router.replace("/dashboard");
          } catch (navError) {
            console.error("Navigation error:", navError);
            router.push("/dashboard");
          }
        }, 1500);
        return;
      }

      if (!signInCivilian) {
        const errorMsg = firebaseError
          ? `Firebase not available: ${firebaseError}. Please check your .env file and Firebase configuration.`
          : "Firebase authentication is not available. Please configure Firebase or enable UI_MODE.";
        throw new Error(errorMsg);
      }

      const { profile } = await signInCivilian(email, password);

      const userData = {
        uid: profile.uid,
        email: profile.email,
        name: profile.name,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone_number: profile.phone,
        phone: profile.phone,
        role: profile.role,
        status: profile.status,
      };

      if (profile.status === "rejected") {
        try {
          const { getFirebaseAuth, signOut } = require("@packages/firebase");
          await signOut(getFirebaseAuth());
        } catch {
          // ignore
        }
        throw new Error(
          profile.kycRejectionReason
            ? `KYC was rejected: ${profile.kycRejectionReason}`
            : "Your account was rejected during KYC review. Contact support."
        );
      }

      await setUser(userData);
      setIsLoading(false);

      if (profile.status === "pending_email_verification") {
        try {
          const { sendEmailOtp } = require("@/features/auth/utils/emailOtpApi");
          await sendEmailOtp({ uid: profile.uid, email: profile.email });
        } catch (otpError) {
          console.warn("Could not auto-resend OTP:", otpError);
        }
        router.replace("/email-verification");
        return;
      }

      if (profile.status === "pending_kyc_review") {
        router.replace("/account-pending");
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        try {
          router.replace("/dashboard");
        } catch (navError) {
          console.error("Navigation error:", navError);
          router.push("/dashboard");
        }
      }, 1500);
    } catch (err) {
      setIsLoading(false);

      let errorMessage = "Login failed. Please try again.";
      const authCode = err?.code;
      if (
        authCode === "auth/invalid-credential" ||
        err.message?.includes("invalid-credential") ||
        err.message?.includes("Incorrect email or password")
      ) {
        errorMessage = "Incorrect email or password. Please try again.";
      } else if (err.message?.includes("user-not-found")) {
        errorMessage = "No account found with this email.";
      } else if (err.message?.includes("wrong-password")) {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.message?.includes("invalid-email")) {
        errorMessage = "Invalid email address.";
      } else if (err.message?.includes("too-many-requests")) {
        errorMessage = "Too many failed attempts. Please wait and try again.";
      } else if (err.message?.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (err.message) {
        errorMessage = err.message.replace(/^Failed to sign in:\s*/i, "");
      }

      console.warn("Login failed:", errorMessage);
      setError(errorMessage);
    }
  };

  const bottomPad = Math.max(insets.bottom, spacing.lg);

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
          fontFamily: "Inter_700Bold",
          fontSize: 34,
          letterSpacing: -0.8,
          color: t.loginTextPrimary,
          marginBottom: spacing.sm,
          textAlign: "center",
          alignSelf: "stretch",
        },
        subtitle: {
          fontFamily: "Inter_400Regular",
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
          fontFamily: "Inter_600SemiBold",
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
          fontFamily: "Inter_700Bold",
          fontSize: 17,
          letterSpacing: 0.4,
          color: t.loginCtaText,
        },
        ctaDisabled: {
          opacity: 0.85,
        },
        ctaPressed: {
          opacity: 0.92,
          transform: [{ scale: 0.992 }],
        },
        footerNote: {
          fontFamily: "Inter_400Regular",
          fontSize: 12,
          lineHeight: 18,
          color: t.loginTextMuted,
          textAlign: "center",
          opacity: 0.85,
        },
        footerLink: {
          fontFamily: "Inter_600SemiBold",
          color: t.loginLink,
        },
      }),
    [t]
  );

  if (isLoading) {
    return (
      <LoadingScreen
        title="Logging you in..."
        subtitle="Please wait"
        variant="login"
      />
    );
  }

  if (success) {
    return (
      <SuccessScreen
        title="Welcome Back!"
        subtitle="Successfully logged in"
        variant="login"
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={colors.statusBarStyle} />

      <LinearGradient
        colors={[t.loginBgTop, t.loginBgMid, t.loginBgBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.decorWrap} pointerEvents="none">
        <Svg width={screenW} height={420} style={styles.decorSvg}>
          <Circle
            cx={screenW * 0.5}
            cy={72}
            r={200}
            fill={t.loginAccent}
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
            stroke={t.loginAccent}
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
          <View style={styles.headerBlock}>
            <Image
              source={require("../../../../assets/images/resq-link-logo.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="RESQ Link"
            />
            <Text style={styles.title} accessibilityRole="header">
              Welcome Back
            </Text>
            <Text style={styles.subtitle}>
              Sign in for faster emergency reporting and real-time response
              updates.
            </Text>
          </View>

          <View style={styles.card}>
            <LinearGradient
              colors={[t.loginCardShineTop, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.cardInner}>
              <LoginErrorAlert
                message={error}
                onDismiss={() => setError("")}
                theme={t}
              />

              <LoginFormInput
                label="Email"
                placeholder="your.email@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                required
                leftIcon={
                  <Mail size={20} color={t.loginIconTint} strokeWidth={2} />
                }
                theme={t}
              />

              <LoginFormInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                required
                leftIcon={
                  <Lock size={20} color={t.loginIconTint} strokeWidth={2} />
                }
                theme={t}
              />

              <Pressable
                onPress={() => router.push("/forgot-password")}
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
                disabled={!canSubmit || isLoading}
                style={({ pressed }) => [
                  styles.ctaOuter,
                  !canSubmit || isLoading
                    ? styles.ctaDisabled
                    : pressed && styles.ctaPressed,
                ]}
              >
                <LinearGradient
                  colors={
                    !canSubmit || isLoading
                      ? [t.loginCtaDisabledStart, t.loginCtaDisabledEnd]
                      : [t.loginCtaStart, t.loginCtaEnd]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color={t.loginCtaText} size="small" />
                  ) : (
                    <Text style={styles.ctaText}>Sign In</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Text style={styles.footerNote}>
                Don&apos;t have an account?{" "}
                <Text
                  style={styles.footerLink}
                  onPress={() => router.push("/register")}
                  accessibilityRole="link"
                  accessibilityLabel="Create account"
                >
                  Create Account
                </Text>
                . Need help? Contact support.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
