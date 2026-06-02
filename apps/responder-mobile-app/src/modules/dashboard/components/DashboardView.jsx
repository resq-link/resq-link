import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from "react-native-svg";
import {
  Activity,
  CheckCircle2,
  Radio,
  ClipboardList,
} from "lucide-react-native";
import useUserStore from "@/store/userStore";
import { getFirebaseAuth } from "@packages/firebase";
import CaseCard from "@/modules/incidents/components/CaseCard";
import LoadingScreen from "@/components/ui/LoadingScreen";
import {
  spacing,
  useResqTheme,
  dashboardThemeDark,
  dashboardThemeLight,
} from "@/theme";
import { LOCATION_PAUSED_KEY } from "@/constants/location";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/query/queryKeys";
import { useAssignedEmergencies } from "@/modules/incidents/hooks/useAssignedEmergencies";
import { useOnlineResponderCount } from "@/modules/dashboard/hooks/useOnlineResponderCount";
import { useDashboardLocationTracking } from "@/modules/dashboard/hooks/useDashboardLocationTracking";
import ResponderCallPanel from "@/modules/calls/components/ResponderCallPanel";
import {
  formatResponderName,
  initialsFromEmail,
} from "@/utils/formatResponderIdentity";
import { buildDashboardStyles } from "./dashboardView.styles";

export default function DashboardView() {
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mkLoop = (v, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    const l1 = mkLoop(pulseA, 0);
    const l2 = mkLoop(pulseB, 350);
    l1.start();
    l2.start();
    return () => {
      l1.stop();
      l2.stop();
    };
  }, [pulseA, pulseB]);

  const pulseOuterOpacity = pulseA.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.42],
  });
  const pulseOuterScale = pulseA.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const pulseMidOpacity = pulseB.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.38],
  });
  const pulseMidScale = pulseB.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUserStore();
  const authUid = getFirebaseAuth().currentUser?.uid ?? user?.uid;
  const [refreshing, setRefreshing] = useState(false);
  const [locationPaused, setLocationPaused] = useState(false);

  const { cases, initialSyncPending } = useAssignedEmergencies(
    user && authUid ? authUid : undefined,
    { onRealtimeSnapshot: () => setRefreshing(false) }
  );

  const { count: onlineResponderCount } = useOnlineResponderCount(!!user);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { resolvedScheme } = useResqTheme();
  const D = useMemo(
    () =>
      resolvedScheme === "dark" ? dashboardThemeDark : dashboardThemeLight,
    [resolvedScheme]
  );
  const styles = useMemo(() => buildDashboardStyles(D), [D]);

  const StatCard = useCallback(
    ({ label, value, Icon, accent, topTint, iconWellBg }) => {
      const light = D.visualScheme === "light";
      return (
        <View style={styles.statCardOuter}>
          <LinearGradient
            colors={[topTint, D.statCardBottom]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCardGradient}
          >
            <View style={styles.statTopRow}>
              {light && iconWellBg ? (
                <View style={[styles.statIconWell, { backgroundColor: iconWellBg }]}>
                  <Icon size={15} color={accent} strokeWidth={2.25} />
                </View>
              ) : (
                <Icon size={14} color={accent} strokeWidth={2.25} />
              )}
              <Text
                style={[styles.statValue, { color: accent }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {value}
              </Text>
            </View>
            <Text style={styles.statLabel}>{label}</Text>
          </LinearGradient>
        </View>
      );
    },
    [styles, D]
  );

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    const firebaseUser = getFirebaseAuth().currentUser;
    if (!firebaseUser) {
      router.replace("/login");
    }
  }, [user, router]);

  useDashboardLocationTracking(
    !!(user && getFirebaseAuth().currentUser && !locationPaused)
  );

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      AsyncStorage.getItem(LOCATION_PAUSED_KEY).then((raw) => {
        if (!cancelled) setLocationPaused(raw === "true");
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const onRefresh = () => setRefreshing(true);
  const handleCasePress = (caseData) => {
    router.push(`/incident/${caseData.id}`);
  };
  const handleCaseStatusUpdate = (caseId, status) => {
    if (!caseId || !status || !authUid) return;
    queryClient.setQueryData(queryKeys.incidents.assigned(authUid), (current = []) =>
      current.map((caseData) =>
        caseData.id === caseId
          ? { ...caseData, status, updatedAt: new Date() }
          : caseData
      )
    );
  };

  const identity = useMemo(() => {
    const email = user?.email || "";
    return {
      email,
      displayName: formatResponderName(email),
      initials: initialsFromEmail(email),
    };
  }, [user]);

  if (!fontsLoaded) return null;
  if (initialSyncPending) {
    return <LoadingScreen title="Loading…" subtitle={null} />;
  }

  const activeCount = cases.filter(
    (c) =>
      c.status === "pending" ||
      c.status === "enroute" ||
      c.status === "on_scene" ||
      c.status === "active"
  ).length;
  const resolvedCount = cases.filter(
    (c) => c.status === "done" || c.status === "resolved"
  ).length;
  const headerTopPad = insets.top + (Platform.OS === "android" ? 4 : spacing.sm);

  return (
    <View style={styles.root}>
      <ResponderCallPanel responderId={authUid} />
      <StatusBar
        style={resolvedScheme === "dark" ? "light" : "dark"}
        backgroundColor={D.bgBottom}
      />

      <LinearGradient
        colors={[D.bgTop, D.bgMid, D.bgBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={D.accent}
            colors={[D.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[D.headerGlowTop, D.bgMid, "transparent"]}
          locations={[0, 0.55, 1]}
          style={[styles.hero, { paddingTop: headerTopPad }]}
        >
          <View style={styles.heroDecor} pointerEvents="none">
            <Svg width="100%" height={130} style={styles.heroSvg}>
              <Defs>
                <RadialGradient id="dashGlow" cx="50%" cy="0%" rx="65%" ry="55%">
                  <Stop offset="0%" stopColor={D.decorRadialStart} />
                  <Stop offset="55%" stopColor={D.decorRadialEnd} />
                </RadialGradient>
              </Defs>
              <Circle cx="75%" cy="18" r="120" fill="url(#dashGlow)" />
              <Circle
                cx="18%"
                cy="40%"
                r="56"
                stroke={D.decorArc}
                strokeWidth={1}
                fill="none"
              />
              <Circle
                cx="20%"
                cy="42%"
                r="78"
                stroke={D.decorArc}
                strokeOpacity={0.35}
                strokeWidth={1}
                fill="none"
              />
              <Path
                d="M 0 120 Q 140 72 280 118 T 420 104"
                stroke={D.decorArc}
                strokeOpacity={0.2}
                strokeWidth={1}
                fill="none"
              />
              <Circle cx="88%" cy="64%" r="3" fill={D.decorDot} />
              <Circle cx="12%" cy="68%" r="2" fill={D.decorDot} opacity={0.55} />
            </Svg>
          </View>

          <View style={styles.brandRow}>
            <Image
              source={require("../../../../assets/images/resq-link-logo.png")}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="RES.Q"
            />
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>
                {locationPaused ? "Idle" : "Live"}
              </Text>
            </View>
          </View>

          <View style={styles.identityCard}>
            <LinearGradient
              colors={[D.identityShine, D.surfaceCardInner]}
              style={styles.identityGradient}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{identity.initials}</Text>
              </View>
              <View style={styles.identityBody}>
                <Text style={styles.nameLine} numberOfLines={1}>
                  {identity.displayName}
                </Text>
                <Text style={styles.emailLine} numberOfLines={1}>
                  {identity.email || "—"}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </LinearGradient>

        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <StatCard
              label="Active"
              value={String(activeCount)}
              Icon={Activity}
              accent={D.statActive}
              topTint={D.statCardActiveTop}
              iconWellBg={D.statCardActiveIconBg}
            />
            <StatCard
              label="Done"
              value={String(resolvedCount)}
              Icon={CheckCircle2}
              accent={D.statResolved}
              topTint={D.statCardResolvedTop}
              iconWellBg={D.statCardResolvedIconBg}
            />
            <StatCard
              label="Online"
              value={String(onlineResponderCount)}
              Icon={Radio}
              accent={D.statOnline}
              topTint={D.statCardOnlineTop}
              iconWellBg={D.statCardOnlineIconBg}
            />
          </View>
        </View>

        <View style={[styles.mainBlock, { paddingHorizontal: spacing.lg }]}>
          {cases.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyOrb}>
                <Animated.View
                  style={[
                    styles.pulseRing,
                    styles.pulseRingOuter,
                    {
                      opacity: pulseOuterOpacity,
                      transform: [{ scale: pulseOuterScale }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.pulseRing,
                    styles.pulseRingMid,
                    {
                      opacity: pulseMidOpacity,
                      transform: [{ scale: pulseMidScale }],
                    },
                  ]}
                />
                <LinearGradient
                  colors={[D.surfaceCard, D.surfaceCardInner]}
                  style={styles.emptyIconDisc}
                >
                  <ClipboardList size={22} color={D.accentBright} strokeWidth={2} />
                </LinearGradient>
              </View>

              <Text style={styles.emptyTitle}>No cases</Text>
              <Text style={styles.emptySubtitle}>Awaiting dispatch</Text>
            </View>
          ) : (
            cases.map((caseData) => (
              <CaseCard
                key={caseData.id}
                case={caseData}
                onPress={() => handleCasePress(caseData)}
                onStatusUpdate={handleCaseStatusUpdate}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
