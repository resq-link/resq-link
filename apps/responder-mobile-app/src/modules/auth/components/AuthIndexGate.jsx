import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { waitForFirebaseAuthUser } from "@packages/firebase";
import useUserStore from "@/store/userStore";
import { useResqTheme } from "@/theme";

export default function AuthIndexGate() {
  const { colors } = useResqTheme();
  const router = useRouter();
  const { user, isLoading, loadUser, logout } = useUserStore();
  const [routing, setRouting] = useState(true);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return undefined;

    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) {
          setRouting(false);
          router.replace("/login");
        }
        return;
      }

      const firebaseUser = await waitForFirebaseAuthUser();
      if (cancelled) return;

      if (firebaseUser) {
        setRouting(false);
        router.replace("/dashboard");
        return;
      }

      // Stale AsyncStorage profile without a restored Firebase session.
      await logout();
      if (!cancelled) {
        setRouting(false);
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isLoading, fontsLoaded, router, logout]);

  if (!fontsLoaded || isLoading || routing) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return null;
}
