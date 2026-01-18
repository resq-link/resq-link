import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  User,
  Phone,
  LogOut,
  Shield,
  Bell,
  HelpCircle,
} from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import BackButton from "@/components/BackButton";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useUserStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" backgroundColor="#000000" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: 20,
          backgroundColor: "#000000",
          borderBottomWidth: 1,
          borderBottomColor: "#404040",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <BackButton
            onPress={() => router.push("/dashboard")}
            size={18}
            style={{ 
              marginRight: 12,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "transparent",
              borderWidth: 0,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 28,
                color: "#FFFFFF",
                marginBottom: 4,
              }}
            >
              Profile Settings
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#9A9A9A",
              }}
            >
              Manage your account
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: insets.bottom + 100, // Extra padding for custom nav bar
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View
          style={{
            backgroundColor: "#252525",
            borderWidth: 1,
            borderColor: "#404040",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#9AFF55",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <User size={40} color="#000000" />
          </View>

          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 20,
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            {user?.name || "User"}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Phone size={16} color="#9A9A9A" style={{ marginRight: 8 }} />
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#9A9A9A",
              }}
            >
              {user?.phone_number || "No phone number"}
            </Text>
          </View>
        </View>

        {/* Settings */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 18,
            color: "#FFFFFF",
            marginBottom: 16,
          }}
        >
          Settings
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: "#252525",
            borderWidth: 1,
            borderColor: "#404040",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#404040",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Bell size={20} color="#9AFF55" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
                marginBottom: 2,
              }}
            >
              Notifications
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#9A9A9A",
              }}
            >
              Manage alert preferences
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#252525",
            borderWidth: 1,
            borderColor: "#404040",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#404040",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Shield size={20} color="#9AFF55" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
                marginBottom: 2,
              }}
            >
              Privacy & Security
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#9A9A9A",
              }}
            >
              Control your data
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#252525",
            borderWidth: 1,
            borderColor: "#404040",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#404040",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <HelpCircle size={20} color="#9AFF55" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
                marginBottom: 2,
              }}
            >
              Help & Support
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#9A9A9A",
              }}
            >
              Get assistance
            </Text>
          </View>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          style={{
            backgroundColor: "#FF3B30",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#FFFFFF" style={{ marginRight: 12 }} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: "#FFFFFF",
            }}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
