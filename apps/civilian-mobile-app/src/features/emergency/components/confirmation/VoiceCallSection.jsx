import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react-native";

const ACCENT = "#9AFF55";

function VoiceCallSection({
  colors,
  isLight,
  canStartVoiceCall,
  activeCallStatus,
  callSession,
  callIsLinkedToIncident,
  callError,
  voiceCall,
  onStartCall,
  onEndCall,
}) {
  const primary = isLight ? "#34C759" : "#7CFF4D";
  const primarySoft = isLight
    ? "rgba(52, 199, 89, 0.12)"
    : "rgba(124, 255, 77, 0.14)";

  const hint = canStartVoiceCall
    ? activeCallStatus === "connected"
      ? "Connected to voice channel"
      : callSession
        ? "Calling command center…"
        : callIsLinkedToIncident
          ? "Call assigned responder"
          : "Notify command center"
    : "Available after submit";

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: colors.textSecondary }]}>
        VOICE CALL
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: primarySoft }]}>
            <Phone size={16} color={primary} strokeWidth={2.4} />
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: colors.text }]}>Dispatcher</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={1}>
              {hint}
            </Text>
          </View>
        </View>

        {callError || voiceCall.error ? (
          <Text style={styles.error}>
            {callError || voiceCall.error}
          </Text>
        ) : null}

        {callSession ? (
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={voiceCall.toggleMute}
              style={[styles.controlBtn, { borderColor: colors.border }]}
              accessibilityLabel={voiceCall.muted ? "Unmute" : "Mute"}
            >
              {voiceCall.muted ? (
                <MicOff size={17} color={colors.text} />
              ) : (
                <Mic size={17} color={colors.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={voiceCall.toggleSpeaker}
              style={[styles.controlBtn, { borderColor: colors.border }]}
              accessibilityLabel="Toggle speaker"
            >
              <Volume2
                size={17}
                color={voiceCall.speakerEnabled ? ACCENT : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onEndCall}
              style={[styles.controlBtn, styles.endCallBtn]}
              accessibilityLabel="End call"
            >
              <PhoneOff size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <Pressable
            onPress={onStartCall}
            disabled={!canStartVoiceCall || voiceCall.phase === "joining"}
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: primarySoft, opacity: pressed ? 0.85 : 1 },
              (!canStartVoiceCall || voiceCall.phase === "joining") && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Start voice call"
          >
            <Text style={[styles.startBtnText, { color: primary }]}>
              {voiceCall.phase === "joining" ? "Joining…" : "Start Voice Call"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default memo(VoiceCallSection);

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  heading: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  error: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#FF8A8A",
  },
  controls: {
    flexDirection: "row",
    gap: 8,
  },
  controlBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  endCallBtn: {
    backgroundColor: "#FF3B30",
    borderColor: "#FF3B30",
  },
  startBtn: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  startBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  disabled: {
    opacity: 0.45,
  },
});
