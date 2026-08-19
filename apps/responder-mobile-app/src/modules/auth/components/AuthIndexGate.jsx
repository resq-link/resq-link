import React, { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/store/userStore";
import { useResqTheme } from "@/theme";

export default function AuthIndexGate() {
  const { colors } = useResqTheme();
  const router = useRouter();
  const { user, isLoading, loadUser } = useUserStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, fontsLoaded]);

  if (!fontsLoaded || isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return null;
}
