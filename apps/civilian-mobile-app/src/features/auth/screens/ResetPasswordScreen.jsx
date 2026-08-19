import React, { useEffect, useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import LoadingScreen from "@/components/LoadingScreen";
import SuccessScreen from "@/components/SuccessScreen";
import useUserStore from "@/stores/userStore";
import { UI_MODE } from "@/services/api";
import { useAppTheme } from "@/hooks/useAppTheme";
import { resetPassword } from "@/features/auth/utils/emailOtpApi";

let signInCivilian = null;

if (!UI_MODE) {
  try {
    const firebaseModule = require("@packages/firebase");
    if (firebaseModule?.signInCivilian) {
      signInCivilian = firebaseModule.signInCivilian;
    }
  } catch {
    signInCivilian = null;
  }
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { setUser } = useUserStore();
  const params = useLocalSearchParams();
  const email = String(params.email || "").trim().toLowerCase();
  const otp = String(params.otp || "").trim();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!email || !/^\d{6}$/.test(otp)) {
      router.replace("/forgot-password");
    }
  }, [email, otp, router]);

  if (!fontsLoaded) {
    return null;
  }

  const goToDashboard = () => {
    setTimeout(() => {
      try {
        router.replace("/dashboard");
      } catch {
        router.push("/dashboard");
      }
    }, 1200);
  };

  const handleReset = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      if (UI_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await setUser({
          uid: "mock-user-123",
          email,
          name: "Demo User",
          phone: "+639123456789",
          role: "civilian",
        });
        setIsLoading(false);
        setSuccess(true);
        goToDashboard();
        return;
      }

      await resetPassword({ email, otp, newPassword: password });

      if (!signInCivilian) {
        throw new Error("Password updated. Please sign in with your new password.");
      }

      const { profile } = await signInCivilian(email, password);
      await setUser({
        uid: profile.uid,
        email: profile.email,
        name: profile.name,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone_number: profile.phone,
        phone: profile.phone,
        role: profile.role,
        status: profile.status,
      });

      setIsLoading(false);
      setSuccess(true);
      goToDashboard();
    } catch (err) {
      setIsLoading(false);
      setError(err.message || "Could not reset password.");
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen
        title="Updating password..."
        subtitle="Please wait"
        variant="login"
      />
    );
  }

  if (success) {
    return (
      <SuccessScreen
        title="Password updated"
        subtitle="Signing you in"
        variant="login"
      />
    );
  }

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
          Reset password
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
          Choose a new password for your civilian account.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <ErrorAlert message={error} onDismiss={() => setError("")} variant="register" />
        <FormInput
          label="New password"
          placeholder="Enter a new password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          required
          variant="register"
        />
        <FormInput
          label="Confirm password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          required
          variant="register"
        />
        <CustomButton
          title="Reset password"
          onPress={handleReset}
          variant="register"
          buttonVariant="register"
          disabled={!password || !confirmPassword}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
