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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  AlertCircle,
} from "lucide-react-native";
import { endIncidentCallSession } from "@packages/firebase";
import { useLiveKitCall } from "../hooks/useLiveKitCall";

export default function CivilianCallModalContent({
  visible,
  onClose,
  callSession,
  isIncoming = false,
  onAnswer,
  onDecline,
}) {
  const insets = useSafeAreaInsets();
  const [isAnswered, setIsAnswered] = useState(!isIncoming);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  const shouldConnectLiveKit = visible && (!isIncoming || isAnswered);

  const {
    isConnecting,
    isConnected,
    isMuted,
    isSpeakerOn,
    connectionError,
    roomState,
    toggleMute,
    toggleSpeaker,
    disconnect,
  } = useLiveKitCall({
    session: callSession,
    isActive: shouldConnectLiveKit,
  });

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
    await disconnect();
    if (callSession?.id) {
      await endIncidentCallSession(callSession.id).catch(() => undefined);
    }
    onClose?.();
  };

  const handleAnswerCall = () => {
    setIsAnswered(true);
    onAnswer?.();
  };

  const handleDeclineCall = async () => {
    await disconnect();
    onDecline?.();
  };

  const handleCallHotline = () => {
    Linking.openURL("tel:911").catch(() => undefined);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  const targetName =
    callSession?.targetName ||
    (callSession?.targetRole === "responder"
      ? "Assigned Response Unit"
      : "Command Center Dispatch");

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleEndCall}
      statusBarTranslucent
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 44 : 24) + 24,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}
      >
        <View style={styles.topCallerRow}>
          <View style={[styles.avatarCircle, isConnected && styles.avatarCircleConnected]}>
            <User size={34} color="#FFFFFF" />
          </View>
          <View style={styles.callerDetails}>
            <Text style={styles.callerName} numberOfLines={1}>
              {targetName}
            </Text>
            <Text style={[styles.timerText, isConnected && styles.timerTextConnected]}>
              {isIncoming && !isAnswered
                ? "Incoming Call..."
                : isConnecting
                  ? "Connecting audio..."
                  : roomState === "reconnecting"
                    ? "Reconnecting voice link..."
                    : isConnected
                      ? formatTime(duration)
                      : "Call Ended"}
            </Text>
          </View>
        </View>

        {connectionError ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#F87171" />
            <Text style={styles.errorText} numberOfLines={2}>
              {connectionError}
            </Text>
          </View>
        ) : null}

        <View style={styles.bottomSection}>
          {isIncoming && !isAnswered ? (
            <View style={styles.incomingActions}>
              <View style={styles.actionItem}>
                <Pressable
                  onPress={handleDeclineCall}
                  style={({ pressed }) => [
                    styles.endCallButton,
                    styles.declineButton,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Decline call"
                >
                  <PhoneOff size={32} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.actionLabel}>Decline</Text>
              </View>

              <View style={styles.actionItem}>
                <Pressable
                  onPress={handleAnswerCall}
                  style={({ pressed }) => [
                    styles.endCallButton,
                    styles.answerButton,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Answer call"
                >
                  <Phone size={32} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.actionLabel}>Answer</Text>
              </View>
            </View>
          ) : (
            <View style={styles.activeActionsRow}>
              <View style={styles.controlItem}>
                <Pressable
                  onPress={toggleMute}
                  disabled={!isConnected}
                  style={({ pressed }) => [
                    styles.controlButton,
                    isMuted && styles.controlButtonActive,
                    pressed && styles.controlButtonPressed,
                    !isConnected && { opacity: 0.5 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMuted ? (
                    <MicOff size={28} color="#EF4444" />
                  ) : (
                    <Mic size={28} color="#FFFFFF" />
                  )}
                </Pressable>
                <Text style={styles.controlLabel}>mute</Text>
              </View>

              <View style={styles.controlItem}>
                <Pressable
                  onPress={handleEndCall}
                  style={({ pressed }) => [
                    styles.endCallButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="End call"
                >
                  <PhoneOff size={32} color="#FFFFFF" />
                </Pressable>
                <Text style={[styles.controlLabel, { opacity: 0 }]}>end</Text>
              </View>

              <View style={styles.controlItem}>
                <Pressable
                  onPress={toggleSpeaker}
                  style={({ pressed }) => [
                    styles.controlButton,
                    isSpeakerOn && styles.controlButtonActive,
                    pressed && styles.controlButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={isSpeakerOn ? "Speaker on" : "Speaker off"}
                >
                  {isSpeakerOn ? (
                    <Volume2 size={28} color="#34D399" />
                  ) : (
                    <VolumeX size={28} color="#FFFFFF" />
                  )}
                </Pressable>
                <Text style={styles.controlLabel}>speaker</Text>
              </View>
            </View>
          )}

          <Pressable onPress={handleCallHotline} style={styles.hotlineFallback}>
            <AlertCircle size={13} color="#6B7280" />
            <Text style={styles.hotlineText}>Tap to dial 911 hotline directly</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#22252A",
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  topCallerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#363A43",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarCircleConnected: {
    borderWidth: 2,
    borderColor: "#10B981",
    backgroundColor: "#064E3B",
  },
  callerDetails: {
    flex: 1,
    justifyContent: "center",
  },
  callerName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 14,
    color: "#9EA3AE",
    fontWeight: "500",
  },
  timerTextConnected: {
    color: "#34D399",
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#F87171",
  },
  bottomSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  activeActionsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  controlItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
  },
  controlButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#363A43",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonActive: {
    backgroundColor: "#424854",
  },
  controlButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  controlLabel: {
    fontSize: 13,
    color: "#9EA3AE",
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
    textTransform: "lowercase",
  },
  incomingActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  actionItem: {
    alignItems: "center",
  },
  actionLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  answerButton: {
    backgroundColor: "#10B981",
  },
  declineButton: {
    backgroundColor: "#EF4444",
  },
  endCallButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  hotlineFallback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  hotlineText: {
    fontSize: 12,
    color: "#6B7280",
  },
});
