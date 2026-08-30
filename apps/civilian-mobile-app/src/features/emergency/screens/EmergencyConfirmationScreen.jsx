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
import {
  normalizeOperationalStatus,
  subscribeToEmergencyReport,
  startIncidentCallSession,
  subscribeToUserIncomingCalls,
  acceptIncidentCallSession,
  declineIncidentCallSession,
} from "@packages/firebase";
import { Phone, MessageSquare, Radio } from "lucide-react-native";
import CustomButton from "@/components/CustomButton";
import { useAppTheme } from "@/hooks/useAppTheme";
import useUserStore from "@/stores/userStore";
import IncidentStatusSection from "@/features/emergency/components/confirmation/IncidentStatusSection";
import IncidentDetailsCard from "@/features/emergency/components/confirmation/IncidentDetailsCard";
import CivilianCallModal from "@/features/emergency/components/CivilianCallModal";
import CivilianIncidentChatModal from "@/features/emergency/components/CivilianIncidentChatModal";

function SectionDivider({ color }) {
  return (
    <View style={[styles.divider, { backgroundColor: color }]} />
  );
}

export default function EmergencyConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useAppTheme();
  const { user } = useUserStore();
  const reportId = typeof params.reportId === "string" ? params.reportId : "";

  const [report, setReport] = useState(null);
  const [activeCallSession, setActiveCallSession] = useState(null);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);

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

  const isClosedIncident = useMemo(() => {
    if (!report) return false;
    const normalized = normalizeOperationalStatus(report.status);
    return normalized === "resolved" || normalized === "cancelled";
  }, [report]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  const userId = user?.uid || user?.id;

  // Listen for incoming calls
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToUserIncomingCalls(userId, (sessions) => {
      const ringing = sessions.find(
        (s) => (s.status === "ringing" || s.status === "queued") && s.callerUserId !== userId
      );
      if (ringing) {
        setActiveCallSession(ringing);
        setIsIncomingCall(true);
        setIsCallModalVisible(true);
      }
    });
    return () => unsub();
  }, [userId]);

  const handleCallDispatcher = async () => {
    if (!report?.id) return;
    try {
      const session = await startIncidentCallSession({
        incidentId: report.id,
        callerUserId: userId,
        callerRole: "civilian",
        callerName: user?.name || user?.fullName || "Citizen",
        callerPhone: user?.phoneNumber || user?.phone || null,
        targetRole: "dispatcher",
        targetName: "Command Center Dispatch",
        incidentReferenceNumber: report.id ? `APP-${report.id.slice(-5).toUpperCase()}` : null,
        incidentType: report.incidentType,
        incidentLocationText: report.locationText,
      });
      setActiveCallSession(session);
      setIsIncomingCall(false);
      setIsCallModalVisible(true);
    } catch (err) {
      console.error("Failed to call dispatcher:", err);
    }
  };

  const handleCallResponder = async () => {
    const targetId = report?.responder || report?.assignedResponderId;
    if (!report?.id || !targetId) return;
    try {
      const session = await startIncidentCallSession({
        incidentId: report.id,
        callerUserId: userId,
        callerRole: "civilian",
        callerName: user?.name || user?.fullName || "Citizen",
        callerPhone: user?.phoneNumber || user?.phone || null,
        targetUserId: targetId,
        targetRole: "responder",
        targetName: report.responderName || report.responder || "Response Unit",
        assignedResponderId: targetId,
        incidentReferenceNumber: report.id ? `APP-${report.id.slice(-5).toUpperCase()}` : null,
        incidentType: report.incidentType,
        incidentLocationText: report.locationText,
      });
      setActiveCallSession(session);
      setIsIncomingCall(false);
      setIsCallModalVisible(true);
    } catch (err) {
      console.error("Failed to call responder:", err);
    }
  };

  const handleAnswerIncoming = async () => {
    if (activeCallSession?.id) {
      await acceptIncidentCallSession(activeCallSession.id, {
        uid: userId,
        name: user?.name || user?.fullName || "Citizen",
      }).catch(() => undefined);
    }
    setIsIncomingCall(false);
  };

  const handleDeclineIncoming = async () => {
    if (activeCallSession?.id) {
      await declineIncidentCallSession(activeCallSession.id, "Declined by citizen").catch(() => undefined);
    }
    setIsCallModalVisible(false);
    setActiveCallSession(null);
    setIsIncomingCall(false);
  };

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

          {report ? (
            <>
              <SectionDivider color={colors.border} />
              <IncidentDetailsCard report={report} colors={colors} />
            </>
          ) : null}

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
              
              {/* Emergency Voice & Message Action Grid */}
              <View style={styles.emergencyActionGrid}>
                <Pressable
                  onPress={handleCallDispatcher}
                  style={[styles.emergencyActionBtn, { backgroundColor: "#10B981" }]}
                >
                  <Phone size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emergencyActionText}>Call Dispatcher</Text>
                </Pressable>

                <Pressable
                  onPress={() => setIsChatVisible(true)}
                  style={[styles.emergencyActionBtn, { backgroundColor: "#0284C7" }]}
                >
                  <MessageSquare size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emergencyActionText}>Live Chat</Text>
                </Pressable>

                {(report?.responder || report?.assignedResponderId) && (
                  <Pressable
                    onPress={handleCallResponder}
                    style={[styles.emergencyActionBtn, { backgroundColor: "#D97706", width: "100%" }]}
                  >
                    <Radio size={15} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.emergencyActionText}>Call Response Unit</Text>
                  </Pressable>
                )}
              </View>

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

      {/* Voice Call Modal */}
      <CivilianCallModal
        visible={isCallModalVisible}
        onClose={() => {
          setIsCallModalVisible(false);
          setActiveCallSession(null);
          setIsIncomingCall(false);
        }}
        onCallEnded={() => router.replace("/dashboard")}
        callSession={activeCallSession}
        isIncoming={isIncomingCall}
        onAnswer={handleAnswerIncoming}
        onDecline={handleDeclineIncoming}
      />

      {/* Live Incident Chat Modal */}
      <CivilianIncidentChatModal
        visible={isChatVisible}
        onClose={() => setIsChatVisible(false)}
        onCallEnded={() => router.replace("/dashboard")}
        incident={report}
        user={user}
      />
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
  emergencyActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 4,
  },
  emergencyActionBtn: {
    flexGrow: 1,
    flexBasis: "47%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyActionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
});
