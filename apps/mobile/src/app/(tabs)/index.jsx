import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "../../utils/userStore";
import CustomButton from "../../components/CustomButton";
import { useAppTheme } from "@/utils/useAppTheme";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();
  const { colors } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: 20,
          backgroundColor: colors.headerBackground,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 28,
            color: colors.text,
            marginBottom: 4,
          }}
        >
          Emergency Response
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.textSecondary,
          }}
        >
          Report emergencies quickly
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: insets.bottom + 100, // Extra padding for custom nav bar
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Button Card */}
        <TouchableOpacity
          onPress={() => router.push("/emergency-form")}
          style={{
            backgroundColor: "#FF3B30",
            borderRadius: 20,
            padding: 32,
            alignItems: "center",
            marginBottom: 32,
            borderWidth: 2,
            borderColor: "#FF6B5E",
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <AlertCircle size={40} color="#FF3B30" />
          </View>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            Report Emergency
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: "#FFFFFF",
              textAlign: "center",
              opacity: 0.9,
            }}
          >
            Tap to report an emergency situation
          </Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 18,
            color: colors.text,
            marginBottom: 16,
          }}
        >
          Quick Actions
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(tabs)/history")}
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            padding: 20,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.cardInner,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Text style={{ fontSize: 24 }}>📋</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: colors.text,
                marginBottom: 4,
              }}
            >
              View History
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: colors.textSecondary,
              }}
            >
              Check your emergency reports
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/responder-map")}
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            padding: 20,
            marginBottom: 32,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.cardInner,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Text style={{ fontSize: 24 }}>🗺️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: colors.text,
                marginBottom: 4,
              }}
            >
              Responder Map
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: colors.textSecondary,
              }}
            >
              View responder locations
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
