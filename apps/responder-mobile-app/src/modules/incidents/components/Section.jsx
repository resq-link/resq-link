import React from "react";
import { View, Text, TouchableOpacity, Animated, LayoutAnimation } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { radii, spacing } from "@/theme";

export default function Section({ title, children, colors, collapsible = false, defaultExpanded = true, embedded = false }) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const animatedValue = React.useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextValue = !expanded;
    setExpanded(nextValue);
    Animated.timing(animatedValue, {
      toValue: nextValue ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotateChevron = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  if (collapsible) {
    return (
      <View
        style={{
          backgroundColor: embedded ? "transparent" : colors.surface,
          borderRadius: embedded ? 0 : radii.lg,
          padding: embedded ? 0 : spacing.lg,
          marginBottom: spacing.md,
          borderWidth: embedded ? 0 : 1,
          borderColor: embedded ? "transparent" : colors.border,
          overflow: "hidden",
        }}
      >
        <TouchableOpacity
          onPress={toggleExpand}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: expanded ? spacing.md : 0,
          }}
          accessibilityRole="button"
          accessibilityLabel={`${title} section`}
          accessibilityHint={expanded ? "Double tap to collapse this section" : "Double tap to expand this section"}
          accessibilityState={{ expanded }}
        >
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 14,
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {title}
          </Text>
          <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
            <ChevronDown size={18} color={colors.textSecondary} />
          </Animated.View>
        </TouchableOpacity>
        {expanded && <View style={{ marginTop: spacing.sm }}>{children}</View>}
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: embedded ? "transparent" : colors.surface,
        borderRadius: embedded ? 0 : radii.lg,
        padding: embedded ? 0 : spacing.lg,
        marginBottom: spacing.md,
        borderWidth: embedded ? 0 : 1,
        borderColor: embedded ? "transparent" : colors.border,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: spacing.md,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
