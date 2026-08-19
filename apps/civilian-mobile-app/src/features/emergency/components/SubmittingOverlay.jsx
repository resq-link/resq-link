import React, { useEffect } from "react";
import { View, Text, StyleSheet, Modal } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Radio } from "lucide-react-native";
import { reportTypography } from "@/features/emergency/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function SubmittingOverlay({ visible, progress = 0 }) {
  const { reportTheme, isLight } = useAppTheme();
  const spin = useSharedValue(0);
  const pulse = useSharedValue(1);

  const styles = useThemedStyles(
    (t) => ({
      backdrop: {
        flex: 1,
        backgroundColor: isLight ? "rgba(245, 245, 247, 0.92)" : "rgba(13, 15, 18, 0.92)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      },
      card: {
        width: "100%",
        maxWidth: 320,
        backgroundColor: t.card,
        borderRadius: 24,
        padding: 28,
        alignItems: "center",
        borderWidth: 1,
        borderColor: t.border,
      },
      iconShell: {
        width: 88,
        height: 88,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
      },
      ring: {
        position: "absolute",
        width: 84,
        height: 84,
        borderRadius: 42,
        borderWidth: 2,
        borderColor: t.primary,
        borderTopColor: "transparent",
      },
      hub: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: t.primaryMuted,
        alignItems: "center",
        justifyContent: "center",
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: reportTypography.title,
        color: t.text,
        marginBottom: 8,
        textAlign: "center",
      },
      subtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.body,
        color: t.textSecondary,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 20,
      },
      track: {
        width: "100%",
        height: 6,
        borderRadius: 999,
        backgroundColor: t.surface,
        overflow: "hidden",
        marginBottom: 8,
      },
      fill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: t.primary,
      },
      pct: {
        fontFamily: "Inter_600SemiBold",
        fontSize: reportTypography.caption,
        color: t.textSecondary,
      },
    }),
    reportTheme
  );

  useEffect(() => {
    if (!visible) return;
    spin.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [visible, spin, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const hubStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconShell}>
            <Animated.View style={[styles.ring, ringStyle]} />
            <Animated.View style={[styles.hub, hubStyle]}>
              <Radio size={32} color={reportTheme.primary} strokeWidth={2.2} />
            </Animated.View>
          </View>
          <Text style={styles.title}>Sending your report</Text>
          <Text style={styles.subtitle}>
            Connecting you with the command center…
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.pct}>{pct}%</Text>
        </View>
      </View>
    </Modal>
  );
}
