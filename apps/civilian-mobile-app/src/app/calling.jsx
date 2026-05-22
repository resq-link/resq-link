import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  endIncidentCallSession,
  subscribeToIncidentCallSession,
} from "@packages/firebase";
import { Mic, PhoneCall, PhoneOff, Volume2 } from "lucide-react-native";
import { useAppTheme } from "@/utils/useAppTheme";

export default function CallingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const [session, setSession] = useState(null);
  const [isEnding, setIsEnding] = useState(false);

  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const incidentId = Array.isArray(params.incidentId) ? params.incidentId[0] : params.incidentId;
  const channelName = Array.isArray(params.channelName) ? params.channelName[0] : params.channelName;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (!sessionId) return;
    return subscribeToIncidentCallSession(sessionId, setSession);
  }, [sessionId]);

  const status = session?.status || "ringing";
  const statusLabel = useMemo(() => {
    switch (status) {
      case "accepted":
        return "Dispatcher answered";
      case "connected":
        return "Connected";
      case "ended":
        return "Call ended";
      case "missed":
        return "No answer";
      case "failed":
        return "Call failed";
      default:
        return "Calling command center...";
    }
  }, [status]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1.8],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.48, 0.3, 0],
  });

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      if (sessionId && !["ended", "missed", "failed"].includes(status)) {
        await endIncidentCallSession(sessionId);
      }
    } catch (error) {
      console.error("Error ending dispatcher call:", error);
    } finally {
      setIsEnding(false);
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#050505" }}>
      <StatusBar style="light" backgroundColor="#050505" />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 34,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ alignItems: "center", width: "100%" }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 15,
              color: "#9AFF55",
              letterSpacing: 0.2,
              marginBottom: 18,
            }}
          >
            RESQ-Link Command Center
          </Text>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 30,
              color: "#FFFFFF",
              textAlign: "center",
            }}
          >
            {statusLabel}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "#A3A3A3",
              marginTop: 10,
              textAlign: "center",
            }}
            numberOfLines={2}
          >
            {incidentId || channelName || "Emergency call request"}
          </Text>
        </View>

        <View
          style={{
            width: 240,
            height: 240,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: 154,
              height: 154,
              borderRadius: 77,
              borderWidth: 2,
              borderColor: "#9AFF55",
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            }}
          />
          <View
            style={{
              width: 154,
              height: 154,
              borderRadius: 77,
              backgroundColor: "#9AFF55",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#9AFF55",
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.32,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            <PhoneCall size={64} color="#06140B" strokeWidth={2.2} />
          </View>
        </View>

        <View style={{ width: "100%", alignItems: "center" }}>
          <View
            style={{
              flexDirection: "row",
              gap: 18,
              marginBottom: 34,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#1D1D1D",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#333333",
              }}
            >
              <Mic size={24} color="#F5F5F5" />
            </View>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#1D1D1D",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#333333",
              }}
            >
              <Volume2 size={24} color="#F5F5F5" />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleEnd}
            disabled={isEnding}
            activeOpacity={0.84}
            style={{
              width: 78,
              height: 78,
              borderRadius: 39,
              backgroundColor: "#FF3B30",
              alignItems: "center",
              justifyContent: "center",
              opacity: isEnding ? 0.65 : 1,
            }}
            accessibilityLabel="End call"
          >
            <PhoneOff size={34} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: "#8A8A8A",
              marginTop: 18,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            This test call notifies the dispatcher web console. Mobile audio still requires a development build.
          </Text>
        </View>
      </View>
    </View>
  );
}
