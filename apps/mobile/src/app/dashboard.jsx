import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Clock,
  User,
  MapPin,
  LogOut,
} from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "../utils/userStore";
import CustomButton from "../components/CustomButton";
import { getApiUrl, UI_MODE, mockData } from "../utils/api";
import { getUserEmergencyReports } from "@packages/firebase";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useUserStore();
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        // Simulate API delay for realistic UI testing
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log("🎨 UI MODE: Using mock emergency list data");
        setReports(mockData.emergencyList.reports);
        setRefreshing(false);
        return;
      }

      // Fetch reports from Firestore
      const userId = user.uid || user.id;
      if (!userId) {
        console.error("User ID not found");
        setRefreshing(false);
        return;
      }

      const reports = await getUserEmergencyReports(userId, 50);
      
      // Convert to expected format
      const formattedReports = reports.map(report => ({
        id: report.id,
        incident_type: report.incidentType,
        location_text: report.locationText,
        status: report.status,
        created_at: report.createdAt instanceof Date 
          ? report.createdAt.toISOString() 
          : (report.createdAt ? new Date(report.createdAt).toISOString() : new Date().toISOString()),
      }));
      
      setReports(formattedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  if (!fontsLoaded) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#FF9500";
      case "responding":
        return "#007AFF";
      case "resolved":
        return "#9AFF55";
      default:
        return "#9A9A9A";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 28,
                color: "#FFFFFF",
                marginBottom: 4,
              }}
            >
              Dashboard
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#9A9A9A",
              }}
            >
              Welcome back, {user?.name || "User"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              padding: 8,
            }}
          >
            <LogOut size={24} color="#9A9A9A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9AFF55"
          />
        }
      >
        {/* Quick Actions */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 18,
            color: "#FFFFFF",
            marginBottom: 16,
          }}
        >
          Quick Actions
        </Text>

        {/* Emergency Button */}
        <TouchableOpacity
          onPress={() => router.push("/emergency-form")}
          style={{
            backgroundColor: "#FF3B30",
            borderRadius: 20,
            padding: 24,
            alignItems: "center",
            marginBottom: 24,
            borderWidth: 2,
            borderColor: "#FF6B5E",
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <AlertCircle size={32} color="#FF3B30" />
          </View>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 20,
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

        {/* Action Cards */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/history")}
            style={{
              flex: 1,
              minWidth: "45%",
              backgroundColor: "#252525",
              borderWidth: 1,
              borderColor: "#404040",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#404040",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Clock size={24} color="#9AFF55" />
            </View>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
                marginBottom: 4,
              }}
            >
              History
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#9A9A9A",
              }}
            >
              View reports
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/responder-map")}
            style={{
              flex: 1,
              minWidth: "45%",
              backgroundColor: "#252525",
              borderWidth: 1,
              borderColor: "#404040",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#404040",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <MapPin size={24} color="#9AFF55" />
            </View>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
                marginBottom: 4,
              }}
            >
              Map
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#9A9A9A",
              }}
            >
              Responders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            style={{
              flex: 1,
              minWidth: "45%",
              backgroundColor: "#252525",
              borderWidth: 1,
              borderColor: "#404040",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#404040",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <User size={24} color="#9AFF55" />
            </View>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
                marginBottom: 4,
              }}
            >
              Profile
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#9A9A9A",
              }}
            >
              Account settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Reports */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 18,
            color: "#FFFFFF",
            marginBottom: 16,
          }}
        >
          Recent Reports
        </Text>

        {reports.length === 0 ? (
          <View
            style={{
              backgroundColor: "#252525",
              borderWidth: 1,
              borderColor: "#404040",
              borderRadius: 16,
              padding: 32,
              alignItems: "center",
            }}
          >
            <Clock size={48} color="#5A5A5A" style={{ marginBottom: 16 }} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
                marginBottom: 8,
              }}
            >
              No Reports Yet
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#9A9A9A",
                textAlign: "center",
              }}
            >
              Your emergency reports will appear here
            </Text>
          </View>
        ) : (
          reports.slice(0, 3).map((report) => (
            <TouchableOpacity
              key={report.id}
              onPress={() => router.push("/(tabs)/history")}
              style={{
                backgroundColor: "#252525",
                borderWidth: 1,
                borderColor: "#404040",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>
                  {report.incident_type === "fire"
                    ? "🔥"
                    : report.incident_type === "medical"
                    ? "🚑"
                    : report.incident_type === "crime"
                    ? "🚓"
                    : report.incident_type === "accident"
                    ? "🚗"
                    : report.incident_type === "flood"
                    ? "🌊"
                    : "⚡"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                      color: "#FFFFFF",
                      marginBottom: 2,
                    }}
                  >
                    {report.incident_type.charAt(0).toUpperCase() +
                      report.incident_type.slice(1)}{" "}
                    Emergency
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: "#9A9A9A",
                    }}
                  >
                    {formatDate(report.created_at)}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: getStatusColor(report.status) + "20",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 10,
                      color: getStatusColor(report.status),
                    }}
                  >
                    {report.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: "#9A9A9A",
                }}
              >
                📍 {report.location_text}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

