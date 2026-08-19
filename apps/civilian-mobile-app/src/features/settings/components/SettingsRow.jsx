import React, { memo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { settingsTypography } from "@/features/settings/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SettingsRow({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  onPress,
  theme,
  isLast = false,
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 320 });
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.row,
        animatedStyle,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.separator,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.rowInner,
            pressed && { backgroundColor: theme.rowPressed },
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: `${iconColor}18` }]}>
            <Icon size={18} color={iconColor} strokeWidth={2.2} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.subtitle, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={18} color={theme.textMuted} strokeWidth={2.2} />
        </View>
      )}
    </AnimatedPressable>
  );
}

export default memo(SettingsRow);

const styles = StyleSheet.create({
  row: {
    overflow: "hidden",
  },
  rowInner: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: settingsTypography.rowTitle,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: settingsTypography.rowSubtitle,
    marginTop: 2,
  },
});
