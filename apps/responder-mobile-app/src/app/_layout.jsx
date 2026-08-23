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
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/query/queryClient";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import useUserStore from "@/store/userStore";
import { ResqThemeProvider } from "@/theme";
import ResponderMessagingWidget from "@/modules/messaging/components/ResponderMessagingWidget";
import PriorityAlertProvider from "@/providers/PriorityAlertProvider";
import { Toaster } from "sonner-native";

// Do not call SplashScreen.preventAutoHideAsync() at module scope.
// On TestFlight (New Arch), that TurboModule void call can SIGABRT before JS catch runs.

export default function RootLayout() {
  const { loadUser, user } = useUserStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ResqThemeProvider>
        <PriorityAlertProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            />
            <ResponderMessagingWidget />
            <Toaster />
          </View>
        </GestureHandlerRootView>
        </PriorityAlertProvider>
      </ResqThemeProvider>
    </QueryClientProvider>
  );
}
