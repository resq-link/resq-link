import React from "react";
import { View, Text } from "react-native";
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

export default function AccountPendingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, authTheme: theme } = useAppTheme();
  const { logout } = useUserStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

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
          marginBottom: 32,
        }}
      >
        Your email is verified. A super admin will review your government ID and
        personal details. This can take up to 24 hours. You will be able to sign
        in once your KYC is approved.
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
