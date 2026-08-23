import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ArrowLeft, CheckCircle2, Radio, Shield, Sparkles } from "lucide-react-native";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

function HudTile({ label, count, icon: Icon, active, color, onPress, styles, t }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.hudTile,
        active && {
          borderColor: color,
          backgroundColor: t.surface,
          shadowColor: color,
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 2,
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}: ${count}`}
    >
      <View style={styles.hudTileHeader}>
        <Icon size={12} color={active ? color : t.textSecondary} strokeWidth={2.4} />
        <Text
          style={[
            styles.hudTileLabel,
            active && { color: color, fontFamily: "Inter_700Bold" },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.hudTileCount,
          active && { color: color },
        ]}
      >
        {count ?? 0}
      </Text>
    </Pressable>
  );
}

export default function HistoryHeader({
  onBack,
  reportCount = 0,
  stats = {},
  statusFilter = "all",
  onStatusChange,
}) {
  const { historyTheme, isLight } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        paddingBottom: 4,
        gap: 12,
      },
      topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      leftGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
      },
      backBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
      },
      titleBlock: {
        flex: 1,
        gap: 2,
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: 22,
        color: t.text,
        letterSpacing: -0.4,
      },
      subtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: 12,
        color: t.textSecondary,
        letterSpacing: 0.2,
      },
      hudRibbon: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      },
      hudTile: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.border,
        gap: 4,
      },
      hudTileHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
      },
      hudTileLabel: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 10,
        color: t.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      },
      hudTileCount: {
        fontFamily: "Inter_700Bold",
        fontSize: 17,
        color: t.text,
        letterSpacing: -0.2,
      },
      pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
      },
    }),
    historyTheme
  );

  const totalCount = stats.total ?? reportCount;
  const activeCount = stats.active ?? 0;
  const resolvedCount = stats.resolved ?? 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={historyTheme.text} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Incident Log</Text>
            <Text style={styles.subtitle}>Civilian Emergency Records</Text>
          </View>
        </View>
      </View>

      <View style={styles.hudRibbon}>
        <HudTile
          label="Total"
          count={totalCount}
          icon={Shield}
          active={statusFilter === "all"}
          color={historyTheme.primary}
          onPress={() => onStatusChange?.("all")}
          styles={styles}
          t={historyTheme}
        />
        <HudTile
          label="Live / Active"
          count={activeCount}
          icon={Radio}
          active={statusFilter === "active"}
          color={isLight ? "#DC2626" : "#FF5247"}
          onPress={() => onStatusChange?.("active")}
          styles={styles}
          t={historyTheme}
        />
        <HudTile
          label="Resolved"
          count={resolvedCount}
          icon={CheckCircle2}
          active={statusFilter === "resolved"}
          color={isLight ? "#059669" : "#34D399"}
          onPress={() => onStatusChange?.("resolved")}
          styles={styles}
          t={historyTheme}
        />
      </View>
    </View>
  );
}

