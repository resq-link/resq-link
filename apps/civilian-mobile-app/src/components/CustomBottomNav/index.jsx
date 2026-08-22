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
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  House,
  Map,
  Clock3,
  Settings,
  AlertCircle,
  PhoneCall,
} from "lucide-react-native";
import { useSOS } from "@/hooks/useSOS";
import { useAppTheme } from "@/hooks/useAppTheme";
import { openEmergencyHotline } from "@/utils/emergencyHotline";
import { HIDE_NAV_SCREENS } from "@/constants/routes";
import {
  getBottomNavInset,
  NAV_BAR_CONTENT_HEIGHT,
} from "@/utils/navigationInsets";

const ICON_SIZE = 22;
const ICON_STROKE = 2;
const TAB_MIN_TOUCH = 44;

/** Semantic action colors — emergency UI only. */
const actionColors = {
  sosStart: "#FF5A52",
  sosEnd: "#FF3B30",
  sosShadow: "rgba(255, 59, 48, 0.45)",
  callStart: "#34C759",
  callEnd: "#7CFF4D",
  callShadow: "rgba(52, 199, 89, 0.35)",
};

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

function CallActionButton({ onPress, disabled, theme }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.92, { damping: 14, stiffness: 360 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[styles.callButtonWrap, animatedStyle, disabled && styles.actionDisabled]}
      accessibilityRole="button"
      accessibilityLabel="Call emergency hotline"
      accessibilityState={{ disabled, busy: disabled }}
      android_ripple={
        disabled ? undefined : { color: "rgba(13, 15, 18, 0.15)", borderless: true }
      }
    >
      <LinearGradient
        colors={[actionColors.callStart, actionColors.callEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.callButton,
          {
            shadowColor: actionColors.callShadow,
            borderColor: theme.actionBorder,
          },
        ]}
      >
        <PhoneCall
          size={22}
          color={theme.callIcon}
          strokeWidth={2.4}
        />
      </LinearGradient>
    </AnimatedPressable>
  );
}

function SOSActionButton({ onPress, disabled, theme }) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.035, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulse.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.9, { damping: 12, stiffness: 340 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[styles.sosButtonWrap, animatedStyle, disabled && styles.actionDisabled]}
      accessibilityRole="button"
      accessibilityLabel="Trigger SOS emergency"
      accessibilityState={{ disabled, busy: disabled }}
      android_ripple={
        disabled ? undefined : { color: "rgba(255, 255, 255, 0.2)", borderless: true }
      }
    >
      <LinearGradient
        colors={[actionColors.sosStart, actionColors.sosEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.sosButton,
          {
            shadowColor: actionColors.sosShadow,
            borderColor: theme.sosBorder,
          },
        ]}
      >
        <AlertCircle size={22} color="#FFFFFF" strokeWidth={2.4} />
      </LinearGradient>
    </AnimatedPressable>
  );
}

export default function CustomBottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { width: screenW } = useWindowDimensions();
  const { handleSOS, sosLoading } = useSOS();
  const { colors, navTheme: theme } = useAppTheme();
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

  const tabSplitIndex = Math.ceil(NAV_ITEMS.length / 2);

  const leftTabs = NAV_ITEMS.slice(0, tabSplitIndex);
  const rightTabs = NAV_ITEMS.slice(tabSplitIndex);

  const bottomInset = getBottomNavInset(insets);
  const topCornerRadius = screenW >= 768 ? 24 : 20;

  return (
    <Animated.View
      style={[
        styles.container,
        containerAnimatedStyle,
        { backgroundColor: theme.barBg },
      ]}
      pointerEvents="box-none"
    >
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
          <View style={styles.tabGroup}>
            {leftTabs.map((item) => (
              <NavTab
                key={item.key}
                item={item}
                active={item.isActive(pathname)}
                onPress={() => router.push(item.route)}
                theme={theme}
              />
            ))}
          </View>

          <View style={styles.emergencyRow}>
            <CallActionButton
              onPress={openEmergencyHotline}
              theme={theme}
            />
            <SOSActionButton
              onPress={handleSOS}
              disabled={sosLoading}
              theme={theme}
            />
          </View>

          <View
            style={[
              styles.tabGroup,
              rightTabs.length === 1 && styles.tabGroupSingle,
            ]}
          >
            {rightTabs.map((item) => (
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
  emergencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexShrink: 0,
    paddingHorizontal: 2,
  },
  callButtonWrap: {},
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonWrap: {},
  sosButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 12,
  },
  actionDisabled: {
    opacity: 0.55,
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
  tabGroup: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  tabGroupSingle: {
    justifyContent: "center",
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
