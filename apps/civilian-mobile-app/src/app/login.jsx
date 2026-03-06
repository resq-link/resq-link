import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
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

const GOOGLE_ICON_URL = "https://companieslogo.com/img/orig/google-9646e5e7.png?t=1720244494";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
        
        console.log("≡ƒÄ¿ UI MODE: Using mock login data");
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
    <LinearGradient
      colors={["#121A12", "#0B100C", "#060906"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" backgroundColor="#121A12" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingHorizontal: 22,
          paddingTop: insets.top + 36,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 40,
              lineHeight: 42,
              color: "#FFFFFF",
              marginBottom: 20,
            }}
          >
            Login to your{"\n"}account
          </Text>

          <ErrorAlert
            message={error}
            onDismiss={() => setError("")}
            variant="login"
          />

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            Your number & email address
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            placeholderTextColor="#8EA38C"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              height: 50,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#4A6C45",
              color: "#FFFFFF",
              paddingHorizontal: 14,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              backgroundColor: "rgba(154,255,85,0.04)",
              marginBottom: 14,
            }}
          />

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            Enter your password
          </Text>
          <View
            style={{
              height: 50,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#332640",
              backgroundColor: "rgba(255,255,255,0.03)",
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              marginBottom: 12,
            }}
          >
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#8EA38C"
              secureTextEntry={!showPassword}
              style={{
                flex: 1,
                color: "#FFFFFF",
                fontFamily: "Inter_400Regular",
                fontSize: 14,
              }}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              {showPassword ? (
                <Eye size={18} color="#9AB795" />
              ) : (
                <EyeOff size={18} color="#9AB795" />
              )}
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <TouchableOpacity
              onPress={() => setRememberMe((prev) => !prev)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  borderWidth: 1,
                  borderColor: rememberMe ? "#9AFF55" : "#8DA888",
                  backgroundColor: rememberMe ? "#9AFF55" : "transparent",
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: "#B7C8B4",
                }}
              >
                Remember me
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setError("Forgot password is not available yet.")}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                  color: "#9AFF55",
                }}
              >
                Forget password
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={!email || !password || !validateEmail(email) || !validatePassword(password)}
            style={{
              borderRadius: 10,
              overflow: "hidden",
              opacity:
                !email || !password || !validateEmail(email) || !validatePassword(password)
                  ? 0.6
                  : 1,
            }}
          >
            <LinearGradient
              colors={["#76EA34", "#9AFF55"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                height: 50,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: "#0B1708",
                }}
              >
                Log in
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: "#2A3A28" }} />
            <Text
              style={{
                marginHorizontal: 12,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: "#B7C8B4",
              }}
            >
              Or
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#2A3A28" }} />
          </View>

          <TouchableOpacity
            onPress={() => setError("Google sign in is not available yet.")}
            style={{
              height: 50,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#355032",
              backgroundColor: "rgba(154,255,85,0.04)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Image
              source={{ uri: GOOGLE_ICON_URL }}
              style={{ width: 18, height: 18, marginRight: 10 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: "#FFFFFF",
              }}
            >
              Continue with Google
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: "#B7C8B4",
              }}
            >
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                  color: "#9AFF55",
                }}
              >
                Create an account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
