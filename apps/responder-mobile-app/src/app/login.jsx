import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import FormInput from "@/components/FormInput";
import CustomButton from "@/components/CustomButton";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorAlert from "@/components/ErrorAlert";
import useUserStore from "@/utils/userStore";
import { signInDispatcherWithVerification } from "@/utils/auth/dispatcherAuth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useUserStore();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

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

    try {
      const { user, profile } = await signInDispatcherWithVerification(email, password);
      
      console.log("Login successful:", user.uid);
      console.log("Responder profile:", profile);

      // Format user data for the store
      const userData = {
        uid: profile.uid,
        email: profile.email,
        role: profile.role,
        active: profile.active,
      };

      // Set user in store
      await setUser(userData);
      
      setIsLoading(false);
      
      // Navigate to dashboard
      router.replace("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setIsLoading(false);
      
      // Handle Firebase auth errors
      let errorMessage = "Login failed. Please try again.";
      if (err.message?.includes("user-not-found")) {
        errorMessage = "No account found with this email.";
      } else if (err.message?.includes("wrong-password")) {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.message?.includes("invalid-email")) {
        errorMessage = "Invalid email address.";
      } else if (err.message?.includes("Access denied")) {
        errorMessage = "Access denied. Responder account required.";
      } else if (err.message?.includes("deactivated")) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen
        title="Logging you in..."
        subtitle="Please wait"
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar style="light" backgroundColor="#0f172a" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "#0f172a",
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: "#1e293b",
        }}
      >
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 30,
            color: "#f1f5f9",
          }}
        >
          Responder Login
        </Text>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_400Regular",
            fontSize: 14,
            color: "#94a3b8",
            marginTop: 4,
          }}
        >
          Sign in to view your assigned cases
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: insets.bottom + 20,
          backgroundColor: "#0f172a",
        }}
        showsVerticalScrollIndicator={false}
      >
        <ErrorAlert
          message={error}
          onDismiss={() => setError("")}
        />

        <FormInput
          label="Email"
          placeholder="responder@rescue.ph"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          required
        />

        <FormInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          required
        />

        <CustomButton
          title="Login"
          onPress={handleLogin}
          variant="primary"
          disabled={!email || !password || !validateEmail(email) || !validatePassword(password)}
        />
      </ScrollView>
    </View>
  );
}

