import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import {
  subscribeToDispatcherAssignedEmergencies,
  auth,
  updateDispatcherLocation,
  setDispatcherOnlineStatus,
} from "@packages/firebase";
import * as Location from "expo-location";
import { LOCATION_PAUSED_KEY } from "./location";
import CaseCard from "@/components/CaseCard";
import LoadingScreen from "@/components/LoadingScreen";
import { colors, spacing, radii } from "@/theme";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationPaused, setLocationPaused] = useState(false);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }

    const unsubscribe = subscribeToDispatcherAssignedEmergencies(
      firebaseUser.uid,
      (reports) => {
        setCases(reports);
        setLoading(false);
        setRefreshing(false);
      },
      { statusFilter: "all", limitCount: 100 }
    );

    return () => unsubscribe();
  }, [user, router]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      AsyncStorage.getItem(LOCATION_PAUSED_KEY).then((raw) => {
        if (!cancelled) setLocationPaused(raw === "true");
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    if (!user) return;
    if (locationPaused) return;
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    let locationSubscription = null;
    let locationUpdateInterval = null;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        await setDispatcherOnlineStatus(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        await updateDispatcherLocation(
          location.coords.latitude,
          location.coords.longitude
        );

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 30000,
            distanceInterval: 50,
          },
          async (loc) => {
            try {
              await updateDispatcherLocation(
                loc.coords.latitude,
                loc.coords.longitude
              );
            } catch (e) {
              console.error("Error updating location:", e);
            }
          }
        );

        locationUpdateInterval = setInterval(async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            await updateDispatcherLocation(
              loc.coords.latitude,
              loc.coords.longitude
            );
          } catch (e) {
            console.error("Error updating location:", e);
          }
        }, 60000);
      } catch (e) {
        console.error("Error setting up location tracking:", e);
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (locationUpdateInterval) clearInterval(locationUpdateInterval);
      setDispatcherOnlineStatus(false).catch(console.error);
    };
  }, [user, locationPaused]);

  const onRefresh = () => setRefreshing(true);
  const handleCasePress = (caseData) => {
    router.push({ pathname: "/case-detail", params: { caseId: caseData.id } });
  };

  if (!fontsLoaded) return null;
  if (loading) {
    return (
      <LoadingScreen
        title="Loading cases..."
        subtitle="Fetching your assigned cases"
      />
    );
  }

  const activeCount = cases.filter(
    (c) =>
      c.status === "pending" ||
      c.status === "enroute" ||
      c.status === "on_scene" ||
      c.status === "active"
  ).length;
  const resolvedCount = cases.filter(
    (c) => c.status === "done" || c.status === "resolved"
  ).length;
  const totalCases = cases.length;
  const resolvedPercentage =
    totalCases > 0 ? Math.round((resolvedCount / totalCases) * 100) : 0;
  const respondersAvailable = 12;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" backgroundColor={colors.background} />

      <View
        style={{
          backgroundColor: colors.surface,
          paddingTop: insets.top + 20,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.lg,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 26,
                color: colors.text,
                letterSpacing: -0.5,
              }}
            >
              Dashboard
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              {user?.email || "Responder"}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surfaceElevated,
              borderRadius: radii.lg,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 28,
                color: colors.pending,
              }}
            >
              {activeCount}
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Active
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surfaceElevated,
              borderRadius: radii.lg,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 28,
                color: colors.success,
              }}
            >
              {resolvedCount}
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Resolved
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surfaceElevated,
              borderRadius: radii.lg,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 28,
                color: colors.info,
              }}
            >
              {respondersAvailable}
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Online
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {cases.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 48,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.surfaceElevated,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: spacing.lg,
              }}
            />
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 18,
                color: colors.text,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              No Assigned Cases
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                paddingHorizontal: 32,
              }}
            >
              Cases will appear here when assigned by the command center.
            </Text>
          </View>
        ) : (
          cases.map((caseData) => (
            <CaseCard
              key={caseData.id}
              case={caseData}
              onPress={() => handleCasePress(caseData)}
              onStatusUpdate={() => {}}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
