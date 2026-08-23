import { Stack } from "expo-router";
import useCivilianRouteGuard from "@/hooks/useCivilianRouteGuard";

export default function MainLayout() {
  useCivilianRouteGuard();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 220,
      }}
    />
  );
}
