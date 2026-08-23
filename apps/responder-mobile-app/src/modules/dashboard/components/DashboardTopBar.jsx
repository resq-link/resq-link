import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Bell } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { spacing } from "@/theme";

/**
 * Compact Civilian-style top bar: name + role left · bell + avatar right.
 */
export default function DashboardTopBar({
  initials,
  displayName,
  roleLabel,
  onDuty = false,
  dutyUnitLabel,
  onPressDuty,
  notificationCount = 0,
  onPressNotifications,
  onPressProfile,
  topInset = 0,
  theme,
}) {
  const hasUnread = notificationCount > 0;
  const styles = useMemo(() => buildStyles(theme), [theme]);

  const handleBellPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressNotifications?.();
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressProfile?.();
  };

  const handleDutyPress = () => {
    if (!onPressDuty) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressDuty();
  };

  const dutyLabel = onDuty
    ? dutyUnitLabel
      ? `On duty · ${dutyUnitLabel}`
      : "On duty"
    : "Off duty";

  return (
    <View style={[styles.header, { paddingTop: topInset }]}>
      <View style={styles.headerTextBlock}>
        <Text style={styles.userName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.roleLine} numberOfLines={1}>
          {roleLabel}
        </Text>
        <Pressable
          onPress={handleDutyPress}
          disabled={!onPressDuty}
          style={({ pressed }) => [
            styles.dutyPill,
            {
              backgroundColor: onDuty
                ? `${theme.statOnline ?? "#22C55E"}22`
                : theme.chipBg ?? "rgba(100, 116, 139, 0.12)",
            },
            onPressDuty && pressed && styles.pressed,
          ]}
          accessibilityRole={onPressDuty ? "button" : "text"}
          accessibilityLabel={
            onDuty
              ? `On duty${dutyUnitLabel ? `, ${dutyUnitLabel}` : ""}. Tap to view duty controls.`
              : "Off duty. Tap to go on duty."
          }
        >
          <View
            style={[
              styles.dutyDot,
              {
                backgroundColor: onDuty
                  ? theme.statOnline ?? "#22C55E"
                  : theme.textMuted,
              },
            ]}
          />
          <Text
            style={[
              styles.dutyPillText,
              { color: onDuty ? theme.statOnline ?? "#22C55E" : theme.textMuted },
            ]}
            numberOfLines={1}
          >
            {dutyLabel.toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <View style={styles.headerActions}>
        <Pressable
          onPress={handleBellPress}
          style={({ pressed }) => [
            styles.headerIconBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            hasUnread
              ? `Notifications, ${notificationCount} unread`
              : "Open notifications"
          }
        >
          <Bell size={18} color={theme.textPrimary} strokeWidth={2} />
          {hasUnread ? <View style={styles.notifBadge} /> : null}
        </Pressable>

        <Pressable
          onPress={handleAvatarPress}
          style={({ pressed }) => [
            styles.avatarBtn,
            pressed && styles.pressed,
            !onPressProfile && styles.avatarStatic,
          ]}
          accessibilityRole={onPressProfile ? "button" : "image"}
          accessibilityLabel={
            onPressProfile ? "Open profile" : `${initials} avatar`
          }
          disabled={!onPressProfile}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function buildStyles(theme) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    headerTextBlock: {
      flex: 1,
      paddingRight: 10,
      minWidth: 0,
    },
    userName: {
      fontFamily: "Inter_700Bold",
      fontSize: 17,
      letterSpacing: -0.2,
      color: theme.textPrimary,
    },
    roleLine: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 1,
    },
    dutyPill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      maxWidth: "100%",
    },
    dutyDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    dutyPillText: {
      fontFamily: "Inter_700Bold",
      fontSize: 9,
      letterSpacing: 0.6,
      flexShrink: 1,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visualScheme === "light" ? "#FFFFFF" : theme.surfaceCard,
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        android: { elevation: 1 },
      }),
    },
    notifBadge: {
      position: "absolute",
      top: 8,
      right: 9,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.alertBadge ?? "#DC2626",
      borderWidth: 1.5,
      borderColor: theme.visualScheme === "light" ? "#FFFFFF" : theme.surfaceCard,
    },
    avatarBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.accent,
    },
    avatarStatic: {
      opacity: 1,
    },
    avatarText: {
      fontFamily: "Inter_700Bold",
      fontSize: 14,
      color: "#FFFFFF",
      letterSpacing: 0.2,
    },
    pressed: {
      opacity: 0.86,
      transform: [{ scale: 0.97 }],
    },
  });
}
