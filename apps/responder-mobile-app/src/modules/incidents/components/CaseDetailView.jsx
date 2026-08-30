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
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import {
  getDoc,
  doc,
  getFirebaseFirestore,
  onSnapshot,
  parseResponderAssessment,
  resolveIncidentDisplayFields,
} from "@packages/firebase";
import CaseInfoCard from "@/modules/incidents/components/CaseInfoCard";
import CaseDetailSkeleton from "@/modules/incidents/components/CaseDetailSkeleton";
import ErrorAlert from "@/components/feedback/ErrorAlert";
import { spacing, useResqTheme } from "@/theme";

const toDateValue = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toCoordinateValue = (value) => {
  if (value == null || value === "") return null;
  const coordinate = typeof value === "number" ? value : Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
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
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!caseId || caseId === "undefined" || caseId === "null") {
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
          const latitude = toCoordinateValue(data.latitude ?? data.location?.latitude);
          const longitude = toCoordinateValue(data.longitude ?? data.location?.longitude);
          const incidentCategory =
            data.incidentCategory || data.incidentType || data.incident_type || "other";
          const displayFields = resolveIncidentDisplayFields({
            incidentType: data.incidentType || data.incident_type || null,
            incidentCategory,
            incidentSubtypeLabel: data.incidentSubtypeLabel || "",
            description: data.description || null,
            typeProfile: data.typeProfile || data.type_profile || data.profile || null,
            incidentTypeLabel: data.incidentTypeLabel || null,
          });

          const caseInfo = {
            id: docSnap.id,
            userId: data.createdByUserId || data.userId || data.user_id || "",
            incidentCategory,
            incidentType: displayFields.incidentType,
            incidentTypeLabel: displayFields.incidentTypeLabel,
            assessmentIncidentType: displayFields.incidentType,
            locationText: data.locationText || data.location_text || "",
            landmark: data.landmark || null,
            peopleInvolved:
              typeof data.peopleInvolved === "number"
                ? data.peopleInvolved
                : typeof data.people_involved === "number"
                  ? data.people_involved
                  : null,
            latitude,
            longitude,
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
            acceptedAt: toDateValue(data.acceptedAt),
            touchdownAt: toDateValue(data.touchdownAt),
            touchdownRecordedAt: toDateValue(data.touchdownRecordedAt),
            touchdownSource: data.touchdownSource || null,
            touchdownDistanceMeters:
              typeof data.touchdownDistanceMeters === "number"
                ? data.touchdownDistanceMeters
                : null,
            onScenePhotoUrl: data.onScenePhotoUrl || null,
            onScenePhotoUploadedAt: toDateValue(data.onScenePhotoUploadedAt),
            onScenePhotoUploadedBy: data.onScenePhotoUploadedBy || null,
            onSceneLatitude:
              typeof data.onSceneLatitude === "number" ? data.onSceneLatitude : null,
            onSceneLongitude:
              typeof data.onSceneLongitude === "number" ? data.onSceneLongitude : null,
            onSceneGpsCapturedAt: toDateValue(data.onSceneGpsCapturedAt),
            responseTimeSeconds:
              typeof data.responseTimeSeconds === "number"
                ? data.responseTimeSeconds
                : null,
            postIncidentReport:
              data.postIncidentReport && typeof data.postIncidentReport === "object"
                ? {
                    ...data.postIncidentReport,
                    submittedAt: toDateValue(data.postIncidentReport.submittedAt),
                  }
                : null,
            responderAssessment: parseResponderAssessment(data.responderAssessment),
            // Per-agency assignment map — required for multi-agency isolation (touchdown,
            // scene assessment, post-report, isResolved all key off this).
            responderAssignments:
              data.responderAssignments && typeof data.responderAssignments === "object"
                ? Object.fromEntries(
                    Object.entries(data.responderAssignments).map(([uid, assignment]) => [
                      uid,
                      {
                        ...assignment,
                        acceptedAt: toDateValue(assignment.acceptedAt),
                        touchdownAt: toDateValue(assignment.touchdownAt),
                        touchdownRecordedAt: toDateValue(assignment.touchdownRecordedAt),
                        declinedAt: toDateValue(assignment.declinedAt),
                        onSceneGpsCapturedAt: toDateValue(assignment.onSceneGpsCapturedAt),
                        sceneReport:
                          assignment.sceneReport && typeof assignment.sceneReport === "object"
                            ? {
                                ...assignment.sceneReport,
                                submittedAt: toDateValue(assignment.sceneReport.submittedAt),
                              }
                            : null,
                        responderAssessment: parseResponderAssessment(
                          assignment.responderAssessment,
                        ),
                        postIncidentReport:
                          assignment.postIncidentReport &&
                          typeof assignment.postIncidentReport === "object"
                            ? {
                                ...assignment.postIncidentReport,
                                submittedAt: toDateValue(assignment.postIncidentReport.submittedAt),
                              }
                            : null,
                      },
                    ]),
                  )
                : null,
            // Per-responder post-report map — needed so each agency's "hasUserPostReport" is UID-keyed.
            postIncidentReports:
              data.postIncidentReports && typeof data.postIncidentReports === "object"
                ? Object.fromEntries(
                    Object.entries(data.postIncidentReports).map(([uid, report]) => [
                      uid,
                      {
                        ...report,
                        submittedAt: toDateValue(report.submittedAt),
                      },
                    ]),
                  )
                : null,
            sceneReports:
              data.sceneReports && typeof data.sceneReports === "object"
                ? Object.fromEntries(
                    Object.entries(data.sceneReports).map(([uid, report]) => [
                      uid,
                      {
                        ...report,
                        submittedAt: toDateValue(report.submittedAt),
                      },
                    ]),
                  )
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
    return <CaseDetailSkeleton />;
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
              fontFamily: "Inter_700Bold",
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
                  fontFamily: "Inter_600SemiBold",
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
          onBackPress={() => router.back()}
        />
      )}
    </View>
  );
}
