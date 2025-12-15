import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import BackButton from "../components/BackButton";
import FormInput from "../components/FormInput";
import CustomButton from "../components/CustomButton";
import LoadingScreen from "../components/LoadingScreen";
import SuccessScreen from "../components/SuccessScreen";
import ErrorAlert from "../components/ErrorAlert";
import useUserStore from "../utils/userStore";
import { getApiUrl, UI_MODE, mockData } from "../utils/api";

// Import Firebase - will be used when UI_MODE is false
let signInCivilian = null;
let firebaseError = null;

if (!UI_MODE) {
  try {
    // Use dynamic import to handle cases where Firebase might not be configured
    const firebaseModule = require("@packages/firebase");
    if (firebaseModule && firebaseModule.signInCivilian) {
      signInCivilian = firebaseModule.signInCivilian;
    } else {
      firebaseError = "signInCivilian function not exported from Firebase module";
    }
  } catch (error) {
    console.error("Firebase import error:", error);
    firebaseError = error.message || error.toString() || "Failed to load Firebase module. Make sure you have created a .env file with Firebase credentials.";
  }
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showHeaderBorder, setShowHeaderBorder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { setUser } = useUserStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
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
    setSuccess(false);

    try {
      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        // Simulate API delay for realistic UI testing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
        
        console.log("🎨 UI MODE: Using mock login data");
        await setUser(data.user);
        setIsLoading(false);
        setSuccess(true);
        
        setTimeout(() => {
          try {
            router.replace("/dashboard");
          } catch (navError) {
            console.error("Navigation error:", navError);
            // Fallback navigation
            router.push("/dashboard");
          }
        }, 1500);
        return;
      }

      // Sign in with Firebase
      if (!signInCivilian) {
        const errorMsg = firebaseError 
          ? `Firebase not available: ${firebaseError}. Please check your .env file and Firebase configuration.`
          : "Firebase authentication is not available. Please configure Firebase or enable UI_MODE.";
        throw new Error(errorMsg);
      }

      const { user, profile } = await signInCivilian(email, password);
      
      console.log("Login successful:", user.uid);
      console.log("User profile:", profile);

      // Format user data for the store (matching expected format)
      const userData = {
        uid: profile.uid,
        email: profile.email,
        name: profile.name,
        phone_number: profile.phone,
        phone: profile.phone,
        role: profile.role,
      };

      // Set user in store
      await setUser(userData);
      
      // Update loading state
      setIsLoading(false);
      
      // Set success state
      setSuccess(true);
      
      // Navigate after a short delay
      console.log("Navigating to dashboard...");
      setTimeout(() => {
        try {
          router.replace("/dashboard");
        } catch (navError) {
          console.error("Navigation error:", navError);
          // Fallback navigation
          router.push("/dashboard");
        }
      }, 1500);
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
      } else if (err.message?.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setShowHeaderBorder(scrollY > 0);
  };

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
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" backgroundColor="#000000" />

      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: "#000000",
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: 20,
          zIndex: 1000,
          borderBottomWidth: showHeaderBorder ? 1 : 0,
          borderBottomColor: "#404040",
        }}
      >
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <BackButton variant="login" />
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 30,
            color: "#FFFFFF",
          }}
        >
          Login
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: insets.top + 160,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ErrorAlert
          message={error}
          onDismiss={() => setError("")}
          variant="login"
        />

        <FormInput
          label="Email"
          placeholder="your.email@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          variant="login"
          required
        />

        <FormInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          variant="login"
          required
        />

        <CustomButton
          title="Login"
          onPress={handleLogin}
          variant="primary"
          buttonVariant="login"
          disabled={!email || !password || !validateEmail(email) || !validatePassword(password)}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "auto",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: "#8F8F8F",
            }}
          >
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: "#9AFF55",
              }}
            >
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
