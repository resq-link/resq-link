import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Clock,
  ShieldAlert,
  AlertCircle,
} from "lucide-react-native";
import {
  endIncidentCallSession,
  markIncidentCallConnected,
} from "@packages/firebase";

export default function CivilianCallModal({
  visible,
  onClose,
  callSession,
  isIncoming = false,
  onAnswer,
  onDecline,
}) {
  const [isConnected, setIsConnected] = useState(!isIncoming);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible && isConnected) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setDuration(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, isConnected]);

  const handleEndCall = async () => {
    if (callSession?.id) {
      await endIncidentCallSession(callSession.id).catch(() => undefined);
    }
    onClose?.();
  };

  const handleCallHotline = () => {
    Linking.openURL("tel:911").catch(() => undefined);
  };

  if (!visible) return null;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  const targetName =
    callSession?.targetName ||
    (callSession?.targetRole === "responder" ? "Assigned Response Unit" : "Command Center Dispatch");

  const title = isIncoming
    ? "Incoming Emergency Call"
    : callSession?.callType === "direct_emergency"
    ? "Direct SOS Emergency Call"
    : `Emergency Call • ${callSession?.incidentReferenceNumber || "Active Incident"}`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleEndCall}>
      <LinearGradient colors={["#0F172A", "#020617"]} style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBadgeRow}>
          <View style={styles.badge}>
            <Radio size={14} color="#34D399" />
            <Text style={styles.badgeText}>{title}</Text>
          </View>
        </View>

        {/* Center Avatar & Status */}
        <View style={styles.centerSection}>
          <View style={[styles.avatarCircle, isConnected && styles.avatarConnected]}>
            <ShieldAlert size={48} color={isConnected ? "#34D399" : "#38BDF8"} />
          </View>

          <Text style={styles.calleeName}>{targetName}</Text>
          <Text style={styles.calleeSub}>
            {isIncoming ? "Emergency Response Team is calling you" : "High-Priority Emergency Voice Link"}
          </Text>

          <View style={styles.timerRow}>
            {isIncoming && !isConnected ? (
              <Text style={styles.ringingText}>Incoming Call...</Text>
            ) : isConnected ? (
              <View style={styles.connectedTimer}>
                <Clock size={16} color="#34D399" />
                <Text style={styles.timerText}>{formatTime(duration)}</Text>
              </View>
            ) : (
              <Text style={styles.connectingText}>Connecting to emergency dispatch...</Text>
            )}
          </View>
        </View>

        {/* Bottom Control Bar */}
        <View style={styles.bottomSection}>
          {isIncoming && !isConnected ? (
            /* Incoming Call Actions */
            <View style={styles.incomingActions}>
              <Pressable
                onPress={onDecline}
                style={[styles.callBtn, styles.declineBtn]}
                accessibilityRole="button"
                accessibilityLabel="Decline incoming call"
              >
                <PhoneOff size={28} color="#FFFFFF" />
                <Text style={styles.btnLabel}>Decline</Text>
              </Pressable>

              <Pressable
                onPress={onAnswer}
                style={[styles.callBtn, styles.answerBtn]}
                accessibilityRole="button"
                accessibilityLabel="Answer incoming call"
              >
                <Phone size={28} color="#FFFFFF" />
                <Text style={styles.btnLabel}>Answer</Text>
              </Pressable>
            </View>
          ) : (
            /* Active Call Controls */
            <View style={styles.activeActions}>
              {/* Mute Button */}
              <Pressable
                onPress={() => setIsMuted((p) => !p)}
                style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? <MicOff size={24} color="#EF4444" /> : <Mic size={24} color="#F8FAFC" />}
                <Text style={styles.controlBtnText}>{isMuted ? "Muted" : "Mute"}</Text>
              </Pressable>

              {/* End Call Button */}
              <Pressable
                onPress={handleEndCall}
                style={[styles.callBtn, styles.hangUpBtn]}
                accessibilityRole="button"
                accessibilityLabel="End emergency call"
              >
                <PhoneOff size={28} color="#FFFFFF" />
              </Pressable>

              {/* Speakerphone Toggle */}
              <Pressable
                onPress={() => setIsSpeakerOn((p) => !p)}
                style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
                accessibilityRole="button"
                accessibilityLabel={isSpeakerOn ? "Speaker on" : "Speaker off"}
              >
                {isSpeakerOn ? <Volume2 size={24} color="#34D399" /> : <VolumeX size={24} color="#F8FAFC" />}
                <Text style={styles.controlBtnText}>{isSpeakerOn ? "Speaker" : "Ear"}</Text>
              </Pressable>
            </View>
          )}

          {/* Cellular Fallback Link */}
          <Pressable onPress={handleCallHotline} style={styles.hotlineFallback}>
            <AlertCircle size={13} color="#94A3B8" />
            <Text style={styles.hotlineText}>Having connection issues? Tap to dial 911 directly</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  topBadgeRow: {
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E2E8F0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  centerSection: {
    alignItems: "center",
    marginVertical: 40,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  avatarConnected: {
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    borderColor: "rgba(52, 211, 153, 0.5)",
  },
  calleeName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F8FAFC",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  calleeSub: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
  },
  timerRow: {
    marginTop: 20,
  },
  connectedTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  timerText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#34D399",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  ringingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#38BDF8",
  },
  connectingText: {
    fontSize: 13,
    color: "#FBBF24",
    fontStyle: "italic",
  },
  bottomSection: {
    alignItems: "center",
  },
  incomingActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 24,
  },
  activeActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  controlBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  controlBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#CBD5E1",
    marginTop: 4,
  },
  callBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  hangUpBtn: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  answerBtn: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  declineBtn: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  btnLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  hotlineFallback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  hotlineText: {
    fontSize: 11,
    color: "#94A3B8",
    textDecorationLine: "underline",
  },
});
