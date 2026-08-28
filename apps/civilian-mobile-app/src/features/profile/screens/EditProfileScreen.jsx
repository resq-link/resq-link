import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ArrowLeft, Camera, Lock } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/stores/userStore";
import { useAppTheme } from "@/hooks/useAppTheme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser, logout } = useUserStore();
  const { isLight } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const initialFullName =
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "") ||
    "Your Name";
  const initialPhone = user?.phone || user?.phoneNumber || "";
  const initialEmail = user?.email || "youremail@email.com";
  const initialUsername =
    user?.username ||
    (user?.email ? `@${user.email.split("@")[0]}` : "@yourname");

  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [username, setUsername] = useState(initialUsername);
  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl || user?.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);

  const theme = useMemo(
    () => ({
      bg: isLight ? "#F4F4F7" : "#0D0D11",
      cardBg: isLight ? "#FFFFFF" : "#17171C",
      cardBorder: isLight ? "rgba(0, 0, 0, 0.05)" : "transparent",
      textPrimary: isLight ? "#111827" : "#FFFFFF",
      textSecondary: isLight ? "#6B7280" : "#8E8E93",
      divider: isLight ? "#EEEEF2" : "#26262F",
      backBtnBg: isLight ? "#E5E5EB" : "#1D1D24",
      backBtnIcon: isLight ? "#111827" : "#FFFFFF",
      avatarBg: isLight ? "#E5E7EB" : "#25252E",
      avatarInitial: isLight ? "#374151" : "#FFFFFF",
      inputColor: isLight ? "#111827" : "#FFFFFF",
      lockedColor: isLight ? "#9CA3AF" : "#6B7280",
      saveBtnBg: isLight ? "#84CC16" : "#CEFF00",
      saveBtnText: "#000000",
      deleteBtnBg: isLight ? "#E5E7EB" : "#17171C",
      deleteBtnText: isLight ? "#374151" : "#FFFFFF",
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

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photos to change your profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("Error picking image:", e);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const handleSaveChanges = async () => {
    if (!fullName.trim()) {
      Alert.alert("Invalid Input", "Please enter your name.");
      return;
    }

    setIsSaving(true);
    try {
      const parts = fullName.trim().split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

      const updatedUser = {
        ...user,
        name: fullName.trim(),
        firstName,
        lastName,
        phone: phone.trim(),
        phone_number: phone.trim(),
        username: cleanUsername,
        avatarUrl: avatarUri,
      };

      await setUser(updatedUser);

      // If online and has uid, attempt Firestore update
      if (user?.uid) {
        try {
          const { getFirebaseFirestore, updateDoc, doc, serverTimestamp } = require("@packages/firebase");
          await updateDoc(doc(getFirebaseFirestore(), "users", user.uid), {
            name: fullName.trim(),
            firstName,
            lastName,
            phone: phone.trim(),
            phone_number: phone.trim(),
            username: cleanUsername,
            avatarUrl: avatarUri,
            updatedAt: serverTimestamp(),
          });
        } catch (dbErr) {
          console.warn("Could not sync edit to Firestore:", dbErr);
        }
      }

      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error("Save profile error:", err);
      Alert.alert("Error", "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style={isLight ? "dark" : "light"} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
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
          Edit Profile
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar with Camera Button */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(50)}
          style={styles.avatarSection}
        >
          <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
            <View style={[styles.avatarWrap, { backgroundColor: theme.avatarBg }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
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
                    {fullName.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
              )}
            </View>

            {/* Camera Badge */}
            <View
              style={[
                styles.cameraBadge,
                { backgroundColor: isLight ? "#84CC16" : "#CEFF00" },
              ]}
            >
              <Camera size={16} color="#000000" strokeWidth={2.4} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Form Card */}
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
          {/* Full Name */}
          <View style={styles.formRow}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Full name
            </Text>
            <TextInput
              style={[styles.fieldInput, { color: theme.inputColor }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your Name"
              placeholderTextColor={theme.textSecondary}
              textAlign="right"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Phone Number */}
          <View style={styles.formRow}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Phone number
            </Text>
            <TextInput
              style={[styles.fieldInput, { color: theme.inputColor }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="0000-0000-0000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              textAlign="right"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Email (LOCKED / READ-ONLY) */}
          <View style={styles.formRow}>
            <View style={styles.lockedLabelWrap}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Email
              </Text>
              <Lock size={12} color={theme.textSecondary} strokeWidth={2} style={styles.lockIcon} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: theme.lockedColor }]}
              value={initialEmail}
              editable={false}
              placeholder="youremail@email.com"
              placeholderTextColor={theme.lockedColor}
              textAlign="right"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Username */}
          <View style={styles.formRow}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Username
            </Text>
            <TextInput
              style={[styles.fieldInput, { color: theme.inputColor }]}
              value={username}
              onChangeText={(text) => {
                if (text && !text.startsWith("@")) {
                  setUsername(`@${text}`);
                } else {
                  setUsername(text);
                }
              }}
              placeholder="@yourname"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              textAlign="right"
            />
          </View>
        </Animated.View>

        {/* Save Changes Button */}
        <Animated.View entering={FadeInDown.duration(300).delay(150)}>
          <PillButton
            onPress={handleSaveChanges}
            bgColor={theme.saveBtnBg}
            textColor={theme.saveBtnText}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </PillButton>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PillButton({
  children,
  onPress,
  bgColor,
  textColor,
  borderColor = "transparent",
  isLight = false,
  disabled = false,
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 350 });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 350 });
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.pillBtn,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: isLight ? 1 : 0,
        },
        animatedStyle,
      ]}
    >
      {children}
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
    paddingTop: 12,
  },

  /* Avatar Section */
  avatarSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    marginTop: 8,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 52,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },

  /* Form Card */
  card: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20,
  },
  formRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  lockedLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lockIcon: {
    marginLeft: 2,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    letterSpacing: -0.1,
  },
  fieldInput: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingVertical: 4,
    marginLeft: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
  },

  /* Buttons */
  pillBtn: {
    height: 54,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  saveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#000000",
    letterSpacing: -0.2,
  },
});
