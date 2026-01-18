import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import {
  AlertCircle,
  Clock,
  MapPin,
  Navigation,
  Map,
} from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "../utils/userStore";
import { getApiUrl, UI_MODE, mockData } from "../utils/api";
import { getUserEmergencyReports, getAllEmergencyReports } from "@packages/firebase";
import LoadingScreen from "../components/LoadingScreen";

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();
  const [recentReports, setRecentReports] = useState([]);
  const [nearbyReports, setNearbyReports] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (user) {
      fetchUserLocation();
      fetchRecentReports();
    }
  }, [user]);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyReports();
    }
  }, [userLocation]);

  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error("Error getting user location:", error);
    }
  };

  const fetchRecentReports = async () => {
    if (!user) return;

    try {
      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log("🎨 UI MODE: Using mock emergency list data");
        const mockReports = mockData.emergencyList.reports.map(report => ({
          id: report.id,
          incidentType: report.incident_type,
          locationText: report.location_text,
          status: report.status,
          createdAt: new Date(report.created_at),
          latitude: null,
          longitude: null,
        }));
        setRecentReports(mockReports);
        setRefreshing(false);
        return;
      }

      const userId = user.uid || user.id;
      if (!userId) {
        console.error("User ID not found");
        setRefreshing(false);
        return;
      }

      const reports = await getUserEmergencyReports(userId, 10);
      setRecentReports(reports);
    } catch (error) {
      console.error("Error fetching recent reports:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchNearbyReports = async () => {
    if (!userLocation) return;

    try {
      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockReports = [
          {
            id: "nearby-1",
            incidentType: "fire",
            locationText: "456 Oak Ave, 2.3 km away",
            status: "pending",
            createdAt: new Date(Date.now() - 1800000),
            latitude: userLocation.latitude + 0.02,
            longitude: userLocation.longitude + 0.02,
          },
          {
            id: "nearby-2",
            incidentType: "medical",
            locationText: "789 Pine Rd, 5.1 km away",
            status: "active",
            createdAt: new Date(Date.now() - 3600000),
            latitude: userLocation.latitude - 0.03,
            longitude: userLocation.longitude + 0.04,
          },
        ];
        setNearbyReports(mockReports);
        return;
      }

      const allReports = await getAllEmergencyReports(100);
      const userId = user.uid || user.id;

      // Filter out user's own reports and calculate distances
      const nearby = allReports
        .filter(report => report.userId !== userId && report.latitude && report.longitude)
        .map(report => {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            report.latitude,
            report.longitude
          );
          return { ...report, distance };
        })
        .filter(report => report.distance <= 10) // Within 10km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5); // Top 5 nearest

      setNearbyReports(nearby);
    } catch (error) {
      console.error("Error fetching nearby reports:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserLocation();
    fetchRecentReports();
  };

  if (!fontsLoaded) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#FF9500";
      case "active":
      case "enroute":
      case "responding":
        return "#007AFF";
      case "resolved":
      case "done":
        return "#9AFF55";
      default:
        return "#9A9A9A";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "PENDING";
      case "active":
        return "ACTIVE";
      case "enroute":
        return "EN ROUTE";
      case "on_scene":
        return "ON SCENE";
      case "responding":
        return "RESPONDING";
      case "resolved":
      case "done":
        return "RESOLVED";
      default:
        return status.toUpperCase();
    }
  };

  const getIncidentEmoji = (type) => {
    switch (type) {
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

  const formatDate = (date) => {
    if (!date) return "Unknown";
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now - dateObj;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDistance = (distance) => {
    if (distance === Infinity || !distance) return "Unknown";
    if (distance < 1) return `${Math.round(distance * 1000)}m away`;
    return `${distance.toFixed(1)}km away`;
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
          borderBottomColor: "#1A1A1A",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 32,
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
            onPress={() => router.push("/responder-map")}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: "#1A1A1A",
            }}
          >
            <Map size={20} color="#9AFF55" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9AFF55"
            colors={["#9AFF55"]}
          />
        }
      >
        {/* Report Emergency Button */}
        <TouchableOpacity
          onPress={() => router.push("/emergency-form")}
          activeOpacity={0.9}
          style={{
            backgroundColor: "#FF3B30",
            borderRadius: 24,
            padding: 32,
            alignItems: "center",
            marginBottom: 40,
            shadowColor: "#FF3B30",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
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
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <AlertCircle size={40} color="#FF3B30" strokeWidth={2.5} />
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
              fontSize: 15,
              color: "#FFFFFF",
              textAlign: "center",
              opacity: 0.95,
              lineHeight: 20,
            }}
          >
            Tap to report an emergency situation
          </Text>
        </TouchableOpacity>

        {/* Recent Reports Section */}
        <View style={{ marginBottom: 32 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 20,
                color: "#FFFFFF",
              }}
            >
              Recent Reports
            </Text>
            {recentReports.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/history")}
                style={{ paddingVertical: 4 }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: "#9AFF55",
                  }}
                >
                  View All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {recentReports.length === 0 ? (
            <View
              style={{
                backgroundColor: "#1A1A1A",
                borderWidth: 1,
                borderColor: "#2A2A2A",
                borderRadius: 20,
                padding: 40,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#2A2A2A",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Clock size={32} color="#5A5A5A" />
              </View>
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
                  lineHeight: 20,
                }}
              >
                Your emergency reports will appear here
              </Text>
            </View>
          ) : (
            recentReports.slice(0, 3).map((report) => (
              <TouchableOpacity
                key={report.id}
                onPress={() => router.push("/(tabs)/history")}
                activeOpacity={0.8}
                style={{
                  backgroundColor: "#1A1A1A",
                  borderWidth: 1,
                  borderColor: "#2A2A2A",
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 12,
                }}
              >
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
                      backgroundColor: "#2A2A2A",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>
                      {getIncidentEmoji(report.incidentType)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        color: "#FFFFFF",
                        marginBottom: 4,
                        textTransform: "capitalize",
                      }}
                    >
                      {report.incidentType} Emergency
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <MapPin size={14} color="#9A9A9A" style={{ marginRight: 6 }} />
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 13,
                          color: "#9A9A9A",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {report.locationText}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Clock size={12} color="#9A9A9A" style={{ marginRight: 6 }} />
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 12,
                            color: "#9A9A9A",
                          }}
                        >
                          {formatDate(report.createdAt)}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: getStatusColor(report.status) + "20",
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 10,
                            color: getStatusColor(report.status),
                            letterSpacing: 0.5,
                          }}
                        >
                          {getStatusLabel(report.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Reported Near You Section */}
        <View style={{ marginBottom: 32 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Navigation size={20} color="#9AFF55" style={{ marginRight: 8 }} />
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                  color: "#FFFFFF",
                }}
              >
                Reported Near You
              </Text>
            </View>
          </View>

          {nearbyReports.length === 0 ? (
            <View
              style={{
                backgroundColor: "#1A1A1A",
                borderWidth: 1,
                borderColor: "#2A2A2A",
                borderRadius: 20,
                padding: 40,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#2A2A2A",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <MapPin size={32} color="#5A5A5A" />
              </View>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: "#FFFFFF",
                  marginBottom: 8,
                }}
              >
                No Nearby Reports
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: "#9A9A9A",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Emergency reports near your location will appear here
              </Text>
            </View>
          ) : (
            nearbyReports.map((report) => (
              <TouchableOpacity
                key={report.id}
                activeOpacity={0.8}
                style={{
                  backgroundColor: "#1A1A1A",
                  borderWidth: 1,
                  borderColor: "#2A2A2A",
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 12,
                }}
              >
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
                      backgroundColor: "#2A2A2A",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>
                      {getIncidentEmoji(report.incidentType)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        color: "#FFFFFF",
                        marginBottom: 4,
                        textTransform: "capitalize",
                      }}
                    >
                      {report.incidentType} Emergency
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <MapPin size={14} color="#9AFF55" style={{ marginRight: 6 }} />
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 13,
                          color: "#9AFF55",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {formatDistance(report.distance)} • {report.locationText}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Clock size={12} color="#9A9A9A" style={{ marginRight: 6 }} />
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 12,
                            color: "#9A9A9A",
                          }}
                        >
                          {formatDate(report.createdAt)}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: getStatusColor(report.status) + "20",
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 10,
                            color: getStatusColor(report.status),
                            letterSpacing: 0.5,
                          }}
                        >
                          {getStatusLabel(report.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

