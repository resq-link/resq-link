import { Tabs } from "expo-router";
import MainTabBar from "@/components/layout/MainTabBar";

/**
 * Primary surface: exactly four visible destinations (Expo Router tabs).
 * URLs stay flat: /dashboard, /map, /notifications, /settings (route groups omit (tabs)).
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
      <Tabs.Screen name="notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
