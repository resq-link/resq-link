import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { ArrowLeft, MapPin, AlertCircle } from "lucide-react-native";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import { subscribeToDispatcherAssignedEmergencies } from "@packages/firebase";
import LoadingScreen from "@/components/LoadingScreen";

const { width, height } = Dimensions.get("window");

// Get marker color based on priority and status
const getMarkerColor = (priority, status) => {
  if (status === "pending") return "#eab308"; // yellow
  if (status === "enroute") return "#3b82f6"; // blue
  if (status === "on_scene") return "#8b5cf6"; // purple
  if (status === "done" || status === "resolved") return "#10b981"; // green
  if (priority === "critical") return "#dc2626"; // red
  if (priority === "high") return "#ea580c"; // orange
  if (priority === "medium") return "#f59e0b"; // amber
  return "#10b981"; // green
};

// Get incident type display name
const getIncidentTypeName = (incidentType) => {
  const typeMap = {
    fire: "Fire",
    medical: "Medical Emergency",
    crime: "Crime",
    accident: "Traffic Accident",
    flood: "Flood",
    other: "Other Emergency",
  };
  return typeMap[incidentType] || "Emergency";
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 17.6132, // Default: Tuguegarao City
    longitude: 121.7270,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Request location permission and get user location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Location permission denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.error("Error getting location:", error);
        setLocationError("Failed to get location");
      }
    })();
  }, []);

  // Subscribe to assigned cases with real-time updates
  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const unsubscribe = subscribeToDispatcherAssignedEmergencies(
      user.uid,
      (reports) => {
        console.log("Received assigned cases for map:", reports.length);
        
        // Filter cases with valid coordinates
        const casesWithLocation = reports.filter(
          (c) =>
            c.latitude != null &&
            c.longitude != null &&
            c.latitude !== 0 &&
            c.longitude !== 0
        );

        setCases(reports);

        // Auto-center map on first case if no user location
        if (casesWithLocation.length > 0 && !userLocation) {
          const firstCase = casesWithLocation[0];
          setMapRegion({
            latitude: firstCase.latitude,
            longitude: firstCase.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }

        setLoading(false);
      },
      {
        statusFilter: "all",
        limitCount: 100,
      }
    );

    return () => {
      console.log("Unsubscribing from assigned cases");
      unsubscribe();
    };
  }, [user, router, userLocation]);

  const handleCasePress = (caseData) => {
    setSelectedCase(caseData);
    if (caseData.latitude && caseData.longitude) {
      setMapRegion({
        latitude: caseData.latitude,
        longitude: caseData.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleMyLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error("Error getting location:", error);
      setLocationError("Failed to get location");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <LoadingScreen
        title="Loading map..."
        subtitle="Fetching assigned cases"
      />
    );
  }

  // Filter cases with valid coordinates
  const casesWithLocation = cases.filter(
    (c) =>
      c.latitude != null &&
      c.longitude != null &&
      c.latitude !== 0 &&
      c.longitude !== 0
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#0f172a" />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            paddingBottom: 16,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#f1f5f9" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Command Center Map</Text>
            <Text style={styles.headerSubtitle}>
              {casesWithLocation.length} case
              {casesWithLocation.length !== 1 ? "s" : ""} with location
            </Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation={!!userLocation}
          showsMyLocationButton={false}
        >
          {/* User Location Marker */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="Your Location"
              pinColor="#3b82f6"
            />
          )}

          {/* Case Markers */}
          {casesWithLocation.map((caseData) => {
            const color = getMarkerColor(
              caseData.priority || "medium",
              caseData.status
            );
            return (
              <Marker
                key={caseData.id}
                coordinate={{
                  latitude: caseData.latitude,
                  longitude: caseData.longitude,
                }}
                title={getIncidentTypeName(caseData.incidentType)}
                description={caseData.locationText || "No address"}
                pinColor={color}
                onPress={() => handleCasePress(caseData)}
              />
            );
          })}
        </MapView>

        {/* My Location Button */}
        <TouchableOpacity
          style={styles.myLocationButton}
          onPress={handleMyLocation}
        >
          <MapPin size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Location Error */}
        {locationError && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#FF3B30" />
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
        )}
      </View>

      {/* Cases List */}
      {casesWithLocation.length > 0 && (
        <View style={styles.casesList}>
          <Text style={styles.casesListTitle}>Assigned Cases</Text>
          <View style={styles.casesScroll}>
            {casesWithLocation.map((caseData) => (
              <TouchableOpacity
                key={caseData.id}
                style={[
                  styles.caseCard,
                  selectedCase?.id === caseData.id && styles.caseCardSelected,
                ]}
                onPress={() => handleCasePress(caseData)}
              >
                <View style={styles.caseCardContent}>
                  <View style={styles.caseCardHeader}>
                    <Text style={styles.caseCardType}>
                      {getIncidentTypeName(caseData.incidentType)}
                    </Text>
                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor: getMarkerColor(
                            caseData.priority || "medium",
                            caseData.status
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.priorityText}>
                        {caseData.priority || "medium"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.caseCardLocation} numberOfLines={1}>
                    {caseData.locationText || "No address"}
                  </Text>
                  <Text style={styles.caseCardStatus}>
                    Status: {caseData.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* No Cases Message */}
      {casesWithLocation.length === 0 && (
        <View style={styles.emptyState}>
          <AlertCircle size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateTitle}>No Cases with Location</Text>
          <Text style={styles.emptyStateText}>
            {cases.length === 0
              ? "You don't have any assigned cases yet."
              : `${cases.length - casesWithLocation.length} case(s) without location data.`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: "#f1f5f9",
  },
  headerSubtitle: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    paddingBottom: 200, // Add padding to prevent map from being hidden behind cases list
  },
  map: {
    flex: 1,
    zIndex: 1, // Ensure map stays below the cases list
  },
  myLocationButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#1e293b",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorBanner: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: "#1e293b",
    borderColor: "#ef4444",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    color: "#f87171",
    flex: 1,
  },
  casesList: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    paddingBottom: 40,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10, // Ensure it stays above the map
  },
  casesListTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: "#f1f5f9",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  casesScroll: {
    gap: 12,
    paddingBottom: 20,
    maxHeight: 300,
  },
  caseCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  caseCardSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#1e40af",
  },
  caseCardContent: {
    gap: 4,
  },
  caseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caseCardType: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 14,
    color: "#f1f5f9",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 10,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  caseCardLocation: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 4,
  },
  caseCardStatus: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "capitalize",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#0f172a",
  },
  emptyStateTitle: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 18,
    color: "#f1f5f9",
    marginTop: 16,
    textAlign: "center",
  },
  emptyStateText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
