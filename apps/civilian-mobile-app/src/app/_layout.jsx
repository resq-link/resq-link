import { useAuth } from "@/hooks/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import useUserStore from "@/stores/userStore";
import CustomBottomNav from "@/components/CustomBottomNav";
import ShakeSOSListener from "@/components/ShakeSOSListener";
import SOSConfirmationModal from "@/components/SOSConfirmationModal";
import { AppThemeProvider } from "@/theme/AppThemeProvider";
import {
  useImmersiveAndroidNavigation,
  applyImmersiveAndroidNavigationBar,
} from "@/hooks/useImmersiveAndroidNavigation";

import { useRouter } from "expo-router";
import {
  registerForCivilianPush,
  unregisterCivilianPush,
  subscribeToCivilianNotificationResponse,
} from "@/services/civilianPushNotificationService";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const { initiate, isReady } = useAuth();
  const { user, loadUser } = useUserStore();
  useImmersiveAndroidNavigation();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Skip preventAutoHideAsync — native ObjC exceptions abort before JS .catch() runs.
    initiate();
    loadUser();
  }, [initiate, loadUser]);

  // Register push notifications when civilian user is authenticated
  useEffect(() => {
    const uid = user?.uid || user?.id;
    if (uid) {
      void registerForCivilianPush(uid).catch((err) => {
        console.warn("[civilian-push] register error:", err);
      });
    }
  }, [user?.uid, user?.id]);

  // Handle cold-start and background notification taps
  useEffect(() => {
    return subscribeToCivilianNotificationResponse({
      onNavigate: (data) => {
        if (data?.type === "advisory" || data?.advisoryId) {
          router.push({
            pathname: "/advisory-detail",
            params: { id: data.advisoryId },
          });
        } else if (data?.screen) {
          router.push(data.screen);
        } else if (data?.emergencyId) {
          router.push("/dashboard");
        }
      },
    });
  }, [router]);

  useEffect(() => {
    if (isReady && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
      applyImmersiveAndroidNavigationBar();
    }
  }, [isReady, fontsLoaded]);

  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "fade",
                animationDuration: 220,
              }}
              initialRouteName="index"
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(main)" />
              <Stack.Screen name="(settings)" />
            </Stack>
            <CustomBottomNav />
            <ShakeSOSListener />
            <SOSConfirmationModal />
          </View>
        </GestureHandlerRootView>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
