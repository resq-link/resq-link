import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ChevronRight,
  Info,
  LogOut,
  UserPen,
  Building2,
  KeyRound,
  MapPin,
  Navigation,
} from "lucide-react-native";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import {
  signOut,
  getFirebaseAuth,
  setDispatcherOnlineStatus,
  clearResponderRealtimePresence,
} from "@packages/firebase";
import useUserStore from "@/store/userStore";
import { radii, spacing, useResqTheme } from "@/theme";
import { dashboardConstants as DC } from "@/theme";
import { LOCATION_PAUSED_KEY } from "@/constants/location";

const LOGO = require("../../../../assets/images/resq-link-logo.png");
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

function formatRole(role) {
  if (!role || typeof role !== "string") return "Responder";
  return role
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function initialsFromEmail(email) {
  if (!email || typeof email !== "string") return "?";
  const local = email.split("@")[0] || "";
  const cleaned = local.replace(/[^a-zA-Z]/g, "");
  if (cleaned.length >= 2) return cleaned.slice(0, 2).toUpperCase();
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return local.slice(0, 1).toUpperCase() || "?";
}

export default function SettingsView() {
  const { t: D, colors: themeColors, statusBarStyle, appearance, setAppearance } =
    useResqTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useUserStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  /** Mirrors Location screen: when false, location updates are paused (same AsyncStorage key). */
  const [liveShare, setLiveShare] = useState(true);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: D.bg,
        },
        header: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          zIndex: 20,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        },
        brandLockup: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          marginRight: spacing.xs,
          minWidth: 0,
        },
        logoFrame: {
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: D.surfaceCard,
          borderWidth: 1,
          borderColor: D.borderStrong,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          ...Platform.select({
            android: { elevation: 3 },
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
          }),
        },
        logo: {
          width: 30,
          height: 30,
        },
        headerTitleBlock: {
          flex: 1,
          minWidth: 0,
          justifyContent: "center",
        },
        headerTitle: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 19,
          letterSpacing: -0.4,
          color: D.text,
        },
        bfpBadge: {
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: radii.md,
          backgroundColor: D.accentSubtle,
          borderWidth: 1,
          borderColor: D.accentBorder,
        },
        bfpBadgeText: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 10,
          letterSpacing: 1,
          color: D.accent,
        },
        headerHairline: {
          height: 1,
          marginTop: spacing.sm,
          backgroundColor: D.divider,
        },
        scroll: {
          flex: 1,
        },
        profileCard: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: D.border,
          backgroundColor: D.surfaceCard,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          marginBottom: spacing.md,
          ...Platform.select({
            android: { elevation: 2 },
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
            },
          }),
        },
        avatar: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: D.chipBg,
          borderWidth: 1,
          borderColor: D.chipBorder,
          alignItems: "center",
          justifyContent: "center",
        },
        avatarText: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 14,
          color: D.accent,
        },
        profileCol: {
          flex: 1,
          minWidth: 0,
        },
        profileLine: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 13,
          color: D.text,
        },
        profileEmail: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 11,
          color: D.textMuted,
          marginTop: 2,
        },
        onlineChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: radii.sm,
          backgroundColor: D.chipBg,
          borderWidth: 1,
          borderColor: D.chipBorder,
          flexShrink: 0,
        },
        onlineDot: {
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: D.accent,
        },
        onlineChipText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 9,
          color: D.text,
        },
        sectionWrap: {
          marginBottom: spacing.md,
        },
        sectionHeading: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 10,
          letterSpacing: 0.9,
          color: D.textMuted,
          textTransform: "uppercase",
          marginBottom: 6,
          marginLeft: 2,
        },
        card: {
          backgroundColor: D.surfaceCard,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: D.border,
          overflow: "hidden",
          ...Platform.select({
            android: { elevation: 1 },
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
            },
          }),
        },
        appearanceBody: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm + 2,
          gap: spacing.sm,
        },
        appearanceCaption: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          color: D.textSecondary,
          lineHeight: 16,
          marginBottom: 2,
        },
        appearanceRow: {
          flexDirection: "row",
          gap: 8,
        },
        appearanceChip: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: radii.md,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: D.border,
          backgroundColor: D.surfaceIconMuted,
        },
        appearanceChipOn: {
          borderColor: D.accentBorder,
          backgroundColor: D.accentSubtle,
        },
        appearanceChipText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 11,
          letterSpacing: 0.2,
          color: D.textSecondary,
        },
        appearanceChipTextOn: {
          color: D.accent,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
          paddingHorizontal: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: D.divider,
          gap: spacing.sm,
        },
        rowLast: {
          borderBottomWidth: 0,
        },
        rowLeft: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          minWidth: 0,
        },
        rowIconWrap: {
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: D.chipBg,
          borderWidth: 1,
          borderColor: D.chipBorder,
          alignItems: "center",
          justifyContent: "center",
        },
        rowLabel: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: D.text,
          flex: 1,
        },
        logoutWrap: {
          marginTop: spacing.sm,
          alignItems: "center",
          gap: spacing.sm,
          paddingBottom: spacing.xs,
        },
        logoutButton: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          paddingVertical: 12,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: D.buttonDestructiveBorder,
          backgroundColor: D.buttonDestructiveBg,
        },
        logoutText: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 15,
          color: themeColors.pending,
        },
        versionLabel: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 10,
          color: D.textMuted,
        },
      }),
    [D, themeColors]
  );

  const loadLiveShare = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCATION_PAUSED_KEY);
      setLiveShare(raw !== "true");
    } catch {
      setLiveShare(true);
    }
  }, []);

  useEffect(() => {
    loadLiveShare();
  }, [loadLiveShare]);

  useFocusEffect(
    useCallback(() => {
      loadLiveShare();
    }, [loadLiveShare])
  );

  async function persistLiveShare(on) {
    try {
      await AsyncStorage.setItem(LOCATION_PAUSED_KEY, String(!on));
      setLiveShare(on);
    } catch (e) {
      console.error("Settings live share:", e);
    }
  }

  function SettingsToggleRow({ icon: Icon, label, value, onValueChange, isLast }) {
    return (
      <View style={[styles.row, isLast && styles.rowLast]}>
        <View style={styles.rowLeft}>
          <View style={styles.rowIconWrap}>
            <Icon size={16} color={D.accent} strokeWidth={2} />
          </View>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: D.switchTrackOff, true: D.switchTrackOn }}
          thumbColor={value ? D.switchThumbOn : D.switchThumbOff}
          ios_backgroundColor={D.switchTrackOff}
        />
      </View>
    );
  }

  function SettingsNavRow({ icon: Icon, label, onPress, isLast }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.78}
        style={[styles.row, isLast && styles.rowLast]}
      >
        <View style={styles.rowLeft}>
          <View style={styles.rowIconWrap}>
            <Icon size={16} color={D.accent} strokeWidth={2} />
          </View>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <ChevronRight size={16} color={D.textMuted} strokeWidth={2} />
      </TouchableOpacity>
    );
  }

  function SectionCard({ title, children }) {
    return (
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionHeading}>{title}</Text>
        <View style={styles.card}>{children}</View>
      </View>
    );
  }

  useEffect(() => {
    if (!fontsLoaded || user) return;
    router.replace("/login");
  }, [fontsLoaded, user, router]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await clearResponderRealtimePresence();
      if (getFirebaseAuth().currentUser) {
        await setDispatcherOnlineStatus(false);
      }
      await signOut(getFirebaseAuth());
      await logout();
      router.replace("/login");
    } catch {
      try {
        await clearResponderRealtimePresence();
        if (getFirebaseAuth().currentUser) {
          await setDispatcherOnlineStatus(false);
        }
      } catch (_) {}
      await logout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!fontsLoaded) return null;
  if (!user) return null;

  const roleLabel = formatRole(user?.role);
  const emailLine = user?.email || "—";

  const appearanceOptions = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "system", label: "Auto" },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style={statusBarStyle} />

      <LinearGradient
        colors={[D.bgElevated, D.bg]}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandLockup}>
            <View style={styles.logoFrame}>
              <Image
                source={LOGO}
                style={styles.logo}
                contentFit="contain"
                accessibilityLabel="RES.Q"
              />
            </View>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle}>Settings</Text>
            </View>
          </View>
          <View style={styles.bfpBadge}>
            <Text style={styles.bfpBadgeText}>BFP</Text>
          </View>
        </View>
        <View style={styles.headerHairline} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + 88,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFromEmail(emailLine)}</Text>
          </View>
          <View style={styles.profileCol}>
            <Text style={styles.profileLine} numberOfLines={1}>
              {roleLabel} · {DC.unitLabel}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {emailLine}
            </Text>
          </View>
          <View style={styles.onlineChip}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineChipText}>On</Text>
          </View>
        </View>

        <SectionCard title="Account">
          <SettingsNavRow
            icon={UserPen}
            label="Profile"
            onPress={() => router.push("/support/help-support")}
          />
          <SettingsNavRow
            icon={Building2}
            label="Unit"
            onPress={() =>
              Alert.alert("Unit", `${DC.unitLabel}\n\n${emailLine}`)
            }
          />
          <SettingsNavRow
            icon={KeyRound}
            label="Security"
            onPress={() => router.push("/support/help-support")}
            isLast
          />
        </SectionCard>

        <SectionCard title="Location">
          <SettingsToggleRow
            icon={MapPin}
            label="Live share"
            value={liveShare}
            onValueChange={persistLiveShare}
          />
          <SettingsNavRow
            icon={Navigation}
            label="GPS & location"
            onPress={() => router.push("/support/location")}
            isLast
          />
        </SectionCard>

        <SectionCard title="Appearance">
          <View style={styles.appearanceBody}>
            <Text style={styles.appearanceCaption}>
              Light, dark, or match this device — for the demo walkthrough.
            </Text>
            <View style={styles.appearanceRow}>
              {appearanceOptions.map(({ id, label }) => {
                const selected = appearance === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setAppearance(id)}
                    style={[styles.appearanceChip, selected && styles.appearanceChipOn]}
                  >
                    <Text
                      style={[
                        styles.appearanceChipText,
                        selected && styles.appearanceChipTextOn,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </SectionCard>

        <SectionCard title="About">
          <SettingsNavRow
            icon={Info}
            label="About RES.Q"
            onPress={() => router.push("/support/about")}
            isLast
          />
        </SectionCard>

        <View style={styles.logoutWrap}>
          <TouchableOpacity
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.85}
            style={styles.logoutButton}
          >
            <LogOut size={18} color={themeColors.pending} strokeWidth={2.2} />
            <Text style={styles.logoutText}>
              {isLoggingOut ? "…" : "Logout"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.versionLabel}>v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
