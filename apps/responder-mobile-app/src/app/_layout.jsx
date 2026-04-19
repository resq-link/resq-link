import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View, AppState } from "react-native";
import {
  onAuthStateChanged,
  getFirebaseAuth,
  beginResponderRealtimePresence,
  clearResponderRealtimePresence,
  suspendResponderRealtimePresence,
  resumeResponderRealtimePresence,
} from "@packages/firebase";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CustomBottomNav from "@/components/CustomBottomNav";
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import useUserStore from "@/utils/userStore";
import { ResqThemeProvider } from "@/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { loadUser, user } = useUserStore();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) {
      clearResponderRealtimePresence().catch(() => {});
      return;
    }

    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (!firebaseUser) {
        await clearResponderRealtimePresence();
        return;
      }
      await beginResponderRealtimePresence();
    });

    const appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        suspendResponderRealtimePresence().catch(() => {});
      } else if (next === "active") {
        resumeResponderRealtimePresence().catch(() => {});
      }
    });

    return () => {
      unsubAuth();
      appStateSub.remove();
      clearResponderRealtimePresence().catch(() => {});
    };
  }, [user]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ResqThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="case-detail" />
              <Stack.Screen name="map" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="location" />
              <Stack.Screen name="help-support" />
              <Stack.Screen name="about" />
            </Stack>
            <CustomBottomNav />
          </View>
        </GestureHandlerRootView>
      </ResqThemeProvider>
    </QueryClientProvider>
  );
}

