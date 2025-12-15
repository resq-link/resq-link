import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import CustomButton from "@/components/CustomButton";
import useUserStore from "@/utils/userStore";

export default function Index() {
  const insets = useSafeAreaInsets();
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
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading]);

  if (!fontsLoaded || isLoading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000000",
        paddingTop: insets.top,
        paddingHorizontal: 24,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <StatusBar style="light" backgroundColor="#000000" />

      <View style={{ alignItems: "center", marginBottom: 60 }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 40,
            color: "#FFFFFF",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Emergency Response
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: "#9A9A9A",
            textAlign: "center",
            lineHeight: 24,
          }}
        >
          Report emergencies quickly and track responder locations in real-time
        </Text>
      </View>

      <View style={{ width: "100%" }}>
        <CustomButton
          title="Login"
          onPress={() => router.push("/login")}
          variant="primary"
          buttonVariant="login"
        />

        <CustomButton
          title="Register"
          onPress={() => router.push("/register")}
          variant="secondary"
          buttonVariant="login"
          style={{ marginBottom: 0 }}
        />
      </View>
    </View>
  );
}
