import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
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
import {
  signInUserWithPhone,
  verifyPhoneCodeAndCreateProfile,
} from "@packages/firebase";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [step, setStep] = useState("form"); // form | verify
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

  const handleSendCode = async () => {
    if (!name || !address || !phoneNumber || !validatePhoneNumber(phoneNumber)) {
      setError("Please fill in name, address, and a valid phone number");
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
            name,
            address,
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

      // Send OTP code
      const result = await signInUserWithPhone(phoneNumber);
      setConfirmationResult(result);
      setStep("verify");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationResult) {
      setError("Please request a code first.");
      return;
    }
    if (!code) {
      setError("Please enter the verification code.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { user, accountData } = await verifyPhoneCodeAndCreateProfile(
        confirmationResult,
        code,
        name,
        address
      );

      // Shape the user object for the local store
      await setUser({
        uid: user.uid,
        phone_number: accountData.phone,
        name: accountData.fullName,
        address: accountData.address,
      });

      setSuccess(true);
      setTimeout(() => {
        router.replace("/dashboard");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Verification failed. Please try again.");
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

        {Platform.OS === "web" && (
          <View style={{ height: 1, width: 1, overflow: "hidden" }}>
            <div id="recaptcha-container" />
          </View>
        )}

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
          label="Address"
          placeholder="123 Main St, City"
          value={address}
          onChangeText={setAddress}
          variant="register"
          required
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

        {step === "verify" && (
          <FormInput
            label="Verification Code"
            placeholder="123456"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            variant="register"
            required
          />
        )}

        {step === "form" ? (
          <CustomButton
            title="Send Code"
            onPress={handleSendCode}
            variant="register"
            buttonVariant="register"
            disabled={
              !name ||
              !address ||
              !phoneNumber ||
              !validatePhoneNumber(phoneNumber)
            }
          />
        ) : (
          <CustomButton
            title="Verify & Create Account"
            onPress={handleVerifyCode}
            variant="register"
            buttonVariant="register"
            disabled={!code}
          />
        )}

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
