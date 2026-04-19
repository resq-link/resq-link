import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import {
  Crosshair,
  Radio,
  Filter,
  ChevronRight,
  ExternalLink,
  ClipboardList,
  AlertCircle,
} from "lucide-react-native";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import { subscribeToDispatcherAssignedEmergencies } from "@packages/firebase";
import LoadingScreen from "@/components/LoadingScreen";
import { Image } from "expo-image";
import { radii, spacing, useResqTheme } from "@/theme";
import { getMapTheme, MAP_DARK_STYLE, MAP_LIGHT_STYLE } from "@/theme/mapTheme";

const { height: SCREEN_H } = Dimensions.get("window");
/** Default / collapsed cap (same as previous single maxHeight). */
const SHEET_COLLAPSED_MAX = Math.min(SCREEN_H * 0.34, 248);
/** Expanded height when user drags the handle up — was fixed at collapsed with no gesture. */
const SHEET_EXPANDED_MAX = Math.min(SCREEN_H * 0.52, 480);
const NAV_CLEARANCE = 72;

const LOGO = require("../../assets/images/resq-link-logo.png");

function distanceKm(from, to) {
  if (!from || !to) return null;
  const R = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatReported(createdAt) {
  const d = toDate(createdAt);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const getIncidentTypeName = (incidentType, short = false) => {
  const typeMap = {
    fire: short ? "Fire" : "Fire",
    medical: short ? "Medical" : "Medical Emergency",
    vehicular_accident: short ? "Vehicular" : "Vehicular Accident",
    police_emergency: short ? "Police" : "Police Emergency",
    electrical_powerline_hazard: short ? "Electrical" : "Electrical / Powerline Hazard",
    other_emergency: short ? "Other" : "Other Emergency",
  };
  return typeMap[incidentType] || "Emergency";
};

function isActiveIncident(status) {
  return ["pending", "active", "enroute", "on_scene"].includes(status);
}

function isResolved(status) {
  return status === "done" || status === "resolved";
}

/**
 * Use native `pinColor` only (no custom Marker children).
 * Custom Views/SVG are rasterized as bitmaps on Android and often clip to a sector
 * (“pizza slice”) or triangle; the Maps SDK’s built-in pins avoid that path entirely.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef(null);
  const { user } = useUserStore();
  const { t: D, colors, statusBarStyle, resolvedScheme } = useResqTheme();
  const M = useMemo(() => getMapTheme(D), [D]);
  const mapTileStyle =
    resolvedScheme === "dark" ? MAP_DARK_STYLE : MAP_LIGHT_STYLE;

  const pinColorFor = useCallback(
    (priority, status, selected) => {
      if (selected) return D.accent;
      if (isResolved(status)) return D.mapPinResolved;
      if (priority === "critical" || status === "pending") return colors.pending;
      return colors.info;
    },
    [D.accent, D.mapPinResolved, colors]
  );

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [activeOnly, setActiveOnly] = useState(false);
  /** Native blue dot / accuracy ring — no custom bitmap snapshot issues */
  const [showUserOnMap, setShowUserOnMap] = useState(false);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const initialCenter = useRef({
    latitude: 17.6132,
    longitude: 121.727,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Location off");
          setShowUserOnMap(false);
          return;
        }
        setShowUserOnMap(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });
        initialCenter.current = {
          latitude,
          longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        };
        mapRef.current?.animateToRegion(initialCenter.current, 600);
      } catch {
        setLocationError("GPS unavailable");
        setShowUserOnMap(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const unsubscribe = subscribeToDispatcherAssignedEmergencies(
      user.uid,
      (reports) => {
        setCases(reports);
        const mapped = reports.filter(
          (c) =>
            c.latitude != null &&
            c.longitude != null &&
            c.latitude !== 0 &&
            c.longitude !== 0
        );
        if (mapped.length > 0 && !userLocation) {
          const first = mapped[0];
          const r = {
            latitude: first.latitude,
            longitude: first.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          };
          initialCenter.current = r;
          mapRef.current?.animateToRegion(r, 500);
        }
        setLoading(false);
      },
      { statusFilter: "all", limitCount: 100 }
    );

    return () => unsubscribe();
  }, [user, router]);

  const casesWithLocation = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.latitude != null &&
          c.longitude != null &&
          c.latitude !== 0 &&
          c.longitude !== 0
      ),
    [cases]
  );

  const visibleMarkers = useMemo(() => {
    if (!activeOnly) return casesWithLocation;
    return casesWithLocation.filter((c) => isActiveIncident(c.status));
  }, [casesWithLocation, activeOnly]);

  const activeCount = useMemo(
    () => casesWithLocation.filter((c) => isActiveIncident(c.status)).length,
    [casesWithLocation]
  );

  const centerOnCase = useCallback((c) => {
    if (!c?.latitude || !c?.longitude) return;
    mapRef.current?.animateToRegion(
      {
        latitude: c.latitude,
        longitude: c.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      400
    );
  }, []);

  const handleSelectCase = useCallback(
    (c) => {
      setSelectedCase(c);
      centerOnCase(c);
    },
    [centerOnCase]
  );

  const handleMyLocation = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      setShowUserOnMap(true);
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        450
      );
      setLocationError(null);
    } catch {
      setLocationError("GPS unavailable");
      setShowUserOnMap(false);
    }
  }, []);

  const openNavigate = useCallback((c) => {
    if (!c?.latitude || !c?.longitude) return;
    const { latitude, longitude } = c;
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });
    Linking.openURL(url).catch(() =>
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      )
    );
  }, []);

  const openCaseDetail = useCallback(
    (c) => {
      if (!c?.id) return;
      router.push({ pathname: "/case-detail", params: { caseId: c.id } });
    },
    [router]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: D.bg,
        },
        header: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          zIndex: 20,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        },
        brandLockup: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          marginRight: spacing.xs,
          minWidth: 0,
        },
        logoFrame: {
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: D.surfaceCard,
          borderWidth: 1,
          borderColor: D.borderStrong,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          ...Platform.select({
            android: { elevation: 3 },
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
          }),
        },
        logo: {
          width: 30,
          height: 30,
        },
        headerTitleBlock: {
          flex: 1,
          minWidth: 0,
          justifyContent: "center",
        },
        headerTitle: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 19,
          letterSpacing: -0.4,
          color: D.text,
        },
        headerSubtitle: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 11,
          color: D.textSecondary,
          marginTop: 1,
          lineHeight: 14,
        },
        bfpBadge: {
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: radii.md,
          backgroundColor: D.accentSubtle,
          borderWidth: 1,
          borderColor: M.accentBorder,
        },
        bfpBadgeText: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 11,
          letterSpacing: 1,
          color: M.accent,
        },
        headerMeta: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: spacing.sm,
          gap: spacing.sm,
        },
        syncPill: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        syncText: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 10,
          color: D.textMuted,
        },
        filterChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingHorizontal: spacing.sm,
          paddingVertical: 5,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: M.accentBorder,
          backgroundColor: D.accentSubtle,
        },
        filterChipOn: {
          backgroundColor: M.accent,
          borderColor: M.accent,
        },
        filterLabel: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 10,
          color: M.accent,
        },
        filterLabelOn: {
          color: D.mapFabIconOnAccent,
        },
        headerHairline: {
          height: 1,
          marginTop: spacing.sm,
          backgroundColor: D.divider,
          opacity: 0.9,
        },
        mapWrap: {
          flex: 1,
          backgroundColor: D.surface,
        },
        /** Keeps RN touch order predictable vs overlays (Android Map uses a native surface). */
        mapNativeUnderlay: {
          zIndex: 0,
          ...(Platform.OS === "android" ? { elevation: 0 } : {}),
        },
        /** All interactive chrome above the map — peers must sit here or touches can miss on Android. */
        mapOverlayLayer: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 20,
          ...(Platform.OS === "android" ? { elevation: 44 } : {}),
          pointerEvents: "box-none",
        },
        floatingTools: {
          position: "absolute",
          right: spacing.lg,
          zIndex: 15,
          gap: spacing.sm,
        },
        toolBtnPrimary: {
          width: 46,
          height: 46,
          borderRadius: 14,
          backgroundColor: M.accent,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.15)",
        },
        errorBanner: {
          position: "absolute",
          left: spacing.lg,
          right: spacing.lg,
          top: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: D.alertAccent,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: radii.lg,
          zIndex: 30,
        },
        errorText: {
          flex: 1,
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          color: D.white,
        },
        sheet: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: M.sheetBg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderWidth: 1,
          borderColor: M.sheetBorder,
          paddingTop: spacing.xs,
          paddingHorizontal: spacing.md,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: resolvedScheme === "light" ? 0.12 : 0.45,
          shadowRadius: 16,
          ...(Platform.OS === "android"
            ? { elevation: 46, zIndex: 30 }
            : { zIndex: 30 }),
        },
        sheetHandleHit: {
          width: "100%",
          minHeight: 44,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 10,
          marginBottom: spacing.xs,
        },
        sheetHandle: {
          width: 36,
          height: 3,
          borderRadius: 2,
          backgroundColor: D.switchTrackOff,
        },
        sheetEmptyScrollContent: {
          paddingBottom: spacing.sm,
        },
        sheetInner: {
          paddingBottom: spacing.sm,
          gap: spacing.xs,
        },
        sheetTitle: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 15,
          color: D.text,
          marginTop: 2,
        },
        sheetBody: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          lineHeight: 16,
          color: D.textSecondary,
        },
        chipRow: {
          gap: spacing.sm,
          paddingVertical: 4,
        },
        caseChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: 8,
          borderRadius: radii.lg,
          backgroundColor: D.surfaceIconMuted,
          borderWidth: 1,
          borderColor: M.accentBorder,
          maxWidth: 200,
        },
        caseChipTitle: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 12,
          color: D.text,
          flexShrink: 1,
        },
        detailScroll: {
          paddingBottom: spacing.sm,
          gap: spacing.xs,
        },
        detailHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        },
        detailType: {
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 16,
          color: D.text,
          flex: 1,
        },
        urgentChip: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radii.sm,
          backgroundColor: D.amberMuted,
          borderWidth: 1,
          borderColor: D.alertMuted,
        },
        urgentChipText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 9,
          letterSpacing: 0.5,
          color: colors.pending,
        },
        detailLocation: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 12,
          lineHeight: 17,
          color: D.textSecondary,
        },
        detailMetaLine: {
          fontFamily: "SpaceGrotesk_400Regular",
          fontSize: 11,
          lineHeight: 15,
          color: D.textMuted,
          marginTop: 4,
        },
        actionRow: {
          flexDirection: "row",
          gap: spacing.sm,
          marginTop: spacing.sm,
        },
        btnSecondary: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 11,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: M.accentBorder,
          backgroundColor: D.accentSubtle,
        },
        btnSecondaryText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: M.accent,
        },
        btnPrimary: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 11,
          borderRadius: radii.lg,
          backgroundColor: M.accent,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        },
        btnPrimaryText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: D.mapFabIconOnAccent,
        },
        clearSelect: {
          alignItems: "center",
          paddingVertical: 6,
          marginTop: 2,
        },
        clearSelectText: {
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 11,
          color: D.textMuted,
        },
      }),
    [D, M, colors, resolvedScheme]
  );

  const sheetBottomPad = insets.bottom + NAV_CLEARANCE;

  const sheetMax = useSharedValue(SHEET_COLLAPSED_MAX);
  const gestureStartSheetMax = useSharedValue(SHEET_COLLAPSED_MAX);

  const sheetPanGesture = useMemo(
    () =>
      Gesture.Pan()
        /** Slightly higher so a quick tap does not activate pan (tap toggles instead). */
        .activeOffsetY([-14, 14])
        .failOffsetX([-32, 32])
        .onStart(() => {
          gestureStartSheetMax.value = sheetMax.value;
        })
        .onUpdate((e) => {
          const next =
            gestureStartSheetMax.value - e.translationY;
          sheetMax.value = Math.max(
            SHEET_COLLAPSED_MAX,
            Math.min(SHEET_EXPANDED_MAX, next)
          );
        })
        .onEnd((e) => {
          const mid = (SHEET_COLLAPSED_MAX + SHEET_EXPANDED_MAX) / 2;
          let dest =
            sheetMax.value > mid ? SHEET_EXPANDED_MAX : SHEET_COLLAPSED_MAX;
          if (e.velocityY < -650) dest = SHEET_EXPANDED_MAX;
          if (e.velocityY > 650) dest = SHEET_COLLAPSED_MAX;
          sheetMax.value = withSpring(dest, { damping: 18, stiffness: 210 });
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable for the component lifetime
    []
  );

  /** Tap handle: expand if collapsed, collapse if expanded (exclusive with pan). */
  const sheetTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(14)
        .onEnd(() => {
          const mid = (SHEET_COLLAPSED_MAX + SHEET_EXPANDED_MAX) / 2;
          const expand = sheetMax.value <= mid;
          sheetMax.value = withSpring(
            expand ? SHEET_EXPANDED_MAX : SHEET_COLLAPSED_MAX,
            { damping: 18, stiffness: 210 }
          );
        }),
    []
  );

  const sheetHandleGesture = useMemo(
    () => Gesture.Exclusive(sheetPanGesture, sheetTapGesture),
    [sheetPanGesture, sheetTapGesture]
  );

  const animatedSheetStyle = useAnimatedStyle(() => ({
    maxHeight: sheetMax.value,
  }));

  if (!fontsLoaded) return null;
  if (loading) {
    return <LoadingScreen title="Loading map…" subtitle="" />;
  }

  let headerSub = "";
  if (casesWithLocation.length === 0) headerSub = "No pins";
  else headerSub = `${casesWithLocation.length} · ${activeCount} active`;
  if (userLocation) headerSub += " · GPS";

  const routeCoords =
    selectedCase &&
    userLocation &&
    selectedCase.latitude &&
    selectedCase.longitude
      ? [
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          {
            latitude: selectedCase.latitude,
            longitude: selectedCase.longitude,
          },
        ]
      : null;

  const selectedDistance =
    selectedCase && userLocation
      ? distanceKm(userLocation, {
          latitude: selectedCase.latitude,
          longitude: selectedCase.longitude,
        })
      : null;

  return (
    <View style={styles.root}>
      <StatusBar style={statusBarStyle} />

      <LinearGradient
        colors={[D.bgElevated, D.bg]}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandLockup}>
            <View style={styles.logoFrame}>
              <Image
                source={LOGO}
                style={styles.logo}
                contentFit="contain"
                accessibilityLabel="RES.Q"
              />
            </View>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle}>Map</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {headerSub}
              </Text>
            </View>
          </View>

          <View style={styles.bfpBadge}>
            <Text style={styles.bfpBadgeText}>BFP</Text>
          </View>
        </View>

        <View style={styles.headerMeta}>
          <View style={styles.syncPill}>
            <Radio size={13} color={M.accent} strokeWidth={2} />
            <Text style={styles.syncText}>Sync</Text>
          </View>
          <TouchableOpacity
            style={[styles.filterChip, activeOnly && styles.filterChipOn]}
            onPress={() => setActiveOnly((v) => !v)}
            activeOpacity={0.85}
          >
            <Filter
              size={13}
              color={activeOnly ? D.mapFabIconOnAccent : M.accent}
              strokeWidth={2.2}
            />
            <Text
              style={[styles.filterLabel, activeOnly && styles.filterLabelOn]}
            >
              Active
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerHairline} />
      </LinearGradient>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={[StyleSheet.absoluteFill, styles.mapNativeUnderlay]}
          initialRegion={initialCenter.current}
          customMapStyle={mapTileStyle}
          showsUserLocation={showUserOnMap && !locationError}
          showsMyLocationButton={false}
          showsPointsOfInterest={false}
          toolbarEnabled={false}
          mapType="standard"
        >
          {routeCoords && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={M.lineRouteAlt}
              strokeWidth={3}
              lineDashPattern={[8, 6]}
            />
          )}

          {visibleMarkers.map((caseData) => {
            const sel = selectedCase?.id === caseData.id;
            return (
              <Marker
                key={caseData.id}
                coordinate={{
                  latitude: caseData.latitude,
                  longitude: caseData.longitude,
                }}
                title={getIncidentTypeName(caseData.incidentType, true)}
                description={caseData.locationText || undefined}
                pinColor={pinColorFor(
                  caseData.priority || "medium",
                  caseData.status,
                  sel
                )}
                onPress={() => handleSelectCase(caseData)}
                zIndex={sel ? 50 : 10}
              />
            );
          })}
        </MapView>

        <View style={styles.mapOverlayLayer}>
          <View
          style={[styles.floatingTools, { top: insets.top + 124 }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.toolBtnPrimary}
            onPress={handleMyLocation}
            activeOpacity={0.88}
            accessibilityLabel="Center map on my location"
          >
            <Crosshair size={20} color={D.mapFabIconOnAccent} strokeWidth={2.4} />
          </TouchableOpacity>
          </View>

          {locationError && (
          <View style={styles.errorBanner} pointerEvents="auto">
            <AlertCircle size={16} color="#fff" />
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
          )}

          <Animated.View
          collapsable={false}
          pointerEvents="auto"
          style={[
            styles.sheet,
            animatedSheetStyle,
            { paddingBottom: sheetBottomPad },
          ]}
        >
          <GestureDetector gesture={sheetHandleGesture}>
            <View
              style={styles.sheetHandleHit}
              accessibilityRole="adjustable"
              accessibilityLabel="Resize map info panel"
            >
              <View style={styles.sheetHandle} />
            </View>
          </GestureDetector>

          {!selectedCase && casesWithLocation.length === 0 && (
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetEmptyScrollContent}
            >
              <View style={styles.sheetInner}>
                <ClipboardList size={22} color={M.accent} strokeWidth={2} />
                <Text style={styles.sheetTitle}>No map pins</Text>
                <Text style={styles.sheetBody}>
                  {cases.length === 0
                    ? "Awaiting dispatch."
                    : `${cases.length - casesWithLocation.length} no coords.`}
                </Text>
              </View>
            </ScrollView>
          )}

          {!selectedCase && casesWithLocation.length > 0 && (
            <View style={styles.sheetInner}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {visibleMarkers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.caseChip}
                    onPress={() => handleSelectCase(c)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.caseChipTitle} numberOfLines={1}>
                      {getIncidentTypeName(c.incidentType, true)}
                    </Text>
                    <ChevronRight size={14} color={M.accent} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {selectedCase && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailScroll}
            >
              <View style={styles.detailHeader}>
                <Text style={styles.detailType}>
                  {getIncidentTypeName(selectedCase.incidentType, true)}
                </Text>
                {isActiveIncident(selectedCase.status) && (
                  <View style={styles.urgentChip}>
                    <Text style={styles.urgentChipText}>Live</Text>
                  </View>
                )}
              </View>
              <Text style={styles.detailLocation} numberOfLines={2}>
                {selectedCase.locationText || "—"}
              </Text>
              <Text style={styles.detailMetaLine} numberOfLines={1}>
                {(selectedCase.status || "—").replace(/_/g, " ")} ·{" "}
                {formatDistance(selectedDistance)} ·{" "}
                {formatReported(selectedCase.createdAt)} ·{" "}
                {(selectedCase.priority || "med").toUpperCase()}
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => openCaseDetail(selectedCase)}
                  activeOpacity={0.88}
                >
                  <ClipboardList size={16} color={M.accent} />
                  <Text style={styles.btnSecondaryText}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => openNavigate(selectedCase)}
                  activeOpacity={0.88}
                >
                  <ExternalLink size={16} color={D.mapFabIconOnAccent} />
                  <Text style={styles.btnPrimaryText}>Go</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.clearSelect}
                onPress={() => setSelectedCase(null)}
                hitSlop={{ top: 8, bottom: 8 }}
              >
                <Text style={styles.clearSelectText}>Clear</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
