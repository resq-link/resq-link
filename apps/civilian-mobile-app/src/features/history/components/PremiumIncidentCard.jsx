import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MapPin } from "lucide-react-native";
import { getStatusPresentation } from "@/features/history/constants";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PremiumIncidentCard({ report, onPress }) {
  const { historyTheme, isLight } = useAppTheme();
  const scale = useSharedValue(1);

  const statusPresentation = getStatusPresentation(
    report?.status,
    historyTheme,
    isLight
  );

  const incidentAddress =
    report?.locationText ||
    report?.location_text ||
    "456 Elm Street, Springfield";

  const styles = useThemedStyles(
    (t) => ({
      cardContainer: {
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: t.card || "#FFFFFF",
        borderWidth: 1,
        borderColor: isLight ? "#EEF2F6" : "rgba(255,255,255,0.08)",
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isLight ? 0.04 : 0.2,
        shadowRadius: 8,
        elevation: 1.5,
      },
      contentRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      leftSection: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        marginRight: 12,
      },
      iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isLight ? "#E0F2FE" : "rgba(14, 165, 233, 0.18)",
        alignItems: "center",
        justifyContent: "center",
      },
      textGroup: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
      },
      primaryAddress: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 14.5,
        color: t.text,
        letterSpacing: -0.2,
      },
      subLabel: {
        fontFamily: "Inter_400Regular",
        fontSize: 12,
        color: t.textSecondary || "#94A3B8",
        marginTop: 2,
      },
      statusPill: {
        backgroundColor:
          statusPresentation.bg ||
          (isLight ? "#E8F8EE" : "rgba(34, 197, 94, 0.16)"),
        borderWidth: statusPresentation.border ? 1 : 0,
        borderColor: statusPresentation.border || "transparent",
        paddingHorizontal: 12,
        paddingVertical: 4.5,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
      },
      statusPillText: {
        fontFamily: "Inter_700Bold",
        fontSize: 12.5,
        color: statusPresentation.color || (isLight ? "#16A34A" : "#4ADE80"),
      },
    }),
    historyTheme
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      style={[styles.cardContainer, animatedStyle]}
      android_ripple={{
        color: isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.08)",
        borderless: false,
      }}
      accessibilityRole="button"
      accessibilityLabel={`Incident at ${incidentAddress}, status ${statusPresentation.label}`}
      accessibilityHint="Opens incident details"
    >
      <View style={styles.contentRow}>
        {/* Left Section: Icon and Incident Location */}
        <View style={styles.leftSection}>
          <View style={styles.iconCircle}>
            <MapPin
              size={17}
              color={isLight ? "#0284C7" : "#38BDF8"}
              strokeWidth={2.4}
            />
          </View>
          <View style={styles.textGroup}>
            <Text style={styles.primaryAddress} numberOfLines={1}>
              {incidentAddress}
            </Text>
            <Text style={styles.subLabel}>Incident location</Text>
          </View>
        </View>

        {/* Right Section: Status Badge */}
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>
            {statusPresentation.label || "Active"}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default memo(PremiumIncidentCard);
