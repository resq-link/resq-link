import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import BackButton from "@/components/BackButton";
import CustomButton from "@/components/CustomButton";
import ErrorAlert from "@/components/ErrorAlert";
import useUserStore from "@/stores/userStore";
import { UI_MODE } from "@/services/api";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  maskEmail,
  sendEmailOtp,
  verifyEmailOtp,
} from "@/features/auth/utils/emailOtpApi";
import { toUserFacingNetworkError } from "@/features/auth/utils/networkErrors";

export default function EmailVerificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notice } = useLocalSearchParams();
  const { colors, authTheme: theme } = useAppTheme();
  const { user, isLoading: userLoading, setUser } = useUserStore();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);
  const initialSendRef = useRef(false);

  const applyCooldown = (seconds) => {
    if (typeof seconds === "number" && seconds > 0) {
      setCooldown(seconds);
    }
  };

  const requestOtp = async ({ silent429 = false } = {}) => {
    const targetEmail = user?.email || "";
    if (!targetEmail || !user?.uid) return;
    setError("");
    try {
      if (UI_MODE) {
        applyCooldown(60);
        return;
      }
      const result = await sendEmailOtp({ uid: user.uid, email: targetEmail });
      applyCooldown(result?.retryAfterSeconds ?? 60);
    } catch (err) {
      if (silent429 && err?.retryAfterSeconds) {
        applyCooldown(err.retryAfterSeconds);
        return;
      }
      if (err?.retryAfterSeconds) {
        applyCooldown(err.retryAfterSeconds);
      }
      setError(toUserFacingNetworkError(err, "otp"));
    }
  };

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.email) {
      router.replace("/login");
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    const message = typeof notice === "string" ? notice.trim() : "";
    if (message) {
      setError(message);
    }
  }, [notice]);

  useEffect(() => {
    if (userLoading || !user?.uid || !user?.email || initialSendRef.current) {
      return;
    }
    initialSendRef.current = true;
    requestOtp({ silent429: true });
  }, [user?.uid, user?.email, userLoading]);

  if (!fontsLoaded) {
    return null;
  }

  const code = digits.join("");
  const email = user?.email || "";

  const handleChange = (index, value) => {
    const nextChar = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = nextChar;
    setDigits(next);
    if (nextChar && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      if (UI_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await setUser({ ...user, status: "pending_kyc_review" });
        router.replace("/account-pending");
        return;
      }
      await verifyEmailOtp({ email, otp: code });
      await setUser({ ...user, status: "pending_kyc_review" });
      router.replace("/account-pending");
    } catch (err) {
      setError(toUserFacingNetworkError(err, "otp"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    await requestOtp();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <BackButton variant="register" />
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 30,
            color: colors.text,
            marginTop: 24,
          }}
        >
          Verify email
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 15,
            color: colors.textSecondary,
            marginTop: 8,
            lineHeight: 22,
          }}
        >
          Enter the 6-digit code sent to {maskEmail(email) || "your email"}.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <ErrorAlert message={error} onDismiss={() => setError("")} variant="register" />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(node) => {
                inputs.current[index] = node;
              }}
              value={digit}
              onChangeText={(value) => handleChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              style={{
                width: 48,
                height: 56,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: digit ? theme.inputBorderFocus : theme.inputBorder,
                backgroundColor: theme.inputBg,
                textAlign: "center",
                fontFamily: "Inter_700Bold",
                fontSize: 22,
                color: theme.primaryText,
              }}
            />
          ))}
        </View>
        <CustomButton
          title={isLoading ? "Verifying..." : "Verify"}
          onPress={handleVerify}
          variant="register"
          buttonVariant="register"
          disabled={code.length !== 6 || isLoading}
        />
        <TouchableOpacity onPress={handleResend} disabled={cooldown > 0} style={{ alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: cooldown > 0 ? theme.mutedText : theme.link,
            }}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
