import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import { UI_MODE } from "@/utils/api";
import { getFirebaseAuth, onAuthStateChanged } from "@packages/firebase";

export default function Index() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading, loadUser, setUser } = useUserStore();
  const gradientDrift = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading || !user) return;

    // In UI_MODE we intentionally bypass Firebase Auth checks.
    if (UI_MODE) {
      router.replace("/dashboard");
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        router.replace("/dashboard");
        return;
      }

      // If AsyncStorage has stale user data but Firebase has no session,
      // clear local user and force login to avoid unauthorized Firestore calls.
      await setUser(null);
      router.replace("/login");
    });

    return unsubscribe;
  }, [user, isLoading, router, setUser]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientDrift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(gradientDrift, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [gradientDrift]);

  const driftTranslateX = gradientDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-90, 90],
  });

  const driftTranslateY = gradientDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 16],
  });

  if (!fontsLoaded || isLoading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <LinearGradient
      colors={["#121A12", "#0B100C", "#060906"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 28,
        paddingTop: insets.top + 72,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -100,
          left: -140,
          right: -140,
          bottom: -100,
          opacity: 0.28,
          transform: [{ translateX: driftTranslateX }, { translateY: driftTranslateY }],
        }}
      >
        <LinearGradient
          colors={["rgba(154,255,85,0.00)", "rgba(154,255,85,0.18)", "rgba(154,255,85,0.00)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <StatusBar style="light" backgroundColor="#121A12" />
      <View style={{ width: "100%", alignItems: "center" }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 28,
            color: "#FFFFFF",
            letterSpacing: 0.3,
          }}
        >
          <Text style={{ color: "#22C55E" }}>R</Text>ESQ-LINK
        </Text>
      </View>

          <View style={{ width: "100%", alignItems: "center", marginTop: -110 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 36,
                color: "#FFFFFF",
                textAlign: "center",
                lineHeight: 42,
              }}
            >
              Emergency response at your fingertips
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 15,
                color: "#B7C8B4",
                textAlign: "center",
                lineHeight: 22,
                marginTop: 18,
              }}
            >
              Report incidents fast and connect with responders in real time
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/login")}
            style={{ width: "100%", borderRadius: 12, overflow: "hidden" }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#76EA34", "#9AFF55"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                height: 52,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  color: "#0B1708",
                  fontSize: 16,
                }}
              >
                Get started
              </Text>
            </LinearGradient>
          </TouchableOpacity>
    </LinearGradient>
  );
}
