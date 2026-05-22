import { useAuth } from "@/utils/auth/useAuth";
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
import useUserStore from "@/utils/userStore";
import CustomBottomNav from "@/components/CustomBottomNav";

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
  const { initiate, isReady } = useAuth();
  const { loadUser } = useUserStore();

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
    }
  }, [isReady, fontsLoaded]);

  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="emergency-form" />
            <Stack.Screen name="footage-request" />
            <Stack.Screen name="emergency-confirmation" />
            <Stack.Screen name="calling" />
            <Stack.Screen name="responder-map" />
            <Stack.Screen name="appearance" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="privacy-security" />
            <Stack.Screen name="help-support" />
            <Stack.Screen name="report-issue" />
            <Stack.Screen name="faq" />
          </Stack>
          <CustomBottomNav />
        </View>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
