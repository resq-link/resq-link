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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
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

  const validatePhoneNumber = (phone) => {
    return phone.length >= 10;
  };

  const handleRegister = async () => {
    if (!name || !phoneNumber || !validatePhoneNumber(phoneNumber)) {
      setError("Please fill in all required fields with valid information");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        // Simulate API delay for realistic UI testing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const data = {
          success: true,
          user: {
            ...mockData.register.user,
            phone_number: phoneNumber.replace(/\D/g, ""),
            name: name,
          },
        };
        
        console.log("🎨 UI MODE: Using mock registration data");
        await setUser(data.user);
        setSuccess(true);
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1500);
        return;
      }

      const response = await fetch(getApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Registration failed");
      }

      const data = await response.json();
      await setUser(data.user);

      setSuccess(true);
      setTimeout(() => {
        router.replace("/dashboard");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setShowHeaderBorder(scrollY > 0);
  };

  if (isLoading) {
    return (
      <LoadingScreen
        title="Creating your account..."
        subtitle="Please wait"
        variant="register"
      />
    );
  }

  if (success) {
    return (
      <SuccessScreen
        title="Welcome!"
        subtitle="Account created successfully"
        variant="register"
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
          borderBottomColor: "#5A5A5A",
        }}
      >
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <BackButton variant="register" />
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 30,
            color: "#FFFFFF",
          }}
        >
          Register
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
          variant="register"
        />

        <FormInput
          label="Full Name"
          placeholder="John Doe"
          value={name}
          onChangeText={setName}
          variant="register"
          required
          autoCapitalize="words"
        />

        <FormInput
          label="Phone Number"
          placeholder="+1 234 567 8900"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          variant="register"
          required
        />

        <CustomButton
          title="Create Account"
          onPress={handleRegister}
          variant="register"
          buttonVariant="register"
          disabled={!name || !phoneNumber || !validatePhoneNumber(phoneNumber)}
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
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: "#9AFF65",
              }}
            >
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
