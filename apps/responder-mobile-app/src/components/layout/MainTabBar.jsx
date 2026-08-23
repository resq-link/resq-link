import React, { useEffect, useMemo } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Shield, Radio, MessageSquare, UserRound } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useResqTheme, dashboardThemeDark, dashboardThemeLight } from "@/theme";
import { useMessaging } from "@/providers/MessagingProvider";
import {
  getBottomNavInset,
  NAV_BAR_CONTENT_HEIGHT,
} from "@/utils/navigationInsets";

const ICON_SIZE = 22;
const ICON_STROKE = 2;
const TAB_MIN_TOUCH = 44;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function createResponderNavTheme(isLight, palette) {
  return {
    barBg: isLight ? palette.surfaceCard : palette.bgBottom,
    barBorder: palette.borderSubtle,
    barShadow: "#000000",
    activePill: palette.navActiveBg,
    activeIcon: palette.navAccent,
    inactiveIcon: palette.textSecondary,
    activeLabel: palette.textPrimary,
    inactiveLabel: palette.textSecondary,
    badgeBg: "#DC2626",
    badgeText: "#FFFFFF",
  };
}

function NavTab({ label, Icon, active, onPress, theme, badgeCount = 0 }) {
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

  const tabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = active ? theme.activeIcon : theme.inactiveIcon;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 16, stiffness: 380 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      style={[styles.tab, tabAnimatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={
        badgeCount > 0
          ? `${label}, ${badgeCount} unread messages`
          : `Go to ${label.toLowerCase()}`
      }
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
        <View style={styles.iconWrap}>
          <Animated.View style={iconStyle}>
            <Icon size={ICON_SIZE} color={iconColor} strokeWidth={ICON_STROKE} />
          </Animated.View>
          {badgeCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
              <Animated.Text style={[styles.badgeText, { color: theme.badgeText }]}>
                {badgeCount > 9 ? "9+" : String(badgeCount)}
              </Animated.Text>
            </View>
          ) : null}
        </View>
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
          {label}
        </Animated.Text>
      </View>
    </AnimatedPressable>
  );
}

/**
 * Primary app navigation — full-width bar aligned with Civilian CustomBottomNav.
 */
export default function MainTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { resolvedScheme } = useResqTheme();
  const { unreadCount } = useMessaging();

  const palette =
    resolvedScheme === "dark" ? dashboardThemeDark : dashboardThemeLight;
  const isLight = resolvedScheme === "light";
  const theme = useMemo(
    () => createResponderNavTheme(isLight, palette),
    [isLight, palette]
  );

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

  const activeRouteName = state.routes[state.index]?.name;
  const bottomInset = getBottomNavInset(insets);
  const topCornerRadius = screenW >= 768 ? 24 : 20;

  const tabs = useMemo(
    () => [
      {
        name: "dashboard",
        label: "Dispatch",
        Icon: Shield,
      },
      {
        name: "map",
        label: "Map",
        Icon: Radio,
      },
      {
        name: "messages",
        label: "Messages",
        Icon: MessageSquare,
        badgeCount: unreadCount,
      },
      {
        name: "settings",
        label: "Profile",
        Icon: UserRound,
      },
    ],
    [unreadCount]
  );

  const handleTabPress = (tabName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (activeRouteName !== tabName) {
      navigation.navigate(tabName);
    }
  };

  const isTabActive = (tabName) => activeRouteName === tabName;

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
          {tabs.map(({ name, label, Icon, badgeCount }) => (
            <NavTab
              key={name}
              label={label}
              Icon={Icon}
              active={isTabActive(name)}
              badgeCount={badgeCount || 0}
              onPress={() => handleTabPress(name)}
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
  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    lineHeight: 12,
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 10,
    letterSpacing: 0.05,
  },
});
