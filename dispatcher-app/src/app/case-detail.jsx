import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { getDoc, doc, firestore } from "@packages/firebase";
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
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!caseId) {
      setError("Case ID is missing");
      setLoading(false);
      return;
    }

    fetchCaseDetails();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch case details
      const caseDocRef = doc(firestore, "emergencies", caseId);
      const caseDoc = await getDoc(caseDocRef);

      if (!caseDoc.exists()) {
        throw new Error("Case not found");
      }

      const data = caseDoc.data();
      const caseInfo = {
        id: caseDoc.id,
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
      console.error("Error fetching case details:", err);
      setError(err.message || "Failed to load case details");
      setLoading(false);
    }
  };

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
      <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
        <StatusBar style="dark" backgroundColor="#F5F5F5" />
        <View
          style={{
            backgroundColor: "#FFFFFF",
            paddingTop: insets.top + 20,
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E5EA",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <ArrowLeft size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 20,
              color: "#1C1C1E",
            }}
          >
            Case Details
          </Text>
        </View>
        <View style={{ flex: 1, padding: 16 }}>
          <ErrorAlert message={error} />
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "#007AFF",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: "#FFFFFF",
              }}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <ArrowLeft size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 20,
            color: "#1C1C1E",
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
        <CaseInfoCard case={caseData} reporterInfo={reporterInfo} />
      )}
    </View>
  );
}

