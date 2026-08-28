import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  Radio,
} from "lucide-react-native";
import { useActiveIncident } from "@/hooks/useActiveIncident";
import useUserStore from "@/stores/userStore";
import { getIncidentMeta } from "@/features/history/constants";
import {
  startIncidentCallSession,
  acceptIncidentCallSession,
  declineIncidentCallSession,
} from "@packages/firebase";
import CivilianCallModal from "@/features/emergency/components/CivilianCallModal";
import CivilianIncidentChatModal from "@/features/emergency/components/CivilianIncidentChatModal";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ActiveIncidentBottomBar() {
  const router = useRouter();
  const { user } = useUserStore();
  const { activeIncident } = useActiveIncident();

  const [activeCallSession, setActiveCallSession] = useState(null);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [chatIncident, setChatIncident] = useState(null);

  // Animation values
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.75);
  const barTranslateY = useSharedValue(40);
  const barOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1);

  // Pulse animation for live beacon
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(0.8, { duration: 900, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulseScale, pulseOpacity]);

  // Enter / exit animation
  useEffect(() => {
    if (activeIncident) {
      barTranslateY.value = withSpring(0, { damping: 16, stiffness: 220 });
      barOpacity.value = withTiming(1, { duration: 250 });
    } else {
      barTranslateY.value = withTiming(40, { duration: 200 });
      barOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [activeIncident, barTranslateY, barOpacity]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barTranslateY.value }],
    opacity: barOpacity.value,
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const animatedCardPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  if (!activeIncident) {
    return null;
  }

  const userId = user?.uid || user?.id;
  const meta = getIncidentMeta(activeIncident.incidentType, activeIncident.typeProfile) || {};
  const Icon = meta.Icon || meta.icon || AlertTriangle;

  const rawStatus = (activeIncident.status || "pending").toLowerCase();
  const statusLabel =
    rawStatus === "pending"
      ? "Awaiting Dispatch"
      : rawStatus === "enroute"
      ? "Responder En Route"
      : rawStatus === "on_scene"
      ? "Responders On Scene"
      : "Active Response";

  const statusColor =
    rawStatus === "on_scene"
      ? "#059669"
      : rawStatus === "enroute"
      ? "#0284C7"
      : "#D97706";

  const isResponderAssigned = Boolean(
    activeIncident.responder || activeIncident.assignedResponderId
  );
  const responderName =
    activeIncident.responderName || activeIncident.responder || "Response Unit";

  const refNumber = activeIncident.id
    ? `APP-${activeIncident.id.slice(-5).toUpperCase()}`
    : "APP-INCIDENT";

  const handleOpenDetails = () => {
    if (!activeIncident?.id) return;
    router.push({
      pathname: "/emergency-confirmation",
      params: { reportId: activeIncident.id },
    });
  };

  const handleCallDispatcher = async () => {
    if (!activeIncident?.id || !userId) return;
    try {
      const session = await startIncidentCallSession({
        incidentId: activeIncident.id,
        callerUserId: userId,
        callerRole: "civilian",
        callerName: user?.name || user?.fullName || "Citizen",
        callerPhone: user?.phoneNumber || user?.phone || null,
        targetRole: "dispatcher",
        targetName: "Command Center Dispatch",
        incidentReferenceNumber: refNumber,
        incidentType: activeIncident.incidentType,
        incidentLocationText: activeIncident.locationText,
      });
      setActiveCallSession(session);
      setIsIncomingCall(false);
      setIsCallModalVisible(true);
    } catch (err) {
      console.error("[ActiveIncidentBottomBar] Call Dispatcher error:", err);
    }
  };

  const handleCallResponder = async () => {
    if (!activeIncident?.id || !userId) return;
    try {
      const targetId = activeIncident.responder || activeIncident.assignedResponderId;
      const session = await startIncidentCallSession({
        incidentId: activeIncident.id,
        callerUserId: userId,
        callerRole: "civilian",
        callerName: user?.name || user?.fullName || "Citizen",
        callerPhone: user?.phoneNumber || user?.phone || null,
        targetUserId: targetId,
        targetRole: "responder",
        targetName: responderName,
        assignedResponderId: targetId,
        incidentReferenceNumber: refNumber,
        incidentType: activeIncident.incidentType,
        incidentLocationText: activeIncident.locationText,
      });
      setActiveCallSession(session);
      setIsIncomingCall(false);
      setIsCallModalVisible(true);
    } catch (err) {
      console.error("[ActiveIncidentBottomBar] Call Responder error:", err);
    }
  };

  const handleAnswerIncomingCall = async () => {
    if (activeCallSession?.id) {
      await acceptIncidentCallSession(activeCallSession.id, {
        uid: userId,
        name: user?.name || user?.fullName || "Citizen",
      }).catch(() => undefined);
    }
    setIsIncomingCall(false);
  };

  const handleDeclineIncomingCall = async () => {
    if (activeCallSession?.id) {
      await declineIncidentCallSession(activeCallSession.id, "Declined by citizen").catch(() => undefined);
    }
    setIsCallModalVisible(false);
    setActiveCallSession(null);
    setIsIncomingCall(false);
  };

  return (
    <>
      <Animated.View
        style={[styles.wrapper, animatedContainerStyle]}
        pointerEvents="box-none"
      >
        <AnimatedPressable
          onPress={handleOpenDetails}
          onPressIn={() => {
            cardScale.value = withSpring(0.985, { damping: 15, stiffness: 350 });
          }}
          onPressOut={() => {
            cardScale.value = withSpring(1, { damping: 15, stiffness: 350 });
          }}
          style={[styles.cardTouchable, animatedCardPressStyle]}
          accessibilityRole="button"
          accessibilityLabel={`Active emergency: ${meta.label}, status ${statusLabel}. Tap to open live tracking.`}
        >
          <View style={styles.cardContainer}>
            {/* Top Live Status & Reference Bar */}
            <View style={styles.topAccentRow}>
              <View style={styles.liveTagRow}>
                <View style={styles.beaconWrap}>
                  <Animated.View
                    style={[
                      styles.beaconRing,
                      { backgroundColor: statusColor },
                      animatedPulseStyle,
                    ]}
                  />
                  <View style={[styles.beaconDot, { backgroundColor: statusColor }]} />
                </View>
                <Text style={[styles.liveTagText, { color: statusColor }]}>
                  LIVE EMERGENCY IN PROGRESS
                </Text>
              </View>

              <View style={styles.refPill}>
                <Text style={styles.refPillText}>{refNumber}</Text>
              </View>
            </View>

            {/* Main Content Row */}
            <View style={styles.mainRow}>
              {/* Incident Icon */}
              <View style={styles.iconWrap}>
                {Icon && (
                  <Icon
                    size={24}
                    color={meta.iconColor || "#DC2626"}
                    strokeWidth={2.2}
                  />
                )}
              </View>

              {/* Title & Status Summary */}
              <View style={styles.infoCol}>
                <Text style={styles.incidentTitle} numberOfLines={1}>
                  {meta.label || "Emergency Alert"}
                </Text>
                <View style={styles.statusSubRow}>
                  <View style={[styles.statusMiniDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusDescText, { color: statusColor }]} numberOfLines={1}>
                    {statusLabel}
                    {isResponderAssigned && rawStatus === "enroute" ? ` (${responderName})` : ""}
                  </Text>
                </View>
              </View>

              {/* Right Action Icons: Call Dispatch & Live Chat */}
              <View style={styles.actionIconsRow}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCallDispatcher();
                  }}
                  hitSlop={6}
                  style={[styles.iconActionBtn, styles.callActionBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Call dispatcher"
                >
                  <Phone size={17} color="#FFFFFF" strokeWidth={2.4} />
                </Pressable>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setChatIncident(activeIncident);
                  }}
                  hitSlop={6}
                  style={[styles.iconActionBtn, styles.chatActionBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Live chat with dispatcher"
                >
                  <MessageSquare size={17} color="#0284C7" strokeWidth={2.3} />
                </Pressable>

                {isResponderAssigned && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCallResponder();
                    }}
                    hitSlop={6}
                    style={[styles.iconActionBtn, styles.unitActionBtn]}
                    accessibilityRole="button"
                    accessibilityLabel="Call assigned responder unit"
                  >
                    <Radio size={17} color="#D97706" strokeWidth={2.3} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </AnimatedPressable>
      </Animated.View>

      {/* Voice Call Modal */}
      <CivilianCallModal
        visible={isCallModalVisible}
        onClose={() => {
          setIsCallModalVisible(false);
          setActiveCallSession(null);
          setIsIncomingCall(false);
        }}
        callSession={activeCallSession}
        isIncoming={isIncomingCall}
        onAnswer={handleAnswerIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      {/* Live Incident Chat Modal */}
      <CivilianIncidentChatModal
        visible={Boolean(chatIncident)}
        onClose={() => setChatIncident(null)}
        incident={chatIncident}
        user={user}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    marginBottom: 8,
    zIndex: 1000,
  },
  cardTouchable: {
    borderRadius: 18,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.1 : 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  topAccentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  liveTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  beaconWrap: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  beaconRing: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  beaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  refPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  refPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284C7",
    letterSpacing: 0.3,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    paddingLeft: 2,
  },
  infoCol: {
    flex: 1,
    paddingRight: 8,
  },
  incidentTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  statusSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2.5,
  },
  statusMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDescText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  actionIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  callActionBtn: {
    backgroundColor: "#10B981",
  },
  chatActionBtn: {
    backgroundColor: "rgba(2, 132, 199, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(2, 132, 199, 0.28)",
  },
  unitActionBtn: {
    backgroundColor: "rgba(217, 119, 6, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.28)",
  },
});
