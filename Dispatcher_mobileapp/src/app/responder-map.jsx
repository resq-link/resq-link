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

const { height } = Dimensions.get("window");

export default function ResponderMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const initialRegion = {
    latitude:
      responders.length > 0 ? parseFloat(responders[0].latitude) : 14.5995,
    longitude:
      responders.length > 0 ? parseFloat(responders[0].longitude) : 120.9842,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

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
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: "#000000",
          zIndex: 1000,
          borderBottomWidth: 1,
          borderBottomColor: "#404040",
        }}
      >
        <BackButton variant="register" style={{ marginBottom: 16 }} />
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 24,
            color: "#FFFFFF",
          }}
        >
          Responder Locations
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: "#9A9A9A",
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
          backgroundColor: "#000000",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: "#404040",
          paddingTop: 20,
          paddingBottom: insets.bottom + 20,
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
              color: "#FFFFFF",
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
          {responders.map((responder) => (
            <View
              key={responder.id}
              style={{
                backgroundColor: "#252525",
                borderWidth: 1,
                borderColor: "#404040",
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
                    color: "#FFFFFF",
                    flex: 1,
                  }}
                >
                  {responder.name}
                </Text>
                <View
                  style={{
                    backgroundColor: getStatusColor(responder.status) + "20",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 11,
                      color: getStatusColor(responder.status),
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
                  color="#9A9A9A"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: "#9A9A9A",
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
                  <Phone size={14} color="#9A9A9A" style={{ marginRight: 8 }} />
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 14,
                      color: "#9A9A9A",
                    }}
                  >
                    {responder.phone_number}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
