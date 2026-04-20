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
import { CheckCircle2, Radio } from "lucide-react-native";
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
  const channelWave = useRef(new Animated.Value(0)).current;
  const ringPulseA = useRef(new Animated.Value(0)).current;
  const ringPulseB = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(channelWave, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [channelWave]);

  useEffect(() => {
    const expandLoop = (value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 1700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const loopA = expandLoop(ringPulseA);
    loopA.start();
    let loopB;
    const t = setTimeout(() => {
      loopB = expandLoop(ringPulseB);
      loopB.start();
    }, 780);
    return () => {
      clearTimeout(t);
      loopA.stop();
      loopB?.stop();
    };
  }, [ringPulseA, ringPulseB]);

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

    setIsSubmittingDetails(true);
    setDetailError("");

    try {
      const payload = expectedFields.reduce((acc, field) => {
        const value = String(detailValues[field.key] || "").trim();
        if (value) {
          acc[field.key] = value;
        }
        return acc;
      }, {});
      if (Object.keys(payload).length === 0) {
        payload.noAdditionalDetails = "No additional details were provided.";
      }
      await submitEmergencyAdditionalDetails(reportId, payload);
    } catch (error) {
      setDetailError(error.message || "Failed to submit additional details.");
    } finally {
      setIsSubmittingDetails(false);
    }
  };

  const ACCENT = "#9AFF55";

  const hubScale = channelWave.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  const ringScaleA = ringPulseA.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 2.35],
  });
  const ringOpacityA = ringPulseA.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0.55, 0.4, 0],
  });
  const ringScaleB = ringPulseB.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 2.35],
  });
  const ringOpacityB = ringPulseB.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0.55, 0.4, 0],
  });

  const dispatchDotOpacity = (index) => {
    const pattern = [0.22, 0.5, 1, 0.38, 0.72];
    const n = pattern.length;
    const outputRange = Array.from({ length: n }, (_, i) => pattern[(i + index) % n]);
    return channelWave.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange,
    });
  };

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
                  alignSelf: "center",
                  width: 132,
                  height: 132,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 22,
                }}
              >
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    borderWidth: 2,
                    borderColor: ACCENT,
                    opacity: ringOpacityA,
                    transform: [{ scale: ringScaleA }],
                  }}
                />
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    borderWidth: 2,
                    borderColor: ACCENT,
                    opacity: ringOpacityB,
                    transform: [{ scale: ringScaleB }],
                  }}
                />
                <Animated.View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: `${ACCENT}28`,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: hubScale }],
                  }}
                >
                  <Radio size={44} color={ACCENT} strokeWidth={2.2} />
                </Animated.View>
              </View>

              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 24,
                  color: colors.text,
                  textAlign: "center",
                }}
              >
                Handoff in progress
              </Text>

              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                  marginTop: 10,
                  paddingHorizontal: 4,
                }}
              >
                Live on the dispatch queue — stay on this screen.
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginTop: 26,
                  height: 28,
                }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <Animated.View
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: ACCENT,
                      opacity: dispatchDotOpacity(i),
                    }}
                  />
                ))}
              </View>

              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 14,
                  textAlign: "center",
                  fontStyle: "italic",
                }}
              >
                Listening for dispatcher acknowledgement…
              </Text>
            </>
          ) : null}

          {stage === "request_details" ? (
            <>
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
                Providing additional details is optional.
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
                    {field.label} (optional)
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

          {reportSubmittedLabel ? (
            <View
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
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
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
