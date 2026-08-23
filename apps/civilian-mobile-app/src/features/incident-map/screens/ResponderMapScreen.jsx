import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import MapView from "react-native-maps";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { MapPin } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useMapScreen } from "@/features/incident-map/hooks/useMapScreen";
import MyEmergencyHeader from "@/features/incident-map/components/MyEmergencyHeader";
import MapEmptyStateSheet from "@/features/incident-map/components/MapEmptyStateSheet";
import MapIncidentSheet from "@/features/incident-map/components/MapIncidentSheet";
import MapFloatingButtons from "@/features/incident-map/components/MapFloatingButtons";
import {
  MapDataErrorBanner,
  MapLocationBanner,
} from "@/features/incident-map/components/MapStatusBanner";
import {
  IncidentMapMarker,
  IncidentRadiusCircle,
  getMarkerDistanceLabel,
} from "@/features/incident-map/components/MapMarkers";
import { coordFrom } from "@/features/incident-map/utils/mapUtils";
import {
  canRenderGoogleMapsProvider,
  getNativeMapProvider,
} from "@/utils/nativeMapConfig";

const DEFAULT_REGION = {
  latitude: 17.6132,
  longitude: 121.727,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const SHEET_SNAP_LABELS = {
  empty: ["Safety summary", "Expanded safety info"],
  incident: ["Timeline summary", "Expanded timeline", "Full timeline and actions"],
};

const FAB_STACK_HEIGHT = 48;
const FAB_SHEET_GAP = 16;

export default function ResponderMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const focusReportId =
    typeof params.reportId === "string" ? params.reportId : undefined;
  const { colors, isLight, mapTheme: theme } = useAppTheme();
  const canRenderMap = canRenderGoogleMapsProvider();
  const mapProvider = getNativeMapProvider();
  const mapRef = useRef(null);
  const sheetRef = useRef(null);
  const reduceMotionRef = useRef(false);

  const [locationBannerDismissed, setLocationBannerDismissed] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapStageHeight, setMapStageHeight] = useState(0);

  const {
    refresh,
    userLocation,
    locationError,
    dataError,
    hasTimedOut,
    isIncidentMode,
    liveReport,
    recenterToUser,
  } = useMapScreen({ focusReportId });

  const snapPoints = useMemo(
    () => (isIncidentMode ? ["24%", "48%", "72%"] : ["28%", "52%"]),
    [isIncidentMode]
  );

  const snapFractions = useMemo(
    () => (isIncidentMode ? [0.24, 0.48, 0.72] : [0.28, 0.52]),
    [isIncidentMode]
  );

  const sheetHeight = mapStageHeight * (snapFractions[sheetIndex] ?? snapFractions[0]);

  const fabStackHeight = FAB_STACK_HEIGHT;
  const fabBottom = sheetHeight + FAB_SHEET_GAP;

  const incidentCoord = useMemo(() => {
    if (!liveReport) return null;
    return coordFrom(liveReport.latitude, liveReport.longitude);
  }, [liveReport]);

  const fitMapToPersonalView = useCallback(() => {
    const coords = [];
    if (userLocation) coords.push(userLocation);
    if (isIncidentMode && incidentCoord) coords.push(incidentCoord);

    if (!mapRef.current || coords.length === 0) return;

    const animated = !reduceMotionRef.current;
    const bottomPadding = sheetHeight + fabStackHeight + 80;

    if (coords.length === 1) {
      mapRef.current.animateToRegion(
        {
          ...coords[0],
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        },
        animated ? 450 : 0
      );
      return;
    }

    mapRef.current.fitToCoordinates(coords, {
      edgePadding: {
        top: 56,
        right: 72,
        bottom: bottomPadding,
        left: 48,
      },
      animated,
    });
  }, [fabStackHeight, incidentCoord, isIncidentMode, sheetHeight, userLocation]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
  }, []);

  useEffect(() => {
    if (mapStageHeight > 0) {
      fitMapToPersonalView();
    }
  }, [fitMapToPersonalView, isIncidentMode, liveReport?.id, mapStageHeight]);

  useEffect(() => {
    sheetRef.current?.snapToIndex(isIncidentMode ? 1 : 0);
  }, [isIncidentMode, liveReport?.id]);

  const handleRecenter = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const coord = await recenterToUser();
    if (coord && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...coord,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        reduceMotionRef.current ? 0 : 400
      );
    }
  }, [recenterToUser]);

  const handleReportEmergency = useCallback(() => {
    router.push("/emergency-form");
  }, [router]);

  const handleMapLongPress = useCallback(
    (event) => {
      if (isIncidentMode) return;
      const { latitude, longitude } = event.nativeEvent.coordinate;
      router.push({
        pathname: "/emergency-form",
        params: {
          lat: String(latitude),
          lng: String(longitude),
        },
      });
    },
    [isIncidentMode, router]
  );

  const handleSheetChange = useCallback(
    (index) => {
      setSheetIndex(index);
      const labels = isIncidentMode
        ? SHEET_SNAP_LABELS.incident
        : SHEET_SNAP_LABELS.empty;
      const label = labels[index] ?? labels[0];
      AccessibilityInfo.announceForAccessibility(label);
    },
    [isIncidentMode]
  );

  const handleMapStageLayout = useCallback((event) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0) {
      setMapStageHeight(nextHeight);
    }
  }, []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={isIncidentMode ? 2 : 1}
        disappearsOnIndex={isIncidentMode ? 1 : 0}
        opacity={0.35}
      />
    ),
    [isIncidentMode]
  );

  const navClearance = insets.bottom + 108;
  const bannerTopOffset = 12;

  const showDataError = Boolean(dataError) || hasTimedOut;
  const dataErrorMessage = dataError
    || (hasTimedOut ? "Loading is taking longer than expected — Tap to retry" : null);

  const showLocationBanner =
    Boolean(locationError) && !locationBannerDismissed;

  const initialRegion = userLocation
    ? {
        ...userLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : incidentCoord
      ? {
          ...incidentCoord,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }
      : DEFAULT_REGION;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={theme.background} />

      <View
        style={[
          styles.topChrome,
          {
            paddingTop: insets.top + 6,
            paddingHorizontal: 16,
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <MyEmergencyHeader
          theme={theme}
          report={liveReport}
          isLight={isLight}
          isIncidentMode={isIncidentMode}
        />
      </View>

      <View style={styles.mapStage} onLayout={handleMapStageLayout}>
        {canRenderMap ? (
          <MapView
            ref={mapRef}
            provider={mapProvider}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            onLongPress={handleMapLongPress}
            accessibilityLabel={
              isIncidentMode
                ? "Personal emergency tracking map"
                : "Your location map"
            }
          >
            {isIncidentMode && incidentCoord ? (
              <>
                <IncidentRadiusCircle coordinate={incidentCoord} />
                <IncidentMapMarker
                  coordinate={incidentCoord}
                  distanceLabel={getMarkerDistanceLabel(
                    userLocation,
                    incidentCoord.latitude,
                    incidentCoord.longitude
                  )}
                />
              </>
            ) : null}
          </MapView>
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.mapUnavailable,
              { backgroundColor: theme.card },
            ]}
          >
            <MapPin size={28} color={theme.textSecondary} />
            <Text style={[styles.mapUnavailableTitle, { color: theme.text }]}>Map unavailable</Text>
            <Text style={[styles.mapUnavailableText, { color: theme.textSecondary }]}>Add a Google Maps API key to this build.</Text>
          </View>
        )}

        {showDataError ? (
          <MapDataErrorBanner
            theme={theme}
            message={dataErrorMessage || "Couldn't load your emergency — Tap to retry"}
            onRetry={refresh}
            topOffset={bannerTopOffset}
          />
        ) : null}

        {showLocationBanner ? (
          <MapLocationBanner
            theme={theme}
            topOffset={bannerTopOffset}
            onEnableLocation={() => Linking.openSettings()}
            onDismiss={() => setLocationBannerDismissed(true)}
          />
        ) : null}

        <MapFloatingButtons
          theme={theme}
          bottomOffset={fabBottom}
          onRecenter={handleRecenter}
        />

        <BottomSheet
          key={isIncidentMode ? "incident-sheet" : "empty-sheet"}
          ref={sheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          backdropComponent={renderBackdrop}
          onChange={handleSheetChange}
          handleIndicatorStyle={{ backgroundColor: theme.sheetHandle, width: 44 }}
          backgroundStyle={{
            backgroundColor: theme.sheetBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
          style={styles.sheet}
        >
          {isIncidentMode && liveReport ? (
            <MapIncidentSheet
              theme={theme}
              isLight={isLight}
              report={liveReport}
              bottomInset={navClearance}
            />
          ) : (
            <MapEmptyStateSheet
              theme={theme}
              isLight={isLight}
              bottomInset={navClearance}
              onReportEmergency={handleReportEmergency}
            />
          )}
        </BottomSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topChrome: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  mapStage: {
    flex: 1,
    position: "relative",
  },
  mapUnavailable: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mapUnavailableTitle: {
    marginTop: 10,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    textAlign: "center",
  },
  mapUnavailableText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  sheet: {
    zIndex: 30,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 18,
  },
});
