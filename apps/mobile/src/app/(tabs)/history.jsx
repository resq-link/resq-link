import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Clock } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import { getApiUrl, UI_MODE, mockData } from "@/utils/api";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        // Simulate API delay for realistic UI testing
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log("🎨 UI MODE: Using mock history data");
        setReports(mockData.emergencyList.reports);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const response = await fetch(getApiUrl(`/api/emergency/list?userId=${user.id}`));
      if (!response.ok) throw new Error("Failed to fetch reports");

      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  if (!fontsLoaded) {
    return null;
  }

  const getIncidentEmoji = (type) => {
    const map = {
      fire: "🔥",
      medical: "🚑",
      crime: "🚓",
      accident: "🚗",
      flood: "🌊",
      other: "⚡",
    };
    return map[type] || "📍";
  };

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
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 28,
            color: "#FFFFFF",
            marginBottom: 4,
          }}
        >
          Emergency History
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: "#9A9A9A",
          }}
        >
          {reports.length} {reports.length === 1 ? "report" : "reports"}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 20,
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
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#9A9A9A",
              }}
            >
              Loading reports...
            </Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <Clock size={48} color="#5A5A5A" style={{ marginBottom: 16 }} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
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
          reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={{
                backgroundColor: "#252525",
                borderWidth: 1,
                borderColor: "#404040",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 32, marginRight: 12 }}>
                  {getIncidentEmoji(report.incident_type)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
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
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      color: getStatusColor(report.status),
                    }}
                  >
                    {report.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderColor: "#404040",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: "#FFFFFF",
                    marginBottom: 4,
                  }}
                >
                  📍 {report.location_text}
                </Text>
                {report.description && (
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 14,
                      color: "#9A9A9A",
                      marginTop: 8,
                    }}
                  >
                    {report.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
