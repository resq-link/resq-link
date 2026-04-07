import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, Radio, ShieldAlert } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import CustomButton from "../components/CustomButton";
import { useAppTheme } from "@/utils/useAppTheme";
import {
  subscribeToEmergencyReport,
  submitEmergencyAdditionalDetails,
} from "@packages/firebase";

const getExpectedAdditionalFields = (incidentType) => {
  const fieldMap = {
    fire: [
      { key: "fireScale", label: "Fire scale / affected area" },
      { key: "structureInvolved", label: "Structure or property involved" },
      { key: "trappedOrInjured", label: "People trapped or injured" },
      { key: "fireSource", label: "Source of fire if known" },
    ],
    medical: [
      { key: "patientCondition", label: "Patient condition" },
      { key: "breathingStatus", label: "Conscious / breathing status" },
      { key: "patientAge", label: "Age or estimated age" },
      { key: "firstAidNeeds", label: "Immediate first-aid needs" },
    ],
    vehicular_accident: [
      { key: "vehiclesInvolved", label: "Vehicles involved" },
      { key: "injuredPersons", label: "Number of injured persons" },
      { key: "roadObstruction", label: "Road obstruction status" },
      { key: "collisionCause", label: "Collision type / cause if known" },
    ],
    police_emergency: [
      { key: "threatNature", label: "Nature of threat" },
      { key: "suspectPresence", label: "Suspect presence or description" },
      { key: "weaponsInvolved", label: "Weapons involved" },
      { key: "safetyRisk", label: "Immediate safety risk" },
    ],
    electrical_powerline_hazard: [
      { key: "hazardType", label: "Type of utility hazard" },
      { key: "liveWireStatus", label: "Live wire / spark / outage status" },
      { key: "affectedArea", label: "Affected homes or road area" },
      { key: "visibleDamage", label: "Visible damage details" },
    ],
    other_emergency: [
      { key: "incidentSummary", label: "Incident-specific summary" },
      { key: "whoIsAffected", label: "Who is affected" },
      { key: "hazardLevel", label: "Current hazard level" },
      { key: "supportNeeded", label: "Support needed on scene" },
    ],
  };

  return fieldMap[incidentType] || fieldMap.other_emergency;
};

const toSubmittedAtLabel = (value) => {
  if (!value) return null;
  const date =
    value instanceof Date
      ? value
      : typeof value === "object" && value && "toDate" in value
        ? value.toDate()
        : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
};

export default function EmergencyConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useAppTheme();
  const reportId = typeof params.reportId === "string" ? params.reportId : "";

  const [report, setReport] = useState(null);
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailValues, setDetailValues] = useState({});
  const loadingAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [loadingAnim]);

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      return;
    }

    const unsubscribe = subscribeToEmergencyReport(reportId, (nextReport) => {
      setReport(nextReport);
    });

    return unsubscribe;
  }, [reportId]);

  const expectedFields = useMemo(
    () => getExpectedAdditionalFields(report?.incidentType || "other_emergency"),
    [report?.incidentType],
  );

  useEffect(() => {
    setDetailValues((current) => {
      const next = {};
      expectedFields.forEach((field) => {
        next[field.key] = report?.additionalDetails?.[field.key] || current[field.key] || "";
      });
      return next;
    });
  }, [expectedFields, report?.additionalDetails]);

  const stage = useMemo(() => {
    if (report?.additionalDetailsSubmittedAt) {
      return "thank_you";
    }
    if (report?.additionalDetailsRequestedAt) {
      return "request_details";
    }
    return "waiting";
  }, [report]);

  const handleSubmitDetails = async () => {
    if (!reportId) {
      setDetailError("Report ID is missing.");
      return;
    }

    const missingField = expectedFields.find(
      (field) => !String(detailValues[field.key] || "").trim(),
    );
    if (missingField) {
      setDetailError(`Please complete "${missingField.label}".`);
      return;
    }

    setIsSubmittingDetails(true);
    setDetailError("");

    try {
      const payload = expectedFields.reduce((acc, field) => {
        acc[field.key] = String(detailValues[field.key] || "").trim();
        return acc;
      }, {});
      await submitEmergencyAdditionalDetails(reportId, payload);
    } catch (error) {
      setDetailError(error.message || "Failed to submit additional details.");
    } finally {
      setIsSubmittingDetails(false);
    }
  };

  const barTranslate = loadingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });

  if (!fontsLoaded) {
    return null;
  }

  const reportSubmittedLabel = toSubmittedAtLabel(report?.createdAt);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 36,
          paddingBottom: insets.bottom + 48,
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            borderRadius: 28,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 24,
          }}
        >
          {stage === "waiting" ? (
            <>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: "#9AFF5522",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  marginBottom: 24,
                }}
              >
                <Radio size={48} color="#9AFF55" />
              </View>

              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 26,
                  color: colors.text,
                  textAlign: "center",
                }}
              >
                Report Received
              </Text>

              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 16,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 24,
                  marginTop: 12,
                }}
              >
                Your report has been submitted and is now being responded to, please do not close the app as dispatcher would need additional details.
              </Text>

              <View
                style={{
                  marginTop: 28,
                  height: 14,
                  borderRadius: 999,
                  overflow: "hidden",
                  backgroundColor: colors.cardInner,
                }}
              >
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: 140,
                    borderRadius: 999,
                    backgroundColor: "#9AFF55",
                    opacity: 0.9,
                    transform: [{ translateX: barTranslate }],
                  }}
                />
              </View>

              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                Waiting for dispatcher acknowledgement...
              </Text>
            </>
          ) : null}

          {stage === "request_details" ? (
            <>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: "#9AFF5522",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  marginBottom: 24,
                }}
              >
                <ShieldAlert size={48} color="#9AFF55" />
              </View>

              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 26,
                  color: colors.text,
                  textAlign: "center",
                }}
              >
                Responders Are On The Way
              </Text>

              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 16,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 24,
                  marginTop: 12,
                  marginBottom: 24,
                }}
              >
                Please provide additional details so dispatch can refine the response.
              </Text>

              {expectedFields.map((field) => (
                <View key={field.key} style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                      color: colors.text,
                      marginBottom: 8,
                    }}
                  >
                    {field.label}
                  </Text>
                  <TextInput
                    value={detailValues[field.key] || ""}
                    onChangeText={(text) =>
                      setDetailValues((current) => ({ ...current, [field.key]: text }))
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    style={{
                      minHeight: 74,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 14,
                      backgroundColor: colors.background,
                      color: colors.text,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontFamily: "Inter_400Regular",
                      fontSize: 15,
                      textAlignVertical: "top",
                    }}
                  />
                </View>
              ))}

              {detailError ? (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: "#FF8A8A",
                    marginBottom: 12,
                  }}
                >
                  {detailError}
                </Text>
              ) : null}

              <CustomButton
                title={isSubmittingDetails ? "Submitting..." : "Submit Details"}
                onPress={handleSubmitDetails}
                variant="primary"
                buttonVariant="login"
                disabled={isSubmittingDetails}
              />
            </>
          ) : null}

          {stage === "thank_you" ? (
            <>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "#9AFF55",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 32,
                  alignSelf: "center",
                }}
              >
                <CheckCircle2 size={64} color="#000000" />
              </View>

              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 28,
                  color: colors.text,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                Thank You
              </Text>

              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 16,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 24,
                  marginBottom: 32,
                  paddingHorizontal: 8,
                }}
              >
                Your additional details were sent successfully. Responders are on the way.
              </Text>

              <View style={{ width: "100%", gap: 4 }}>
                <CustomButton
                  title="View History"
                  onPress={() => router.replace("/(tabs)/history")}
                  variant="primary"
                  buttonVariant="login"
                />

                <CustomButton
                  title="Back to Dashboard"
                  onPress={() => router.replace("/dashboard")}
                  variant="secondary"
                  buttonVariant="login"
                />
              </View>
            </>
          ) : null}

          <View
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              gap: 8,
            }}
          >
            {reportId ? (
              <View
                style={{
                  padding: 14,
                  backgroundColor: colors.background,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginBottom: 4,
                    textAlign: "center",
                  }}
                >
                  Report ID
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: colors.text,
                    textAlign: "center",
                  }}
                >
                  {reportId}
                </Text>
              </View>
            ) : null}

            {reportSubmittedLabel ? (
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.textSecondary,
                  textAlign: "center",
                }}
              >
                Submitted {reportSubmittedLabel}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
