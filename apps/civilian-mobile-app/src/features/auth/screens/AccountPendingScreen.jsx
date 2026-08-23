import React, { useEffect, useRef } from "react";
import { View, Text, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Clock3 } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import CustomButton from "@/components/CustomButton";
import useUserStore from "@/stores/userStore";
import { UI_MODE } from "@/services/api";
import { useAppTheme } from "@/hooks/useAppTheme";
import { LEGAL_URLS } from "@/constants/legal";
import { openLegalDocument } from "@/utils/openLegalDocument";
import { ROUTES } from "@/constants/routes";

function profileToUserData(profile) {
  return {
    uid: profile.uid,
    email: profile.email,
    name: profile.name,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone_number: profile.phone,
    phone: profile.phone,
    role: profile.role,
    status: profile.status,
  };
}

export default function AccountPendingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, authTheme: theme } = useAppTheme();
  const { user, logout, setUser } = useUserStore();
  const redirectingRef = useRef(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (UI_MODE || !user?.uid || redirectingRef.current) return undefined;

    let unsubscribe = () => {};

    try {
      const { subscribeToCivilianUserProfile, getFirebaseAuth, signOut } =
        require("@packages/firebase");

      unsubscribe = subscribeToCivilianUserProfile(user.uid, async (profile) => {
        if (!profile || redirectingRef.current) return;

        if (profile.status === "active") {
          redirectingRef.current = true;
          await setUser(profileToUserData(profile));
          router.replace(ROUTES.dashboard);
          return;
        }

        if (profile.status === "rejected") {
          redirectingRef.current = true;
          const reason =
            profile.kycRejectionReason ||
            "Your account was rejected during KYC review. Contact support.";

          try {
            await signOut(getFirebaseAuth());
          } catch {
            // Local logout still proceeds.
          }
          await logout();

          Alert.alert("Account not approved", reason, [
            { text: "OK", onPress: () => router.replace(ROUTES.login) },
          ]);
        }
      });
    } catch (error) {
      if (__DEV__) {
        console.warn("KYC status listener unavailable:", error);
      }
    }

    return unsubscribe;
  }, [user?.uid, setUser, logout, router]);

  if (!fontsLoaded) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      if (!UI_MODE) {
        const { getFirebaseAuth, signOut } = require("@packages/firebase");
        await signOut(getFirebaseAuth());
      }
    } catch {
      // Local logout still proceeds.
    }
    await logout();
    router.replace("/login");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 48,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.inputBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Clock3 size={28} color={theme.link} />
      </View>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 28,
          color: colors.text,
          marginBottom: 12,
        }}
      >
        Account under review
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 16,
          lineHeight: 24,
          color: colors.textSecondary,
          marginBottom: 16,
        }}
      >
        Your email is verified. A super admin will review your government ID and
        personal details. This can take up to 24 hours. You will be taken to the
        app automatically once your KYC is approved — no need to sign out and
        sign in again.
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          lineHeight: 21,
          color: colors.textSecondary,
          marginBottom: 32,
        }}
      >
        Your ID is stored securely and used only for verification.{" "}
        <Text
          style={{ fontFamily: "Inter_600SemiBold", color: theme.link, textDecorationLine: "underline" }}
          onPress={() => openLegalDocument(LEGAL_URLS.privacyPolicy, "Privacy policy")}
        >
          Privacy policy
        </Text>
      </Text>
      <CustomButton
        title="Sign out"
        onPress={handleSignOut}
        variant="secondary"
        buttonVariant="register"
      />
    </View>
  );
}
