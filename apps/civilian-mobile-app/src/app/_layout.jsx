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

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const { loadUser } = useUserStore();
  useImmersiveAndroidNavigation();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initiate();
    loadUser();
  }, [initiate]);

  useEffect(() => {
    if (isReady && fontsLoaded) {
      SplashScreen.hideAsync();
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
            <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
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
