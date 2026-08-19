import React from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Chip({ label, selected, onPress, styles }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 14, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[
        styles.chip,
        animatedStyle,
        selected ? styles.chipSelected : styles.chipDefault,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Filter ${label}`}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export default function FilterChips({
  statusFilters,
  typeFilters,
  statusFilter,
  typeFilter,
  onStatusChange,
  onTypeChange,
}) {
  const { historyTheme } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        marginTop: 10,
        marginBottom: 6,
        borderRadius: 16,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
        paddingVertical: 8,
      },
      row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        paddingRight: 14,
      },
      chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        minHeight: 36,
        justifyContent: "center",
      },
      chipDefault: {
        backgroundColor: t.card,
        borderColor: t.border,
      },
      chipSelected: {
        backgroundColor: t.primaryMuted,
        borderColor: t.primary,
      },
      chipText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: historyTypography.caption,
        color: t.textSecondary,
      },
      chipTextSelected: {
        color: t.primary,
      },
      divider: {
        width: 1,
        height: 20,
        backgroundColor: t.border,
        marginHorizontal: 2,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {statusFilters.map((item) => (
          <Chip
            key={`status-${item.id}`}
            label={item.label}
            selected={statusFilter === item.id}
            onPress={() => onStatusChange(item.id)}
            styles={styles}
          />
        ))}
        <View style={styles.divider} />
        {typeFilters.map((item) => (
          <Chip
            key={`type-${item.id}`}
            label={item.label}
            selected={typeFilter === item.id}
            onPress={() => onTypeChange(item.id)}
            styles={styles}
          />
        ))}
      </ScrollView>
    </View>
  );
}
