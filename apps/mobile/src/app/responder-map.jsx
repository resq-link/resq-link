import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { MapPin, Phone, Navigation } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import BackButton from "../components/BackButton";
import { getApiUrl, UI_MODE, mockData } from "../utils/api";
import { useAppTheme } from "@/utils/useAppTheme";

const { height } = Dimensions.get("window");

export default function ResponderMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { colors, isLight } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    fetchResponders();
    const interval = setInterval(fetchResponders, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchResponders = async () => {
    try {
      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        // Simulate API delay for realistic UI testing
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log("🎨 UI MODE: Using mock responder data");
        setResponders(mockData.responders.responders);
        setLoading(false);
        return;
      }

      const response = await fetch(getApiUrl("/api/responders/locations"));
      if (!response.ok) throw new Error("Failed to fetch responders");

      const data = await response.json();
      setResponders(data.responders || []);
    } catch (error) {
      console.error("Error fetching responders:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const getMarkerColor = (unitType) => {
    const type = unitType?.toLowerCase() || "";
    if (type.includes("fire")) return "#FF3B30";
    if (type.includes("police")) return "#5856D6";
    if (type.includes("medical") || type.includes("ambulance"))
      return "#FF9500";
    if (type.includes("rescue")) return "#007AFF";
    return "#9AFF55";
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "#9AFF55";
      case "en_route":
        return "#FF9500";
      case "busy":
        return "#FF3B30";
      default:
        return "#9A9A9A";
    }
  };

  const getStatusBadgeStyle = (status) => {
    const normalizedStatus = (status || "").toLowerCase();
    if (!isLight) {
      const color = getStatusColor(normalizedStatus);
      return {
        backgroundColor: color + "20",
        textColor: color,
      };
    }

    switch (normalizedStatus) {
      case "available":
        return { backgroundColor: "#E8F7ED", textColor: "#1E7A35" };
      case "en_route":
        return { backgroundColor: "#FFF4E5", textColor: "#B35A00" };
      case "busy":
        return { backgroundColor: "#FDEBEC", textColor: "#B42318" };
      default:
        return { backgroundColor: "#EEEEF2", textColor: "#616168" };
    }
  };

  const initialRegion = {
    latitude:
      responders.length > 0 ? parseFloat(responders[0].latitude) : 14.5995,
    longitude:
      responders.length > 0 ? parseFloat(responders[0].longitude) : 120.9842,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: colors.headerBackground,
          zIndex: 1000,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <BackButton
          variant="register"
          iconColor={colors.text}
          style={{
            marginBottom: 16,
            backgroundColor: colors.cardInner,
          }}
        />
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 24,
            color: colors.text,
          }}
        >
          Responder Locations
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 4,
          }}
        >
          {responders.length} responder{responders.length !== 1 ? "s" : ""}{" "}
          nearby
        </Text>
      </View>

      {/* Map */}
      <View style={{ flex: 1, marginTop: insets.top + 120 }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {responders.map((responder) => (
            <Marker
              key={responder.id}
              coordinate={{
                latitude: parseFloat(responder.latitude),
                longitude: parseFloat(responder.longitude),
              }}
              pinColor={getMarkerColor(responder.unit_type)}
              title={responder.name}
              description={responder.unit_type}
            />
          ))}
        </MapView>
      </View>

      {/* Responder List */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.border,
          paddingTop: 20,
          paddingBottom: insets.bottom + 100, // Extra padding for custom nav bar
          maxHeight: height * 0.4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 24,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: colors.text,
            }}
          >
            Active Responders
          </Text>
          <TouchableOpacity onPress={fetchResponders}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: "#9AFF55",
              }}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {responders.map((responder) => {
            const badgeStyle = getStatusBadgeStyle(responder.status);
            return (
            <View
              key={responder.id}
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    color: colors.text,
                    flex: 1,
                  }}
                >
                  {responder.name}
                </Text>
                <View
                  style={{
                    backgroundColor: badgeStyle.backgroundColor,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 11,
                      color: badgeStyle.textColor,
                      textTransform: "capitalize",
                    }}
                  >
                    {responder.status?.replace("_", " ") || "Unknown"}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <Navigation
                  size={14}
                  color={colors.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: colors.textSecondary,
                  }}
                >
                  {responder.unit_type}
                </Text>
              </View>

              {responder.phone_number && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Phone size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 14,
                      color: colors.textSecondary,
                    }}
                  >
                    {responder.phone_number}
                  </Text>
                </View>
              )}
            </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
