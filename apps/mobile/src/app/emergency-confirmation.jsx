import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import CustomButton from "../components/CustomButton";

export default function EmergencyConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" backgroundColor="#000000" />

      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + 40,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Success Icon */}
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "#9AFF55",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <CheckCircle2 size={64} color="#000000" />
        </View>

        {/* Success Message */}
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 28,
            color: "#FFFFFF",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Report Submitted!
        </Text>

        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: "#9A9A9A",
            textAlign: "center",
            lineHeight: 24,
            marginBottom: 48,
            paddingHorizontal: 20,
          }}
        >
          Your emergency report has been successfully submitted. Responders have been notified and will be on their way.
        </Text>

        {/* Action Buttons */}
        <View style={{ width: "100%", gap: 16 }}>
          <CustomButton
            title="View History"
            onPress={() => router.replace("/(tabs)/history")}
            variant="primary"
            buttonVariant="login"
          />

          <CustomButton
            title="Back to Dashboard"
            onPress={() => router.replace("/dashboard")}
            variant="secondary"
            buttonVariant="login"
          />
        </View>

        {/* Report ID (if available) */}
        {params.reportId && (
          <View
            style={{
              marginTop: 32,
              padding: 16,
              backgroundColor: "#252525",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#404040",
              width: "100%",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#9A9A9A",
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              Report ID
            </Text>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: "#FFFFFF",
                textAlign: "center",
              }}
            >
              {params.reportId}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
