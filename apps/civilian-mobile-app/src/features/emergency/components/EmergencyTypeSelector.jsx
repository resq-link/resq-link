import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Check } from "lucide-react-native";
import { EMERGENCY_TYPE_OPTIONS } from "@/features/emergency/constants";
import { reportTypography } from "@/features/emergency/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TypeCard({ option, selected, onPress, styles, reportTheme }) {
  const scale = useSharedValue(1);
  const { Icon, label, subtitle } = option;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 14, stiffness: 360 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[
        styles.card,
        animatedStyle,
        selected && styles.cardSelected,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${subtitle}`}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <Icon
          size={28}
          color={selected ? reportTheme.background : reportTheme.primary}
          strokeWidth={2.2}
        />
      </View>
      <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
        {label}
      </Text>
      <Text
        style={[styles.cardSubtitle, selected && styles.cardSubtitleSelected]}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
      {selected ? (
        <View style={styles.check}>
          <Check size={14} color={reportTheme.background} strokeWidth={3} />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

export default function EmergencyTypeSelector({
  incidentType,
  typeProfile,
  onSelect,
}) {
  const { reportTheme, isLight } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      heading: {
        fontFamily: "Inter_700Bold",
        fontSize: reportTypography.title,
        color: t.text,
        marginBottom: 8,
      },
      subheading: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.body,
        color: t.textSecondary,
        lineHeight: 22,
        marginBottom: 20,
      },
      grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
      },
      card: {
        width: "47%",
        flexGrow: 1,
        minHeight: 148,
        backgroundColor: t.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: t.border,
        shadowColor: t.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 4,
      },
      cardSelected: {
        backgroundColor: t.primary,
        borderColor: t.primary,
      },
      iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: t.primaryMuted,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
      },
      iconWrapSelected: {
        backgroundColor: isLight ? "rgba(255, 255, 255, 0.35)" : "rgba(13, 15, 18, 0.12)",
      },
      cardTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: reportTypography.body,
        color: t.text,
        marginBottom: 4,
      },
      cardTitleSelected: {
        color: t.background,
      },
      cardSubtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.caption,
        color: t.textSecondary,
        lineHeight: 18,
      },
      cardSubtitleSelected: {
        color: isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(13, 15, 18, 0.72)",
      },
      check: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: isLight ? "rgba(255, 255, 255, 0.35)" : "rgba(13, 15, 18, 0.2)",
        alignItems: "center",
        justifyContent: "center",
      },
    }),
    reportTheme
  );

  return (
    <View>
      <Text style={styles.heading}>What happened?</Text>
      <Text style={styles.subheading}>
        Choose the closest match. You can add details in the next steps.
      </Text>
      <View style={styles.grid}>
        {EMERGENCY_TYPE_OPTIONS.map((option) => {
          const selected =
            incidentType === option.incidentType &&
            typeProfile === option.profile;
          const key = `${option.incidentType}-${option.profile}`;
          return (
            <TypeCard
              key={key}
              option={option}
              selected={selected}
              onPress={() => onSelect(option.incidentType, option.profile)}
              styles={styles}
              reportTheme={reportTheme}
            />
          );
        })}
      </View>
    </View>
  );
}
