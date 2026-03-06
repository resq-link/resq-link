import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import { getDoc, doc, firestore, onSnapshot } from "@packages/firebase";
import CaseInfoCard from "@/components/CaseInfoCard";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorAlert from "@/components/ErrorAlert";

export default function CaseDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { caseId } = useLocalSearchParams();
  const [caseData, setCaseData] = useState(null);
  const [reporterInfo, setReporterInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (!caseId) {
      setError("Case ID is missing");
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const caseDocRef = doc(firestore, "emergencies", caseId);
    const unsubscribe = onSnapshot(
      caseDocRef,
      async (docSnap) => {
        try {
          setError("");
          if (!docSnap.exists()) {
            throw new Error("Case not found");
          }

          const data = docSnap.data();
          const caseInfo = {
            id: docSnap.id,
            userId: data.userId || data.user_id || "",
            incidentType: data.incidentType || data.incident_type || "other",
            locationText: data.locationText || data.location_text || "",
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            description: data.description || null,
            imageUrl: data.imageUrl || data.image_url || null,
            status: data.status || "pending",
            priority: data.priority || "medium",
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : data.created_at?.toDate
              ? data.created_at.toDate()
              : new Date(data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : data.updated_at?.toDate
              ? data.updated_at.toDate()
              : null,
            dispatcherId: data.dispatcherId || data.dispatcher_id || null,
          };

          setCaseData(caseInfo);

          // Fetch reporter information if userId is available
          if (caseInfo.userId) {
            try {
              const userDocRef = doc(firestore, "users", caseInfo.userId);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                const userData = userDoc.data();
                setReporterInfo({
                  fullName: userData.fullName || userData.name || "",
                  phone: userData.phone || userData.phone_number || "",
                  email: userData.email || "",
                });
              }
            } catch (userError) {
              console.error("Error fetching reporter info:", userError);
              // Don't fail the whole screen if reporter info fails
            }
          }

          setLoading(false);
        } catch (err) {
          console.error("Error processing case data:", err);
          setError(err.message || "Failed to load case details");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error in case subscription:", err);
        setError(err.message || "Failed to subscribe to case updates");
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [caseId]);

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <LoadingScreen
        title="Loading case details..."
        subtitle="Please wait"
      />
    );
  }

  if (error && !caseData) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
        <StatusBar style="light" backgroundColor="#0f172a" />
        <View
          style={{
            backgroundColor: "#3b82f6",
            paddingTop: insets.top + 20,
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#1e293b",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <ArrowLeft size={24} color="#94a3b8" />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 20,
              color: "#94a3b8",
            }}
          >
            Case Details
          </Text>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }}>
          <View style={{ padding: 16, backgroundColor: "#0f172a" }}>
            <ErrorAlert message={error} />
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                marginBottom: 16,
                backgroundColor: "#0f172a",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "#1e293b",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_600SemiBold",
                  fontSize: 16,
                  color: "#94a3b8",
                }}
              >
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar style="light" backgroundColor="#0f172a" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "#0f172a",
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#1e293b",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <ArrowLeft size={24} color="#94a3b8" />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 20,
            color: "#94a3b8",
          }}
        >
          Case Details
        </Text>
      </View>

      {error && (
        <View style={{ padding: 16 }}>
          <ErrorAlert message={error} onDismiss={() => setError("")} />
        </View>
      )}

      {caseData && (
        <CaseInfoCard
          case={caseData}
          reporterInfo={reporterInfo}
          onStatusUpdate={() => {
            // The real-time subscription will automatically update the case data
            // This callback is kept for potential future use
          }}
        />
      )}
    </View>
  );
}

