import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LogOut, AlertCircle } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import { subscribeToDispatcherAssignedEmergencies, signOut, auth } from "@packages/firebase";
import CaseCard from "@/components/CaseCard";
import LoadingScreen from "@/components/LoadingScreen";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useUserStore();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    // Subscribe to assigned cases
    const unsubscribe = subscribeToDispatcherAssignedEmergencies(
      user.uid,
      (reports) => {
        console.log("Received assigned cases:", reports.length);
        setCases(reports);
        setLoading(false);
        setRefreshing(false);
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
  }, [user, router]);

  const onRefresh = () => {
    setRefreshing(true);
    // The subscription will automatically update
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still logout locally even if Firebase signout fails
      await logout();
      router.replace("/login");
    }
  };

  const handleCasePress = (caseData) => {
    router.push({
      pathname: "/case-detail",
      params: { caseId: caseData.id },
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <LoadingScreen
        title="Loading cases..."
        subtitle="Fetching your assigned cases"
      />
    );
  }

  // Count active cases (pending, enroute, on_scene, or legacy active)
  const activeCount = cases.filter((c) => 
    c.status === "pending" || 
    c.status === "enroute" || 
    c.status === "on_scene" || 
    c.status === "active"
  ).length;
  // Count resolved cases (done or legacy resolved)
  const resolvedCount = cases.filter((c) => c.status === "done" || c.status === "resolved").length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <StatusBar style="dark" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E5EA",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 28,
                color: "#1C1C1E",
              }}
            >
              Dashboard
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#8E8E93",
                marginTop: 4,
              }}
            >
              {user?.email || "Dispatcher"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              padding: 8,
            }}
          >
            <LogOut size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#E6F2FF",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 24,
                color: "#007AFF",
              }}
            >
              {activeCount}
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#007AFF",
                marginTop: 4,
              }}
            >
              Active Cases
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "#E6F7ED",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 24,
                color: "#34C759",
              }}
            >
              {resolvedCount}
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#34C759",
                marginTop: 4,
              }}
            >
              Resolved
            </Text>
          </View>
        </View>
      </View>

      {/* Cases List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 20,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {cases.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 60,
            }}
          >
            <AlertCircle size={48} color="#C7C7CC" />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
                color: "#8E8E93",
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              No Assigned Cases
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#8E8E93",
                textAlign: "center",
                paddingHorizontal: 32,
              }}
            >
              You don't have any assigned cases yet. Cases will appear here when assigned by the command center.
            </Text>
          </View>
        ) : (
          cases.map((caseData) => (
            <CaseCard
              key={caseData.id}
              case={caseData}
              onPress={() => handleCasePress(caseData)}
              onStatusUpdate={() => {
                // The real-time subscription will automatically update the cases
                // This callback is kept for potential future use
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

