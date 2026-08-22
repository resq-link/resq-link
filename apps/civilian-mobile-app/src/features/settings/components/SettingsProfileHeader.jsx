import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Pencil, BadgeCheck, Phone } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { settingsTypography } from "@/features/settings/constants/theme";
import {
  formatDisplayPhone,
  getUserDisplayName,
  getUserInitials,
} from "@/features/settings/utils";

function SettingsProfileHeader({ user, theme, onEditProfile, index = 0 }) {
  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const phone = formatDisplayPhone(user);

  return (
    <Animated.View
      entering={FadeInDown.duration(380).delay(index * 60)}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View style={styles.mainRow}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: theme.avatarBg }]}>
            <Text style={[styles.initials, { color: theme.avatarIcon }]}>
              {initials}
            </Text>
          </View>
          <View
            style={[
              styles.onlineDot,
              {
                backgroundColor: theme.onlineDot,
                borderColor: theme.card,
              },
            ]}
            accessibilityLabel="Online"
          />
        </View>

        <View style={styles.identityCol}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: theme.text }]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {displayName}
            </Text>
            <View
              style={[
                styles.verifiedBadge,
                { backgroundColor: theme.verifiedBg },
              ]}
            >
              <BadgeCheck
                size={10}
                color={theme.verifiedText}
                strokeWidth={2.6}
              />
              <Text style={[styles.verifiedText, { color: theme.verifiedText }]}>
                Verified
              </Text>
            </View>
          </View>

          <View style={styles.phoneRow}>
            <Phone size={11} color={theme.textSecondary} strokeWidth={2.2} />
            <Text
              style={[styles.phone, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {phone}
            </Text>
          </View>
        </View>

        {onEditProfile ? (
        <Pressable
          onPress={onEditProfile}
          style={({ pressed }) => [
            styles.editBtn,
            {
              backgroundColor: theme.cardInner,
              borderColor: theme.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Pencil size={15} color={theme.textSecondary} strokeWidth={2.2} />
        </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default memo(SettingsProfileHeader);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  identityCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  name: {
    flexShrink: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    flexShrink: 0,
  },
  verifiedText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.15,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  phone: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: settingsTypography.profileMeta,
    letterSpacing: 0.1,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
});
