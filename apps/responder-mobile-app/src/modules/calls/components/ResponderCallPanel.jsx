import React, { useEffect, useMemo, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Mic, MicOff, Phone, PhoneOff, Volume2, X } from "lucide-react-native";
import {
  acceptIncidentCallSession,
  declineIncidentCallSession,
  endIncidentCallSession,
  failIncidentCallSession,
  markIncidentCallConnected,
  subscribeToResponderIncomingCallSessions,
} from "@packages/firebase";
import { useAgoraVoiceCall } from "@/hooks/useAgoraVoiceCall";
import { spacing, useResqTheme } from "@/theme";

export default function ResponderCallPanel({ responderId }) {
  const { colors } = useResqTheme();
  const voiceCall = useAgoraVoiceCall();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!responderId) {
      setSessions([]);
      return;
    }

    return subscribeToResponderIncomingCallSessions(responderId, setSessions);
  }, [responderId]);

  const activeSession = useMemo(
    () =>
      sessions.find((session) => ["connected", "accepted"].includes(session.status)) ||
      sessions.find((session) => session.status === "ringing") ||
      null,
    [sessions]
  );

  const handleAccept = async () => {
    if (!activeSession?.id) return;
    setError("");
    try {
      await acceptIncidentCallSession(activeSession.id);
      await voiceCall.join({
        incidentId: activeSession.incidentId,
        channelName: activeSession.channelName,
        onJoined: () => markIncidentCallConnected(activeSession.id).catch(console.error),
        onRemoteJoined: () => markIncidentCallConnected(activeSession.id).catch(console.error),
        onError: (joinError) => {
          failIncidentCallSession(activeSession.id, joinError?.message).catch(console.error);
        },
      });
    } catch (joinError) {
      setError(joinError?.message || "Unable to join the incident call.");
      await failIncidentCallSession(activeSession.id, joinError?.message).catch(console.error);
    }
  };

  const handleDecline = async () => {
    if (!activeSession?.id) return;
    setError("");
    await voiceCall.leave();
    await declineIncidentCallSession(activeSession.id).catch((declineError) => {
      setError(declineError?.message || "Unable to decline the call.");
    });
  };

  const handleEnd = async () => {
    if (!activeSession?.id) return;
    setError("");
    await voiceCall.leave();
    await endIncidentCallSession(activeSession.id).catch((endError) => {
      setError(endError?.message || "Unable to end the call.");
    });
  };

  if (!activeSession) {
    return null;
  }

  const connected = activeSession.status === "connected" || voiceCall.phase === "connected";
  const joining = voiceCall.phase === "joining";
  const title = connected ? "Incident call connected" : "Incoming incident call";
  const subtitle = connected
    ? `Channel ${activeSession.channelName}`
    : `Incident ${activeSession.incidentId}`;

  return (
    <Modal visible transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.58)",
          justifyContent: "flex-end",
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: connected ? "#9AFF5524" : "#FF950024",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Phone size={22} color={connected ? "#9AFF55" : "#FFB020"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  color: colors.text,
                }}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginTop: 3,
                }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          </View>

          {error || voiceCall.error ? (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: "#FF8A8A",
                marginBottom: 12,
              }}
            >
              {error || voiceCall.error}
            </Text>
          ) : null}

          {connected ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={voiceCall.toggleMute}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                {voiceCall.muted ? <MicOff size={20} color={colors.text} /> : <Mic size={20} color={colors.text} />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={voiceCall.toggleSpeaker}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Volume2 size={20} color={voiceCall.speakerEnabled ? "#9AFF55" : colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEnd}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  backgroundColor: "#FF3B30",
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <PhoneOff size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={handleDecline}
                disabled={joining}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: joining ? 0.65 : 1,
                }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAccept}
                disabled={joining}
                style={{
                  flex: 2,
                  borderRadius: 12,
                  backgroundColor: "#9AFF55",
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: joining ? 0.65 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 15,
                    color: "#000000",
                  }}
                >
                  {joining ? "Joining..." : "Accept"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
