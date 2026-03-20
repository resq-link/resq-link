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
import { ArrowLeft, MapPin } from "lucide-react-native";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import { subscribeToDispatcherAssignedEmergencies } from "@packages/firebase";
import LoadingScreen from "@/components/LoadingScreen";
import { colors, radii, spacing } from "@/theme";

const getMarkerColor = (priority, status) => {
  if (status === "pending") return colors.pending;
  if (status === "enroute") return colors.enroute;
  if (status === "on_scene") return colors.onScene;
  if (status === "done" || status === "resolved") return colors.success;
  if (priority === "critical") return colors.priorityCritical;
  if (priority === "high") return colors.priorityHigh;
  if (priority === "medium") return colors.priorityMedium;
  return colors.priorityLow;
};

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
        setLocationError("Failed to get location");
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const unsubscribe = subscribeToDispatcherAssignedEmergencies(
      user.uid,
      (reports) => {
        const casesWithLocation = reports.filter(
          (c) =>
            c.latitude != null &&
            c.longitude != null &&
            c.latitude !== 0 &&
            c.longitude !== 0
        );
        setCases(reports);
        if (casesWithLocation.length > 0 && !userLocation) {
          const first = casesWithLocation[0];
          setMapRegion({
            latitude: first.latitude,
            longitude: first.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }
        setLoading(false);
      },
      { statusFilter: "all", limitCount: 100 }
    );

    return () => unsubscribe();
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
      setLocationError("Failed to get location");
    }
  };

  if (!fontsLoaded) return null;
  if (loading) {
    return (
      <LoadingScreen
        title="Loading map..."
        subtitle="Fetching assigned cases"
      />
    );
  }

  const casesWithLocation = cases.filter(
    (c) =>
      c.latitude != null &&
      c.longitude != null &&
      c.latitude !== 0 &&
      c.longitude !== 0
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.background} />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 20, paddingBottom: spacing.lg },
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Map</Text>
            <Text style={styles.headerSubtitle}>
              {casesWithLocation.length} case
              {casesWithLocation.length !== 1 ? "s" : ""} with location
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation={!!userLocation}
          showsMyLocationButton={false}
        >
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="Your Location"
              pinColor={colors.info}
            />
          )}
          {casesWithLocation.map((caseData) => (
            <Marker
              key={caseData.id}
              coordinate={{
                latitude: caseData.latitude,
                longitude: caseData.longitude,
              }}
              title={getIncidentTypeName(caseData.incidentType)}
              description={caseData.locationText || "No address"}
              pinColor={getMarkerColor(
                caseData.priority || "medium",
                caseData.status
              )}
              onPress={() => handleCasePress(caseData)}
            />
          ))}
        </MapView>

        <TouchableOpacity
          style={styles.myLocationButton}
          onPress={handleMyLocation}
        >
          <MapPin size={20} color={colors.white} />
        </TouchableOpacity>

        {locationError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
        )}
      </View>

      {casesWithLocation.length > 0 ? (
        <View style={[styles.casesList, { bottom: insets.bottom + 84 }]}>
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
                    {caseData.status.replace("_", " ")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.emptyStateContainer, { bottom: insets.bottom + 84 }]}>
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
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
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
    color: colors.text,
  },
  headerSubtitle: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    paddingBottom: 200,
  },
  map: {
    flex: 1,
    zIndex: 1,
  },
  myLocationButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: colors.accent,
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  errorBanner: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: colors.critical,
    borderRadius: radii.md,
    padding: 12,
  },
  errorText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: colors.white,
    textAlign: "center",
  },
  casesList: {
    position: "absolute",
    bottom: 90,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: 40,
    maxHeight: "50%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10,
  },
  casesListTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  casesScroll: {
    gap: 12,
    paddingBottom: 20,
    maxHeight: 300,
  },
  caseCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caseCardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.surfaceHighlight,
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
    color: colors.text,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  priorityText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 10,
    color: colors.white,
    textTransform: "uppercase",
  },
  caseCardLocation: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  caseCardStatus: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  emptyStateContainer: {
    position: "absolute",
    bottom: 90,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xxl,
    paddingBottom: 60,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateTitle: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 18,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
