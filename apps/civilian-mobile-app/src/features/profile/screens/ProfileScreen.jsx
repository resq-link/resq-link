import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  Modal,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  ArrowLeft,
  ChevronRight,
  BellOff,
  SlidersHorizontal,
  Moon,
  Languages,
  Users,
  CircleHelp,
  Info,
  ShieldAlert,
  LogOut,
  Trash2,
  Check,
  X,
  Phone,
} from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useUserStore from "@/stores/userStore";
import { useAuthStore } from "@/stores/authStore";
import { useAppTheme } from "@/hooks/useAppTheme";
import { getBottomNavHeight } from "@/utils/navigationInsets";
import { LEGAL_URLS } from "@/constants/legal";
import CustomSwitch from "@/features/settings/components/CustomSwitch";

const STORAGE_KEY_PAUSE_NOTIF = "settings_pause_notifications";
const STORAGE_KEY_LANGUAGE = "settings_app_language";

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English (US)" },
  { code: "fil", name: "Filipino", nativeName: "Wikang Filipino / Tagalog" },
  { code: "ceb", name: "Cebuano", nativeName: "Binisaya" },
  { code: "ilo", name: "Ilocano", nativeName: "Ilokano" },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useUserStore();
  const { setAuth } = useAuthStore();
  const { isLight, setThemePreference } = useAppTheme();

  const [pauseNotifications, setPauseNotifications] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const theme = useMemo(
    () => ({
      bg: isLight ? "#F4F4F7" : "#0D0D11",
      cardBg: isLight ? "#FFFFFF" : "#17171C",
      cardBorder: isLight ? "rgba(0, 0, 0, 0.05)" : "transparent",
      textPrimary: isLight ? "#111827" : "#FFFFFF",
      textSecondary: isLight ? "#6B7280" : "#8E8E93",
      iconColor: isLight ? "#6B7280" : "#9E9EA7",
      chevronColor: isLight ? "#9CA3AF" : "#8E8E93",
      divider: isLight ? "#EEEEF2" : "#26262F",
      rowPressed: isLight ? "#F9FAFB" : "#202028",
      backBtnBg: isLight ? "#E5E5EB" : "#1D1D24",
      backBtnIcon: isLight ? "#111827" : "#FFFFFF",
      avatarBg: isLight ? "#E5E7EB" : "#25252E",
      avatarInitial: isLight ? "#374151" : "#FFFFFF",
      switchInactive: isLight ? "#D1D5DB" : "#2C2C34",
      switchActive: isLight ? "#84CC16" : "#CEFF00",
      modalBg: isLight ? "#FFFFFF" : "#1A1A22",
      modalBorder: isLight ? "#E5E7EB" : "#2D2D38",
      logoutBg: "#FFFFFF",
      logoutText: "#E53935",
      logoutBorder: isLight ? "rgba(229, 57, 53, 0.18)" : "transparent",
      shadow: isLight
        ? {
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }
        : {},
    }),
    [isLight]
  );

  useEffect(() => {
    const loadStoredPreferences = async () => {
      try {
        const storedPause = await AsyncStorage.getItem(STORAGE_KEY_PAUSE_NOTIF);
        if (storedPause !== null) {
          setPauseNotifications(storedPause === "true");
        }
        const storedLang = await AsyncStorage.getItem(STORAGE_KEY_LANGUAGE);
        if (storedLang) {
          setSelectedLanguage(storedLang);
        }
      } catch (e) {
        console.warn("Error loading settings preferences:", e);
      }
    };
    loadStoredPreferences();
  }, []);

  const handleTogglePauseNotifications = useCallback(async (val) => {
    setPauseNotifications(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PAUSE_NOTIF, String(val));
    } catch (e) {
      console.warn("Failed saving pause notification state:", e);
    }
  }, []);

  const handleToggleDarkMode = useCallback(
    (val) => {
      setThemePreference(val ? "dark" : "light");
    },
    [setThemePreference]
  );

  const handleSelectLanguage = useCallback(async (code) => {
    setSelectedLanguage(code);
    setIsLanguageModalVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_LANGUAGE, code);
    } catch (e) {
      console.warn("Failed saving language preference:", e);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogout = useCallback(() => {
    Alert.alert("Log Out", "Are you sure you want to log out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }, [logout, router]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              const { deleteCivilianAccount } = require("@packages/firebase/civilian-auth");
              const { getFirebaseAuth } = require("@packages/firebase");
              const firebaseUser = getFirebaseAuth().currentUser;
              if (firebaseUser) {
                await deleteCivilianAccount(firebaseUser);
              }
              await logout();
              setAuth(null);
              router.replace("/login");
            } catch (err) {
              if (err?.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Session Expired",
                  "Please sign out and sign in again, then try deleting your account."
                );
              } else {
                Alert.alert("Error", "Failed to delete your account. Please try again.");
              }
            }
          },
        },
      ]
    );
  }, [logout, setAuth, router]);

  const handleOpenTerms = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(LEGAL_URLS.termsOfUse);
      if (supported) {
        await Linking.openURL(LEGAL_URLS.termsOfUse);
      } else {
        router.push("/privacy-security");
      }
    } catch {
      router.push("/privacy-security");
    }
  }, [router]);

  const handleOpenUserPolicy = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(LEGAL_URLS.privacyPolicy);
      if (supported) {
        await Linking.openURL(LEGAL_URLS.privacyPolicy);
      } else {
        router.push("/privacy-security");
      }
    } catch {
      router.push("/privacy-security");
    }
  }, [router]);

  const bottomPadding = getBottomNavHeight(insets) + 24;

  const displayName =
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : null) ||
    "Your Name";

  const username =
    user?.username ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "yourname";

  const userAvatarUri = user?.avatarUrl || user?.photoURL || null;

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={isLight ? "dark" : "light"} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.backBtnBg },
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={20} color={theme.backBtnIcon} strokeWidth={2.4} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Settings
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: bottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(300).delay(50)}>
          <Pressable
            onPress={() => router.push("/edit-profile")}
            style={({ pressed }) => [
              styles.profileCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                borderWidth: isLight ? 1 : 0,
              },
              theme.shadow,
              pressed && styles.cardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Profile for ${displayName}, @${username}`}
          >
            <View style={[styles.avatarWrap, { backgroundColor: theme.avatarBg }]}>
              {userAvatarUri ? (
                <Image source={{ uri: userAvatarUri }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: theme.avatarBg },
                  ]}
                >
                  <Text
                    style={[styles.avatarInitial, { color: theme.avatarInitial }]}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.profileTextCol}>
              <Text
                style={[styles.profileName, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                style={[styles.profileHandle, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                @{username}
              </Text>
            </View>

            <ChevronRight size={20} color={theme.chevronColor} strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* Card 2: Notifications & General Settings */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(100)}
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isLight ? 1 : 0,
            },
            theme.shadow,
          ]}
        >
          {/* Pause notifications */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <BellOff size={20} color={theme.iconColor} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                Pause notifications
              </Text>
            </View>
            <CustomSwitch
              value={pauseNotifications}
              onValueChange={handleTogglePauseNotifications}
              activeColor={theme.switchActive}
              inactiveColor={theme.switchInactive}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* General settings */}
          <Pressable
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: theme.rowPressed },
            ]}
            accessibilityRole="button"
            accessibilityLabel="General settings"
          >
            <View style={styles.rowLeft}>
              <SlidersHorizontal
                size={20}
                color={theme.iconColor}
                strokeWidth={2}
              />
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                General settings
              </Text>
            </View>
            <ChevronRight size={20} color={theme.chevronColor} strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* Card 3: Theme, Language, Emergency Contact */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(150)}
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isLight ? 1 : 0,
            },
            theme.shadow,
          ]}
        >
          {/* Dark mode */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Moon size={20} color={theme.iconColor} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                Dark mode
              </Text>
            </View>
            <CustomSwitch
              value={!isLight}
              onValueChange={handleToggleDarkMode}
              activeColor={theme.switchActive}
              inactiveColor={theme.switchInactive}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Language */}
          <Pressable
            onPress={() => setIsLanguageModalVisible(true)}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: theme.rowPressed },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Language"
          >
            <View style={styles.rowLeft}>
              <Languages size={20} color={theme.iconColor} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                Language
              </Text>
            </View>
            <ChevronRight size={20} color={theme.chevronColor} strokeWidth={2} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* My Contact */}
          <Pressable
            onPress={() => setIsContactModalVisible(true)}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: theme.rowPressed },
            ]}
            accessibilityRole="button"
            accessibilityLabel="My Contact"
          >
            <View style={styles.rowLeft}>
              <Users size={20} color={theme.iconColor} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                My Contact
              </Text>
            </View>
            <ChevronRight size={20} color={theme.chevronColor} strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* Card 4: FAQ, Terms of Service, User Policy */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(200)}
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isLight ? 1 : 0,
            },
            theme.shadow,
          ]}
        >
          {/* FAQ */}
          <Pressable
            onPress={() => router.push("/faq")}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: theme.rowPressed },
            ]}
            accessibilityRole="button"
            accessibilityLabel="FAQ"
          >
            <View style={styles.rowLeft}>
              <CircleHelp size={20} color={theme.iconColor} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                FAQ
              </Text>
            </View>
            <ChevronRight size={20} color={theme.chevronColor} strokeWidth={2} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Terms of service */}
          <Pressable
            onPress={handleOpenTerms}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: theme.rowPressed },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Terms of service"
          >
            <View style={styles.rowLeft}>
              <Info size={20} color={theme.iconColor} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                Terms of service
              </Text>
            </View>
            <ChevronRight size={20} color={theme.chevronColor} strokeWidth={2} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* User policy */}
          <Pressable
            onPress={handleOpenUserPolicy}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: theme.rowPressed },
            ]}
            accessibilityRole="button"
            accessibilityLabel="User policy"
          >
            <View style={styles.rowLeft}>
              <ShieldAlert size={20} color={theme.iconColor} strokeWidth={2} />
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
                User policy
              </Text>
            </View>
            <ChevronRight size={20} color={theme.chevronColor} strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* Bottom Log Out Button */}
        <Animated.View entering={FadeInDown.duration(300).delay(250)}>
          <LogoutPillButton
            onPress={handleLogout}
            bgColor={theme.logoutBg}
            textColor={theme.logoutText}
            borderColor={theme.logoutBorder}
            isLight={isLight}
          />
        </Animated.View>

        {/* Delete Account Button */}
        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <DeleteAccountButton
            onPress={handleDeleteAccount}
            bgColor={isLight ? "rgba(229,57,53,0.06)" : "rgba(229,57,53,0.10)"}
            textColor="#E53935"
            borderColor={isLight ? "rgba(229,57,53,0.18)" : "transparent"}
            isLight={isLight}
          />
        </Animated.View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={isLanguageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsLanguageModalVisible(false)}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.modalBg,
                borderColor: theme.modalBorder,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.divider },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Select Language
              </Text>
              <Pressable
                onPress={() => setIsLanguageModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={theme.textPrimary} />
              </Pressable>
            </View>

            {LANGUAGES.map((lang, index) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handleSelectLanguage(lang.code)}
                  style={[
                    styles.langOption,
                    isSelected && {
                      backgroundColor: isLight
                        ? "rgba(132, 204, 22, 0.12)"
                        : "rgba(206, 255, 0, 0.08)",
                      borderRadius: 12,
                    },
                    index < LANGUAGES.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.divider,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.langName,
                        { color: theme.textPrimary },
                        isSelected && {
                          color: isLight ? "#65A30D" : "#CEFF00",
                        },
                      ]}
                    >
                      {lang.name}
                    </Text>
                    <Text
                      style={[
                        styles.langNative,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {lang.nativeName}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Check
                      size={20}
                      color={isLight ? "#65A30D" : "#CEFF00"}
                      strokeWidth={2.4}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* My Contact Modal */}
      <Modal
        visible={isContactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsContactModalVisible(false)}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.modalBg,
                borderColor: theme.modalBorder,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.divider },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Emergency Contacts
              </Text>
              <Pressable
                onPress={() => setIsContactModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={theme.textPrimary} />
              </Pressable>
            </View>

            <View
              style={[
                styles.contactItem,
                { borderBottomColor: theme.divider },
              ]}
            >
              <View
                style={[
                  styles.contactIconWrap,
                  {
                    backgroundColor: isLight
                      ? "rgba(132, 204, 22, 0.14)"
                      : "rgba(206, 255, 0, 0.12)",
                  },
                ]}
              >
                <Phone
                  size={18}
                  color={isLight ? "#65A30D" : "#CEFF00"}
                />
              </View>
              <View style={styles.contactTextCol}>
                <Text
                  style={[
                    styles.contactLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  National Emergency Hotline
                </Text>
                <Text
                  style={[
                    styles.contactValue,
                    { color: theme.textPrimary },
                  ]}
                >
                  911
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.contactItem,
                { borderBottomColor: theme.divider },
              ]}
            >
              <View
                style={[
                  styles.contactIconWrap,
                  {
                    backgroundColor: isLight
                      ? "rgba(132, 204, 22, 0.14)"
                      : "rgba(206, 255, 0, 0.12)",
                  },
                ]}
              >
                <Phone
                  size={18}
                  color={isLight ? "#65A30D" : "#CEFF00"}
                />
              </View>
              <View style={styles.contactTextCol}>
                <Text
                  style={[
                    styles.contactLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  SPUP Command Center Hotline
                </Text>
                <Text
                  style={[
                    styles.contactValue,
                    { color: theme.textPrimary },
                  ]}
                >
                  +63 (78) 396-1987
                </Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <View
                style={[
                  styles.contactIconWrap,
                  {
                    backgroundColor: isLight
                      ? "rgba(132, 204, 22, 0.14)"
                      : "rgba(206, 255, 0, 0.12)",
                  },
                ]}
              >
                <Phone
                  size={18}
                  color={isLight ? "#65A30D" : "#CEFF00"}
                />
              </View>
              <View style={styles.contactTextCol}>
                <Text
                  style={[
                    styles.contactLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Registered Emergency Phone
                </Text>
                <Text
                  style={[
                    styles.contactValue,
                    { color: theme.textPrimary },
                  ]}
                >
                  {user?.phone || user?.phoneNumber || "Not configured"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LogoutPillButton({ onPress, bgColor, textColor, borderColor, isLight }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.logoutPill,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: isLight ? 1 : 0,
        },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Log Out"
    >
      <LogOut size={20} color={textColor} strokeWidth={2.2} />
      <Text style={[styles.logoutPillText, { color: textColor }]}>Log Out</Text>
    </AnimatedPressable>
  );
}

function DeleteAccountButton({ onPress, bgColor, textColor, borderColor, isLight }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.logoutPill,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: isLight ? 1 : 0,
        },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Delete Account"
    >
      <Trash2 size={20} color={textColor} strokeWidth={2.2} />
      <Text style={[styles.logoutPillText, { color: textColor }]}>Delete Account</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },

  /* Profile Card */
  profileCard: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  profileTextCol: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  profileName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    letterSpacing: -0.2,
  },
  profileHandle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginTop: 2,
  },

  /* Grouped Settings Cards */
  card: {
    borderRadius: 22,
    overflow: "hidden",
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  rowLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    letterSpacing: -0.1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
    marginRight: 18,
  },

  /* Bottom Log Out Pill */
  logoutPill: {
    height: 54,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.2,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  modalCloseBtn: {
    padding: 4,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  langName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  langNative: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTextCol: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  contactValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginTop: 2,
  },
});
