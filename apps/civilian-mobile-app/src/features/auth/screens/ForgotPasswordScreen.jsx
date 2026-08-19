import React, { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import BackButton from "@/components/BackButton";
import FormInput from "@/components/FormInput";
import CustomButton from "@/components/CustomButton";
import ErrorAlert from "@/components/ErrorAlert";
import { UI_MODE } from "@/services/api";
import { useAppTheme } from "@/hooks/useAppTheme";
import { sendForgotPasswordOtp } from "@/features/auth/utils/emailOtpApi";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!validateEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      if (!UI_MODE) {
        await sendForgotPasswordOtp({ email: trimmed });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      router.push({
        pathname: "/forgot-password-otp",
        params: { email: trimmed },
      });
    } catch (err) {
      setError(err.message || "Could not send the reset code.");
    } finally {
      setIsLoading(false);
    }
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
          Forgot password
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
          Enter the email on your civilian account. We will send a 6-digit code to reset your password.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <ErrorAlert message={error} onDismiss={() => setError("")} variant="register" />
        <FormInput
          label="Email"
          placeholder="your.email@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          required
          variant="register"
        />
        <CustomButton
          title={isLoading ? "Sending..." : "Send code"}
          onPress={handleSend}
          variant="register"
          buttonVariant="register"
          disabled={!email.trim() || isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
