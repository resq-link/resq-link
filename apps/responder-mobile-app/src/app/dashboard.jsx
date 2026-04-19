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
import useUserStore from "@/utils/userStore";
import {
  subscribeToDispatcherAssignedEmergencies,
  subscribeToOnlineResponderCount,
  getFirebaseAuth,
  updateDispatcherLocation,
  setDispatcherOnlineStatus,
} from "@packages/firebase";
import * as Location from "expo-location";
import { LOCATION_PAUSED_KEY } from "./location";
import CaseCard from "@/components/CaseCard";
import LoadingScreen from "@/components/LoadingScreen";
import { spacing, useResqTheme } from "@/theme";
import {
  opsDashboardThemeDark,
  opsDashboardThemeLight,
} from "@/theme/opsDashboardTheme";
function titleCaseWords(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatResponderName(email) {
  if (!email) return "Responder";
  const local = email.split("@")[0] || "";
  const cleaned = local.replace(/[^a-zA-Z0-9._-]/g, " ").trim();
  const words = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) return titleCaseWords(words.join(" "));
  if (words.length === 1) return titleCaseWords(words[0]);
  return "Responder";
}

/**
 * Avatar initials (max 2). Emails with no "." in the local part used to duplicate the first
 * letter (e.g. bfp@agency.gov → "BB"); use the first two alphanumeric letters instead (→ "BF").
 */
function initialsFromEmail(email) {
  if (!email) return "R";
  const local = email.split("@")[0] || "";
  const dot = local.indexOf(".");
  if (dot > 0) {
    const a = local.charAt(0).toUpperCase();
    const afterDot = local.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, "");
    const b = afterDot.charAt(0).toUpperCase();
    return (a + (b || a)).slice(0, 2);
  }
  const alnum = local.replace(/[^a-zA-Z0-9]/g, "");
  if (alnum.length >= 2) {
    return alnum.slice(0, 2).toUpperCase();
  }
  if (alnum.length === 1) {
    const c = alnum.charAt(0).toUpperCase();
    return (c + c).slice(0, 2);
  }
  return "R";
}

export default function DashboardScreen() {
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
  const { user } = useUserStore();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationPaused, setLocationPaused] = useState(false);
  /** Live count from RTDB presence (preferred) or Firestore `isOnline` fallback — see @packages/firebase responderPresence */
  const [onlineResponderCount, setOnlineResponderCount] = useState(0);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { resolvedScheme } = useResqTheme();
  const D = useMemo(
    () =>
      resolvedScheme === "dark"
        ? opsDashboardThemeDark
        : opsDashboardThemeLight,
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
      return;
    }

    const unsubscribe = subscribeToDispatcherAssignedEmergencies(
      firebaseUser.uid,
      (reports) => {
        setCases(reports);
        setLoading(false);
        setRefreshing(false);
      },
      { statusFilter: "all", limitCount: 100 }
    );

    return () => unsubscribe();
  }, [user, router]);

  // Real-time aggregate: only responder-designated accounts (presence written in beginResponderRealtimePresence).
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToOnlineResponderCount(setOnlineResponderCount);
    return unsub;
  }, [user]);

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

  useEffect(() => {
    if (!user) return;
    if (locationPaused) return;
    const firebaseUser = getFirebaseAuth().currentUser;
    if (!firebaseUser) return;

    let locationSubscription = null;
    let locationUpdateInterval = null;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        await setDispatcherOnlineStatus(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        await updateDispatcherLocation(
          location.coords.latitude,
          location.coords.longitude
        );

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 30000,
            distanceInterval: 50,
          },
          async (loc) => {
            try {
              await updateDispatcherLocation(
                loc.coords.latitude,
                loc.coords.longitude
              );
            } catch (e) {
              console.error("Error updating location:", e);
            }
          }
        );

        locationUpdateInterval = setInterval(async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            await updateDispatcherLocation(
              loc.coords.latitude,
              loc.coords.longitude
            );
          } catch (e) {
            console.error("Error updating location:", e);
          }
        }, 60000);
      } catch (e) {
        console.error("Error setting up location tracking:", e);
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (locationUpdateInterval) clearInterval(locationUpdateInterval);
      setDispatcherOnlineStatus(false).catch(console.error);
    };
  }, [user, locationPaused]);

  const onRefresh = () => setRefreshing(true);
  const handleCasePress = (caseData) => {
    router.push({ pathname: "/case-detail", params: { caseId: caseData.id } });
  };
  const handleCaseStatusUpdate = (caseId, status) => {
    if (!caseId || !status) return;
    setCases((currentCases) =>
      currentCases.map((caseData) =>
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
  if (loading) {
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
              source={require("../../assets/images/resq-link-logo.png")}
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

function buildDashboardStyles(D) {
  const light = D.visualScheme === "light";
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D.bgBottom,
  },
  scroll: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    overflow: "hidden",
  },
  heroDecor: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  heroSvg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  logo: {
    width: 104,
    height: 30,
    marginLeft: -2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: D.accentSoft,
    borderWidth: 1,
    borderColor: D.borderAccent,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: D.liveDot,
    borderWidth: 1,
    borderColor: D.liveBorder,
  },
  liveBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: D.textPrimary,
    letterSpacing: 0.15,
  },
  identityCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: D.borderSubtle,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  identityGradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: D.avatarBg,
    borderWidth: 1,
    borderColor: D.avatarBorder,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: D.textPrimary,
    letterSpacing: 0.3,
  },
  identityBody: {
    flex: 1,
    minWidth: 0,
  },
  nameLine: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: D.textPrimary,
    marginBottom: 2,
  },
  emailLine: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: D.textMuted,
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCardOuter: {
    flex: 1,
    minHeight: light ? 84 : 78,
    borderRadius: light ? 14 : 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: light ? "rgba(15, 23, 42, 0.10)" : D.borderSubtle,
    shadowColor: light ? "#0B1220" : "#000",
    shadowOffset: { width: 0, height: light ? 2 : 4 },
    shadowOpacity: light ? 0.07 : 0.22,
    shadowRadius: light ? 12 : 8,
    elevation: light ? 3 : 4,
  },
  statCardGradient: {
    flex: 1,
    paddingHorizontal: light ? 11 : 10,
    paddingVertical: light ? 11 : 10,
    justifyContent: "center",
  },
  statIconWell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: light ? 8 : 6,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 24,
    flexShrink: 0,
  },
  statLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: D.textSecondary,
    letterSpacing: 0.2,
  },
  mainBlock: {
    marginTop: spacing.lg,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  emptyOrb: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  pulseRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: D.emptyPulseStroke,
    borderRadius: 999,
  },
  pulseRingOuter: {
    width: 112,
    height: 112,
  },
  pulseRingMid: {
    width: 94,
    height: 94,
  },
  emptyIconDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: D.borderAccent,
    shadowColor: D.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: D.textPrimary,
    marginBottom: 4,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: D.textSecondary,
    textAlign: "center",
  },
  });
}
