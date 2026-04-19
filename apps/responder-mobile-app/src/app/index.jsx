import React, { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import { useResqTheme } from "@/theme";

export default function Index() {
  const { colors } = useResqTheme();
  const router = useRouter();
  const { user, isLoading, loadUser } = useUserStore();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
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
