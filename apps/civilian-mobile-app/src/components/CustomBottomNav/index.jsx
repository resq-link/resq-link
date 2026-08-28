import React, { useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { House, Map, Clock3, Settings } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { HIDE_NAV_SCREENS } from "@/constants/routes";
import ActiveIncidentBottomBar from "@/components/ActiveIncidentBottomBar";
import {
  getBottomNavInset,
  NAV_BAR_CONTENT_HEIGHT,
} from "@/utils/navigationInsets";

const ICON_SIZE = 22;
const ICON_STROKE = 2;
const TAB_MIN_TOUCH = 44;

const NAV_ITEMS = [
  {
    key: "home",
    label: "Home",
    route: "/dashboard",
    Icon: House,
    isActive: (pathname) =>
      pathname === "/dashboard" || pathname?.endsWith("/dashboard"),
  },
  {
    key: "map",
    label: "Map",
    route: "/responder-map",
    Icon: Map,
    isActive: (pathname) => pathname?.includes("/responder-map"),
  },
  {
    key: "history",
    label: "History",
    route: "/(tabs)/history",
    Icon: Clock3,
    isActive: (pathname) => pathname?.includes("/history"),
  },
  {
    key: "settings",
    label: "Settings",
    route: "/(tabs)/profile",
    Icon: Settings,
    isActive: (pathname) => pathname?.includes("/profile"),
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function NavTab({ item, active, onPress, theme }) {
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(active ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, activeProgress]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeProgress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(activeProgress.value, [0, 1], [0.88, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(activeProgress.value, [0, 1], [1, 1.06]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeProgress.value, [0, 1], [0.72, 1]),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 16, stiffness: 380 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 320 });
  };

  const tabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Icon = item.Icon;
  const iconColor = active ? theme.activeIcon : theme.inactiveIcon;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tab, tabAnimatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={`Go to ${item.label.toLowerCase()}`}
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
    >
      <View style={styles.tabInner}>
        <Animated.View
          style={[
            styles.activePill,
            { backgroundColor: theme.activePill },
            pillStyle,
          ]}
        />
        <Animated.View style={iconStyle}>
          <Icon size={ICON_SIZE} color={iconColor} strokeWidth={ICON_STROKE} />
        </Animated.View>
        <Animated.Text
          style={[
            styles.tabLabel,
            {
              color: active ? theme.activeLabel : theme.inactiveLabel,
              fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
            },
            labelStyle,
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Animated.Text>
      </View>
    </AnimatedPressable>
  );
}

export default function CustomBottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { width: screenW } = useWindowDimensions();
  const { navTheme: theme } = useAppTheme();
  const mountOpacity = useSharedValue(0);
  const mountTranslateY = useSharedValue(16);

  useEffect(() => {
    mountOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    mountTranslateY.value = withTiming(0, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
  }, [mountOpacity, mountTranslateY]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mountOpacity.value,
    transform: [{ translateY: mountTranslateY.value }],
  }));

  const shouldHide = HIDE_NAV_SCREENS.some(
    (screen) =>
      pathname === screen || pathname?.endsWith(screen) || pathname === "/"
  );

  if (shouldHide) {
    return null;
  }

  const bottomInset = getBottomNavInset(insets);
  const topCornerRadius = screenW >= 768 ? 24 : 20;

  return (
    <Animated.View
      style={[
        styles.container,
        containerAnimatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <ActiveIncidentBottomBar />
      <View
        style={[
          styles.navBar,
          {
            backgroundColor: theme.barBg,
            borderTopColor: theme.barBorder,
            shadowColor: theme.barShadow,
            borderTopLeftRadius: topCornerRadius,
            borderTopRightRadius: topCornerRadius,
          },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.tabRow,
            {
              minHeight: NAV_BAR_CONTENT_HEIGHT,
              paddingBottom: bottomInset,
            },
          ]}
        >
          {NAV_ITEMS.map((item) => (
            <NavTab
              key={item.key}
              item={item}
              active={item.isActive(pathname)}
              onPress={() => router.push(item.route)}
              theme={theme}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  navBar: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: Platform.OS === "ios" ? 0.1 : 0.16,
    shadowRadius: 12,
    elevation: 12,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  tab: {
    minWidth: 40,
    minHeight: TAB_MIN_TOUCH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
    minWidth: 40,
    minHeight: TAB_MIN_TOUCH,
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    marginHorizontal: 2,
    marginVertical: 1,
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 10,
    letterSpacing: 0.05,
  },
});
