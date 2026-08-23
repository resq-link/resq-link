import { Tabs } from "expo-router";
import MainTabBar from "@/components/layout/MainTabBar";

/**
 * Primary surface: Dispatch, Map, Messages, Profile.
 * Notifications stay reachable from Settings but are hidden from the bottom navbar.
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
      <Tabs.Screen name="dashboard" options={{ title: "Dispatch" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ title: "Profile" }} />
    </Tabs>
  );
}
