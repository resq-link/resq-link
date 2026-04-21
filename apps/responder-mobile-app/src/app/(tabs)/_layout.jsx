import { Tabs } from "expo-router";
import MainTabBar from "@/components/layout/MainTabBar";

/**
 * Primary surface: three visible destinations (Dashboard, Map, Settings).
 * Notifications stay reachable at /notifications from Settings, but are hidden from the bottom navbar.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
