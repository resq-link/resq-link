import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { normalizeOperationalStatus } from "@packages/firebase";
import CustomButton from "@/components/CustomButton";
import { useAppTheme } from "@/hooks/useAppTheme";
import { isActiveReport } from "@/features/history/constants";
import LiveIncidentMapCard from "@/features/emergency/components/confirmation/LiveIncidentMapCard";
import IncidentStatusSection from "@/features/emergency/components/confirmation/IncidentStatusSection";
import IncidentDetailsCard from "@/features/emergency/components/confirmation/IncidentDetailsCard";
import VoiceCallSection from "@/features/emergency/components/confirmation/VoiceCallSection";
import {
  endIncidentCallSession,
  failIncidentCallSession,
  markIncidentCallConnected,
  startIncidentCallSession,
  subscribeToIncidentCallSessions,
  subscribeToEmergencyReport,
} from "@packages/firebase";
import { useAgoraVoiceCall } from "@/hooks/useAgoraVoiceCall";

function SectionDivider({ color }) {
  return (
    <View style={[styles.divider, { backgroundColor: color }]} />
  );
}

export default function EmergencyConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isLight } = useAppTheme();
  const reportId = typeof params.reportId === "string" ? params.reportId : "";

  const [report, setReport] = useState(null);
  const [callSession, setCallSession] = useState(null);
  const [callError, setCallError] = useState("");
  const voiceCall = useAgoraVoiceCall();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      return;
    }
    return subscribeToEmergencyReport(reportId, setReport);
  }, [reportId]);

  useEffect(() => {
    if (!report?.incidentId) {
      setCallSession(null);
      return;
    }

    return subscribeToIncidentCallSessions(report.incidentId, (sessions) => {
      const ownUserId = report.userId;
      const activeSession = sessions.find(
        (session) =>
          session.callerUserId === ownUserId &&
          ["ringing", "accepted", "connected"].includes(session.status)
      );
      setCallSession(activeSession || null);
    });
  }, [report?.incidentId, report?.userId]);

  const handleStartCall = async () => {
    const callIncidentId = report?.incidentId || (reportId ? `report_${reportId}` : "");
    if (!callIncidentId) {
      setCallError("Report ID is missing.");
      return;
    }

    setCallError("");
    try {
      const session = await startIncidentCallSession({
        incidentId: callIncidentId,
        responderUserId: report.assignedResponderId || null,
        assignedResponderId: report.assignedResponderId || null,
      });
      setCallSession(session);
      await voiceCall.join({
        incidentId: session.incidentId,
        channelName: session.channelName,
        onRemoteJoined: () => markIncidentCallConnected(session.id).catch(console.error),
        onError: (error) => {
          if (session.id) {
            failIncidentCallSession(session.id, error?.message).catch(console.error);
          }
        },
      });
    } catch (error) {
      setCallError(error.message || "Voice call failed. Your report remains submitted.");
    }
  };

  const handleEndCall = async () => {
    const sessionId = callSession?.id;
    await voiceCall.leave();
    if (sessionId) {
      await endIncidentCallSession(sessionId).catch(console.error);
    }
    setCallSession(null);
  };

  const showLiveMap = Boolean(
    reportId && report && isActiveReport(report.status)
  );

  const isClosedIncident = useMemo(() => {
    if (!report) return false;
    const normalized = normalizeOperationalStatus(report.status);
    return normalized === "resolved" || normalized === "cancelled";
  }, [report]);

  const canStartVoiceCall = Boolean(report?.incidentId || reportId);
  const activeCallStatus = callSession?.status || voiceCall.phase;
  const callIsLinkedToIncident = Boolean(report?.incidentId);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Incident Status
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <IncidentStatusSection report={report} colors={colors} />

          {showLiveMap ? (
            <>
              <SectionDivider color={colors.border} />
              <LiveIncidentMapCard
                reportId={reportId}
                colors={colors}
                isLight={isLight}
              />
            </>
          ) : null}

          {report ? (
            <>
              <SectionDivider color={colors.border} />
              <IncidentDetailsCard report={report} colors={colors} />
            </>
          ) : null}

          <SectionDivider color={colors.border} />

          <VoiceCallSection
            colors={colors}
            isLight={isLight}
            canStartVoiceCall={canStartVoiceCall}
            activeCallStatus={activeCallStatus}
            callSession={callSession}
            callIsLinkedToIncident={callIsLinkedToIncident}
            callError={callError}
            voiceCall={voiceCall}
            onStartCall={handleStartCall}
            onEndCall={handleEndCall}
          />

          {isClosedIncident ? (
            <>
              <SectionDivider color={colors.border} />
              <View style={styles.closedActions}>
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

          {!isClosedIncident ? (
            <>
              <SectionDivider color={colors.border} />
              <Pressable
                onPress={() => router.replace("/dashboard")}
                style={({ pressed }) => [
                  styles.backToDashboard,
                  { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back to Dashboard"
              >
                <Text style={[styles.backToDashboardText, { color: colors.textSecondary }]}>
                  Back to Dashboard
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.2,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: -2,
  },
  closedActions: {
    gap: 4,
  },
  backToDashboard: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  backToDashboardText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
