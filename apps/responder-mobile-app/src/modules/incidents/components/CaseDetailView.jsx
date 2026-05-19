import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
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
import { getDoc, doc, getFirebaseFirestore, onSnapshot } from "@packages/firebase";
import CaseInfoCard from "@/modules/incidents/components/CaseInfoCard";
import LoadingScreen from "@/components/ui/LoadingScreen";
import ErrorAlert from "@/components/feedback/ErrorAlert";
import { spacing, useResqTheme } from "@/theme";

const toDateValue = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function CaseDetailView() {
  const { colors, statusBarStyle } = useResqTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  /** `/incident/[id]` — dynamic segment `id`; accept legacy `caseId` query param */
  const rawId = params.id ?? params.caseId;
  const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
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

    const caseDocRef = doc(getFirebaseFirestore(), "incidents", caseId);
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
            userId: data.createdByUserId || data.userId || data.user_id || "",
            incidentType: data.incidentCategory || data.incidentType || data.incident_type || "other",
            locationText: data.locationText || data.location_text || "",
            landmark: data.landmark || null,
            peopleInvolved:
              typeof data.peopleInvolved === "number"
                ? data.peopleInvolved
                : typeof data.people_involved === "number"
                  ? data.people_involved
                  : null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            description: data.description || null,
            imageUrl: data.imageUrl || data.image_url || null,
            status: data.status || "pending",
            priority: data.priority || "medium",
            createdAt:
              toDateValue(data.createdAt) ||
              toDateValue(data.created_at) ||
              new Date(),
            updatedAt:
              toDateValue(data.updatedAt) || toDateValue(data.updated_at),
            assignedResourceIds: data.assignedResourceIds || [],
            additionalDetails:
              data.additionalDetails && typeof data.additionalDetails === "object"
                ? data.additionalDetails
                : null,
            additionalDetailsRequestedAt: toDateValue(data.additionalDetailsRequestedAt),
            additionalDetailsSubmittedAt: toDateValue(data.additionalDetailsSubmittedAt),
            touchdownAt: toDateValue(data.touchdownAt),
            touchdownSource: data.touchdownSource || null,
            touchdownDistanceMeters:
              typeof data.touchdownDistanceMeters === "number"
                ? data.touchdownDistanceMeters
                : null,
            postIncidentReport:
              data.postIncidentReport && typeof data.postIncidentReport === "object"
                ? {
                    ...data.postIncidentReport,
                    submittedAt: toDateValue(data.postIncidentReport.submittedAt),
                  }
                : null,
          };

          setCaseData(caseInfo);

          if (caseInfo.userId) {
            try {
              const userDocRef = doc(getFirebaseFirestore(), "users", caseInfo.userId);
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
            }
          }

          setLoading(false);
        } catch (err) {
          setError(err.message || "Failed to load case details");
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message || "Failed to subscribe to case updates");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [caseId]);

  if (!fontsLoaded) return null;

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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={statusBarStyle} backgroundColor={colors.background} />
        <View
          style={{
            backgroundColor: colors.surface,
            paddingTop: insets.top + 20,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <ArrowLeft size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 18,
              color: colors.text,
            }}
          >
            Case Details
          </Text>
        </View>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: spacing.lg }}>
            <ErrorAlert message={error} />
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                marginTop: spacing.md,
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_600SemiBold",
                  fontSize: 16,
                  color: colors.text,
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.background} />

      <View
        style={{
          backgroundColor: colors.surface,
          paddingTop: insets.top + 20,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <ArrowLeft size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 18,
            color: colors.text,
          }}
        >
          Case Details
        </Text>
      </View>

      {error && (
        <View style={{ padding: spacing.lg }}>
          <ErrorAlert message={error} onDismiss={() => setError("")} />
        </View>
      )}

      {caseData && (
        <CaseInfoCard
          case={caseData}
          reporterInfo={reporterInfo}
          onStatusUpdate={() => {}}
        />
      )}
    </View>
  );
}
