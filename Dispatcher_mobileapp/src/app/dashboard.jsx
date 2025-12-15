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
  Phone,
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
        console.log("🎨 UI MODE: Using mock received incidents data");
        // For dispatcher, show all incidents (not filtered by userId)
        setReports(mockData.emergencyList.reports);
        setRefreshing(false);
        return;
      }

      // For dispatcher dashboard, fetch all incidents
      const response = await fetch(getApiUrl(`/api/emergency/list?dispatcher=true`));
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "#FF3B30";
      case "high":
        return "#FF9500";
      case "medium":
        return "#FFCC00";
      case "low":
        return "#9AFF55";
      default:
        return "#9A9A9A";
    }
  };

  const getIncidentIcon = (incidentType) => {
    switch (incidentType) {
      case "fire":
        return "🔥";
      case "medical":
        return "🚑";
      case "crime":
        return "🚓";
      case "accident":
        return "🚗";
      case "flood":
        return "🌊";
      default:
        return "⚡";
    }
  };

  const getIncidentTypeLabel = (incidentType) => {
    return incidentType.charAt(0).toUpperCase() + incidentType.slice(1);
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
              {user?.agency || user?.name || "Dispatcher"} • Active Incidents
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

      {/* Stats Bar */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 24,
          paddingVertical: 16,
          backgroundColor: "#0A0A0A",
          borderBottomWidth: 1,
          borderBottomColor: "#404040",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              color: "#FF9500",
            }}
          >
            {reports.filter((r) => r.status === "pending").length}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: "#9A9A9A",
            }}
          >
            Pending
          </Text>
        </View>
        <View
          style={{
            width: 1,
            backgroundColor: "#404040",
            marginVertical: 4,
          }}
        />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              color: "#007AFF",
            }}
          >
            {reports.filter((r) => r.status === "responding").length}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: "#9A9A9A",
            }}
          >
            Responding
          </Text>
        </View>
        <View
          style={{
            width: 1,
            backgroundColor: "#404040",
            marginVertical: 4,
          }}
        />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              color: "#9AFF55",
            }}
          >
            {reports.filter((r) => r.status === "resolved").length}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: "#9A9A9A",
            }}
          >
            Resolved
          </Text>
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
        {/* Section Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 20,
              color: "#FFFFFF",
            }}
          >
            Received Incidents
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: "#9A9A9A",
            }}
          >
            {reports.length} total
          </Text>
        </View>

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
            <AlertCircle size={48} color="#5A5A5A" style={{ marginBottom: 16 }} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
                marginBottom: 8,
              }}
            >
              No Incidents Received
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#9A9A9A",
                textAlign: "center",
              }}
            >
              New incidents will appear here as they are reported
            </Text>
          </View>
        ) : (
          reports.map((incident) => (
            <TouchableOpacity
              key={incident.id}
              style={{
                backgroundColor: "#252525",
                borderWidth: 1,
                borderColor: "#404040",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              {/* Header Row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: "#1A1A1A",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>
                    {getIncidentIcon(incident.incident_type)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 16,
                        color: "#FFFFFF",
                      }}
                    >
                      {getIncidentTypeLabel(incident.incident_type)} Emergency
                    </Text>
                    {incident.priority && (
                      <View
                        style={{
                          backgroundColor: getPriorityColor(incident.priority) + "20",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 9,
                            color: getPriorityColor(incident.priority),
                          }}
                        >
                          {incident.priority.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Clock size={12} color="#9A9A9A" />
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: "#9A9A9A",
                      }}
                    >
                      {formatDate(incident.created_at)}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    backgroundColor: getStatusColor(incident.status) + "20",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: getStatusColor(incident.status) + "40",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 10,
                      color: getStatusColor(incident.status),
                    }}
                  >
                    {incident.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <MapPin size={14} color="#9A9A9A" />
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: "#FFFFFF",
                    flex: 1,
                  }}
                >
                  {incident.location_text}
                </Text>
              </View>

              {/* Description */}
              {incident.description && (
                <View
                  style={{
                    backgroundColor: "#1A1A1A",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      color: "#CCCCCC",
                      lineHeight: 18,
                    }}
                  >
                    {incident.description}
                  </Text>
                </View>
              )}

              {/* Reporter Info */}
              {(incident.reporter_name || incident.reporter_phone) && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: "#404040",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <User size={14} color="#9A9A9A" />
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: "#9A9A9A",
                      }}
                    >
                      {incident.reporter_name || "Anonymous"}
                    </Text>
                  </View>
                  {incident.reporter_phone && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Phone size={12} color="#9A9A9A" />
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                          color: "#9AFF55",
                        }}
                      >
                        {incident.reporter_phone}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

