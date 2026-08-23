import React from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  AlertTriangle,
  CarFront,
  Flame,
  HeartPulse,
  Layers,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CATEGORY_ICONS = {
  all: Layers,
  fire: Flame,
  medical: HeartPulse,
  police_emergency: ShieldAlert,
  vehicular_accident: CarFront,
  electrical_powerline_hazard: TriangleAlert,
  other_emergency: AlertTriangle,
};

function StatusSegment({ label, selected, onPress, styles, t }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[
        styles.statusTab,
        selected ? styles.statusTabSelected : styles.statusTabDefault,
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Filter status ${label}`}
    >
      <Text
        style={[
          styles.statusTabText,
          selected ? styles.statusTabTextSelected : styles.statusTabTextDefault,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function CategoryTile({ id, label, selected, onPress, styles, t }) {
  const scale = useSharedValue(1);
  const Icon = CATEGORY_ICONS[id] || AlertTriangle;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[
        styles.catTile,
        selected ? styles.catTileSelected : styles.catTileDefault,
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Category ${label}`}
    >
      <Icon
        size={13}
        color={selected ? t.primary : t.textSecondary}
        strokeWidth={2.3}
      />
      <Text
        style={[
          styles.catTileText,
          selected ? styles.catTileTextSelected : styles.catTileTextDefault,
        ]}
        numberOfLines={1}
      >
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
  const { historyTheme, isLight } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      container: {
        marginTop: 6,
        marginBottom: 2,
        gap: 8,
      },
      statusDock: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
        padding: 3,
        gap: 4,
      },
      statusTab: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
      },
      statusTabDefault: {
        backgroundColor: "transparent",
      },
      statusTabSelected: {
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isLight ? 0.06 : 0.25,
        shadowRadius: 3,
        elevation: 1,
      },
      statusTabText: {
        fontSize: 11.5,
        letterSpacing: 0.1,
      },
      statusTabTextDefault: {
        fontFamily: "Inter_500Medium",
        color: t.textSecondary,
      },
      statusTabTextSelected: {
        fontFamily: "Inter_700Bold",
        color: t.text,
      },
      catScroll: {
        gap: 6,
        paddingVertical: 2,
      },
      catTile: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 9,
        borderWidth: 1,
      },
      catTileDefault: {
        backgroundColor: t.surface,
        borderColor: t.border,
      },
      catTileSelected: {
        backgroundColor: t.card,
        borderColor: t.primary,
        shadowColor: t.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.14,
        shadowRadius: 4,
        elevation: 1,
      },
      catTileText: {
        fontSize: 11,
        letterSpacing: 0.1,
      },
      catTileTextDefault: {
        fontFamily: "Inter_500Medium",
        color: t.textSecondary,
      },
      catTileTextSelected: {
        fontFamily: "Inter_700Bold",
        color: t.primary,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.container}>
      <View style={styles.statusDock}>
        {statusFilters.map((item) => (
          <StatusSegment
            key={`status-${item.id}`}
            label={item.label}
            selected={statusFilter === item.id}
            onPress={() => onStatusChange(item.id)}
            styles={styles}
            t={historyTheme}
          />
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
      >
        {typeFilters.map((item) => (
          <CategoryTile
            key={`type-${item.id}`}
            id={item.id}
            label={item.label}
            selected={typeFilter === item.id}
            onPress={() => onTypeChange(item.id)}
            styles={styles}
            t={historyTheme}
          />
        ))}
      </ScrollView>
    </View>
  );
}

