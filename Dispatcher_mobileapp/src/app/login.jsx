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
import { getApiUrl, UI_MODE, mockData, dispatcherCredentials } from "../utils/api";

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
        
        // Check against dummy credentials
        const credentials = dispatcherCredentials[email.toLowerCase()];
        
        if (!credentials || credentials.password !== password) {
          setIsLoading(false);
          setError("Invalid email or password");
          return;
        }
        
        const data = {
          success: true,
          user: {
            id: `dispatcher-${credentials.agency.toLowerCase()}-${Date.now()}`,
            email: email.toLowerCase(),
            agency: credentials.agency,
            name: credentials.name,
            created_at: new Date().toISOString(),
          },
        };
        
        console.log("🎨 UI MODE: Using mock login data");
        await setUser(data.user);
        setIsLoading(false);
        setSuccess(true);
        
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1500);
        return;
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 10000);
      });
      
      const fetchPromise = fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        let errorMessage = "Login failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Login response:", data);
      
      if (!data || !data.user) {
        throw new Error("Invalid response from server");
      }

      // Set user first
      console.log("Setting user:", data.user);
      await setUser(data.user);
      
      // Then update loading state before success
      setIsLoading(false);
      
      // Set success state
      setSuccess(true);
      
      // Navigate after a short delay
      console.log("Navigating to dashboard...");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 1500);
    } catch (err) {
      console.error("Login error:", err);
      setIsLoading(false);
      
      if (err.message === "Request timeout") {
        setError("Request timed out. Please check your connection and try again.");
      } else if (err.message?.includes("Could not connect") || err.message?.includes("fetch failed")) {
        setError("Cannot connect to server. Make sure:\n1. Web server is running on port 4000\n2. Your device can reach the server IP\n3. Check API_SETUP.md for configuration help");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
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
          placeholder="agency@dispatcher.com"
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
