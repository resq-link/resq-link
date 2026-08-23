import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  ChevronRight,
  Clock,
  Contact,
  History,
  MapPin,
  Navigation,
  PhoneCall,
  Siren,
} from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/stores/userStore";
import { UI_MODE, mockData } from "@/services/api";
import {
  getUserEmergencyReports,
  getAllEmergencyReports,
  subscribeToActiveAdvisories,
} from "@packages/firebase";
import AdvisoryBanner from "@/components/AdvisoryBanner";
import {
  getIncidentMeta,
  isActiveReport,
  isArchivedStatus,
} from "@/features/history/constants";
import { useAppTheme } from "@/hooks/useAppTheme";
import { openEmergencyHotline } from "@/utils/emergencyHotline";
import { useSOS } from "@/hooks/useSOS";

const typography = {
  display: 32,
  title: 24,
  section: 20,
  body: 16,
  caption: 13,
  badge: 12,
};

/** 8px spacing grid for compact dashboard sections */
const S = 8;

const SHORT_LABELS = {
  fire: "Fire",
  medical: "Medical",
  vehicular_accident: "Accident",
  police_emergency: "Police",
  electrical_powerline_hazard: "Electrical",
  other_emergency: "Emergency",
};

const getShortLabel = (type) => SHORT_LABELS[type] || "Emergency";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const formatDate = (date) => {
  if (!date) return "Unknown";
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatDistance = (distance) => {
  if (distance === Infinity || distance == null) return "Unknown";
  if (distance < 1) return `${Math.round(distance * 1000)}m away`;
  return `${distance.toFixed(1)}km away`;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressScale() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => {
    scale.value = withSpring(0.97, { damping: 14, stiffness: 360 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };
  return { animatedStyle, onPressIn, onPressOut };
}

function SectionHeader({ title, actionLabel, onAction, theme }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.sectionAction, { color: theme.emergency }]}>
            {actionLabel} ›
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DashboardHeader({ displayName, userInitial, theme, onNotifications, onProfile }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.header}>
      <View style={styles.headerTextBlock}>
        <Text style={[styles.greeting, { color: theme.textSecondary }]}>
          {getGreeting()},
        </Text>
        <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.dateLine, { color: theme.mutedText }]}>{today}</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          onPress={onNotifications}
          style={[styles.headerIconBtn, { backgroundColor: theme.card }]}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Bell size={20} color={theme.text} strokeWidth={2} />
          <View
            style={[styles.notifBadge, { backgroundColor: theme.emergency }]}
          />
        </Pressable>
        <Pressable
          onPress={onProfile}
          style={[styles.avatarBtn, { backgroundColor: theme.primaryGreen }]}
          accessibilityLabel="Open profile"
          accessibilityRole="button"
        >
          <Text style={[styles.avatarText, { color: theme.onPrimary }]}>
            {userInitial}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReportEmergencyCard({ onReport, theme }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();

  return (
    <LinearGradient
      colors={[theme.emergency, theme.emergencyGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.reportCard, { shadowColor: theme.emergency }]}
    >
      <View style={styles.reportTop}>
        <View style={styles.reportCopyCol}>
          <View style={styles.reportTitleRow}>
            <Text
              style={[styles.reportTitle, { color: theme.onEmergency }]}
              accessibilityRole="header"
            >
              Report Emergency
            </Text>
            <View style={styles.reportPill}>
              <Text style={[styles.reportPillText, { color: theme.onEmergency }]}>
                24/7
              </Text>
            </View>
          </View>
          <Text
            style={[styles.reportSubtitle, { color: "rgba(255,255,255,0.88)" }]}
            numberOfLines={2}
          >
            Alert responders and share your location instantly.
          </Text>
        </View>
        <View style={styles.sirenWrap}>
          <Siren size={52} color="rgba(255,255,255,0.95)" strokeWidth={1.6} />
        </View>
      </View>

      <AnimatedPressable
        onPress={onReport}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.reportCta, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel="Report emergency now"
      >
        <AlertTriangle size={17} color={theme.emergency} strokeWidth={2.4} />
        <Text style={[styles.reportCtaText, { color: theme.emergency }]}>
          Report Now
        </Text>
      </AnimatedPressable>
    </LinearGradient>
  );
}

function QuickPrimaryButton({
  label,
  subtitle,
  icon: Icon,
  color,
  bg,
  onPress,
  disabled,
  theme,
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={[
        styles.quickPrimaryBtn,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
        animatedStyle,
        disabled && { opacity: 0.55 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${subtitle}`}
    >
      <View style={[styles.quickPrimaryIcon, { backgroundColor: bg }]}>
        <Icon size={22} color={color} strokeWidth={2.2} />
      </View>
      <Text style={[styles.quickPrimaryLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.quickPrimarySub, { color: theme.mutedText }]}>
        {subtitle}
      </Text>
    </AnimatedPressable>
  );
}

function QuickSecondaryButton({
  label,
  subtitle,
  icon: Icon,
  color,
  bg,
  onPress,
  theme,
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.quickSecondaryBtn,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${subtitle}`}
    >
      <View style={[styles.quickSecondaryIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <Text style={[styles.quickSecondaryLabel, { color: theme.text }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.quickSecondarySub, { color: theme.mutedText }]}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </AnimatedPressable>
  );
}

function QuickActionsPanel({
  theme,
  onSOS,
  onHotline,
  onMap,
  onContacts,
  onHistory,
  sosLoading,
}) {
  return (
    <View style={styles.quickPanel}>
      <View style={styles.quickPrimaryRow}>
        <QuickPrimaryButton
          label="SOS"
          subtitle="Send Alert"
          icon={AlertCircle}
          color={theme.emergency}
          bg={theme.emergencySoft}
          onPress={onSOS}
          disabled={sosLoading}
          theme={theme}
        />
        <QuickPrimaryButton
          label="Call 911"
          subtitle="Emergency Call"
          icon={PhoneCall}
          color={theme.primaryGreen}
          bg={theme.primaryGreenSoft}
          onPress={onHotline}
          theme={theme}
        />
      </View>
      <View style={styles.quickSecondaryRow}>
        <QuickSecondaryButton
          label="Map"
          subtitle="View Live Map"
          icon={MapPin}
          color={theme.accentBlue}
          bg={theme.accentBlueSoft}
          onPress={onMap}
          theme={theme}
        />
        <QuickSecondaryButton
          label="Contacts"
          subtitle="Emergency Contacts"
          icon={Contact}
          color={theme.accentPurple}
          bg={theme.accentPurpleSoft}
          onPress={onContacts}
          theme={theme}
        />
        <QuickSecondaryButton
          label="History"
          subtitle="Past Alerts"
          icon={History}
          color={theme.warning}
          bg={theme.warningSoft}
          onPress={onHistory}
          theme={theme}
        />
      </View>
    </View>
  );
}

function MiniMapStub({ pinColor }) {
  const { isLight } = useAppTheme();
  const road = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  const block = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";

  return (
    <View
      style={[
        styles.mapStub,
        { backgroundColor: isLight ? "#EEF1F5" : "#1A1E24" },
      ]}
    >
      <View style={[styles.mapRoadH, { top: "32%", backgroundColor: road }]} />
      <View style={[styles.mapRoadH, { top: "62%", backgroundColor: road }]} />
      <View style={[styles.mapRoadV, { left: "28%", backgroundColor: road }]} />
      <View style={[styles.mapRoadV, { left: "68%", backgroundColor: road }]} />
      <View style={[styles.mapBlock, { top: 10, left: 12, backgroundColor: block }]} />
      <View
        style={[
          styles.mapBlock,
          { top: 10, right: 14, width: 36, backgroundColor: block },
        ]}
      />
      <View
        style={[
          styles.mapBlock,
          { bottom: 14, left: 40, width: 48, backgroundColor: block },
        ]}
      />
      <View style={styles.mapPinCenter}>
        <View style={[styles.mapPinOuter, { backgroundColor: pinColor }]}>
          <MapPin size={14} color="#FFFFFF" strokeWidth={2.4} />
        </View>
      </View>
    </View>
  );
}

function NearbyStrip({ reports, theme, onPressCard, onSeeAll }) {
  return (
    <View style={styles.stripSection}>
      <SectionHeader
        title="Nearby Incidents"
        actionLabel={reports.length > 0 ? "See all" : undefined}
        onAction={reports.length > 0 ? onSeeAll : undefined}
        theme={theme}
      />
      {reports.length === 0 ? (
        <View
          style={[
            styles.stripEmpty,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <Navigation size={16} color={theme.mutedIcon} strokeWidth={2} />
          <Text style={[styles.stripEmptyText, { color: theme.textSecondary }]}>
            No incidents nearby
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.nearbyScroll}
          decelerationRate="fast"
        >
          {reports.map((report) => {
            const meta = getIncidentMeta(report.incidentType, report.typeProfile);
            const Icon = meta.Icon;
            const active = isActiveReport(report.status);
            const resolved = isArchivedStatus(report.status);
            const statusLabel = active ? "Active" : resolved ? "Resolved" : "Active";
            const statusBg = active
              ? theme.emergencySoft
              : theme.primaryGreenSoft;
            const statusColor = active ? theme.emergency : theme.primaryGreen;
            const pinColor = active ? theme.emergency : theme.primaryGreen;
            const distanceLabel =
              report.distance != null
                ? formatDistance(report.distance)
                : report.locationText || "Nearby";

            return (
              <Pressable
                key={report.id}
                onPress={() => onPressCard(report)}
                style={({ pressed }) => [
                  styles.nearbyCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    shadowColor: theme.shadow,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${getShortLabel(report.incidentType)}, ${distanceLabel}, ${statusLabel}`}
              >
                <View style={styles.nearbyHeader}>
                  <View style={[styles.nearbyIcon, { backgroundColor: meta.iconBg }]}>
                    <Icon size={13} color={meta.iconColor} strokeWidth={2.2} />
                  </View>
                  <Text
                    style={[styles.nearbyTitle, { color: meta.iconColor }]}
                    numberOfLines={1}
                  >
                    {getShortLabel(report.incidentType)}
                  </Text>
                  <Text
                    style={[styles.nearbyMeta, { color: theme.mutedText }]}
                    numberOfLines={1}
                  >
                    {distanceLabel}
                  </Text>
                </View>

                <MiniMapStub pinColor={pinColor} />

                <View style={[styles.nearbyStatusBar, { backgroundColor: statusBg }]}>
                  <View style={[styles.nearbyStatusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.nearbyStatusText, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function RecentList({ reports, theme, onPressRow, onSeeAll }) {
  const items = reports.slice(0, 5);

  return (
    <View style={styles.recentSection}>
      <SectionHeader
        title="Recent Activity"
        actionLabel={reports.length > 0 ? "See all" : undefined}
        onAction={reports.length > 0 ? onSeeAll : undefined}
        theme={theme}
      />
      {items.length === 0 ? (
        <View
          style={[
            styles.stripEmpty,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <Clock size={16} color={theme.mutedIcon} strokeWidth={2} />
          <Text style={[styles.stripEmptyText, { color: theme.textSecondary }]}>
            No reports yet
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.recentList,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          {items.map((report, index) => {
            const isLast = index === items.length - 1;
            const location =
              report.locationText || getShortLabel(report.incidentType);

            return (
              <Pressable
                key={report.id}
                onPress={() => onPressRow(report)}
                style={({ pressed }) => [
                  styles.recentRow,
                  !isLast && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border,
                  },
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Emergency Alert, ${location}, ${formatDate(report.createdAt)}`}
              >
                <View
                  style={[
                    styles.recentIcon,
                    { backgroundColor: theme.primaryGreenSoft },
                  ]}
                >
                  <Bell size={16} color={theme.primaryGreen} strokeWidth={2.2} />
                </View>
                <View style={styles.recentCopy}>
                  <Text
                    style={[styles.recentTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    Emergency Alert
                  </Text>
                  <Text
                    style={[styles.recentLocation, { color: theme.mutedText }]}
                    numberOfLines={1}
                  >
                    {location}
                  </Text>
                </View>
                <Text style={[styles.recentTime, { color: theme.mutedText }]}>
                  {formatDate(report.createdAt)}
                </Text>
                <ChevronRight size={16} color={theme.mutedIcon} strokeWidth={2} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();
  const { handleSOS, sosLoading } = useSOS();
  const [recentReports, setRecentReports] = useState([]);
  const [nearbyReports, setNearbyReports] = useState([]);
  const [activeAdvisories, setActiveAdvisories] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, dashboardTheme: theme } = useAppTheme();

  const screenOpacity = useSharedValue(0);
  const screenTranslateY = useSharedValue(12);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const userId = user?.uid || user?.id;

  useEffect(() => {
    screenOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    screenTranslateY.value = withTiming(0, {
      duration: 550,
      easing: Easing.out(Easing.cubic),
    });
  }, [screenOpacity, screenTranslateY]);

  // Subscribe to real-time active emergency advisories from Command Center
  useEffect(() => {
    const unsub = subscribeToActiveAdvisories(
      (list) => {
        setActiveAdvisories(list || []);
      },
      (err) => {
        console.warn("Failed to subscribe to active advisories:", err);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserLocation();
      fetchRecentReports();
    }
  }, [userId]);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyReports();
    }
  }, [userLocation]);

  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error("Error getting user location:", error);
    }
  };

  const fetchRecentReports = async () => {
    if (!user) return;

    try {
      if (UI_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log("UI MODE: Using mock emergency list data");
        const mockReports = mockData.emergencyList.reports.map((report) => ({
          id: report.id,
          incidentType: report.incident_type,
          locationText: report.location_text,
          status: report.status,
          createdAt: new Date(report.created_at),
          latitude: null,
          longitude: null,
        }));
        setRecentReports(mockReports);
        setRefreshing(false);
        return;
      }

      const resolvedUserId = user.uid || user.id;
      if (!resolvedUserId) {
        console.error("User ID not found");
        setRefreshing(false);
        return;
      }

      const reports = await getUserEmergencyReports(resolvedUserId, 10);
      setRecentReports(reports);
    } catch (error) {
      console.error("Error fetching recent reports:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchNearbyReports = async () => {
    if (!userLocation) return;

    try {
      if (UI_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockReports = [
          {
            id: "nearby-1",
            incidentType: "fire",
            locationText: "456 Oak Ave",
            status: "active",
            createdAt: new Date(Date.now() - 1800000),
            latitude: userLocation.latitude + 0.002,
            longitude: userLocation.longitude + 0.002,
            distance: 0.23,
          },
          {
            id: "nearby-2",
            incidentType: "medical",
            locationText: "789 Pine Rd",
            status: "resolved",
            createdAt: new Date(Date.now() - 3600000),
            latitude: userLocation.latitude - 0.004,
            longitude: userLocation.longitude + 0.003,
            distance: 0.41,
          },
        ];
        setNearbyReports(mockReports);
        return;
      }

      const allReports = await getAllEmergencyReports(100);
      const resolvedUserId = user.uid || user.id;

      const nearby = allReports
        .filter(
          (report) =>
            report.userId !== resolvedUserId &&
            report.latitude &&
            report.longitude
        )
        .map((report) => {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            report.latitude,
            report.longitude
          );
          return { ...report, distance };
        })
        .filter((report) => report.distance <= 10)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      setNearbyReports(nearby);
    } catch (error) {
      console.error("Error fetching nearby reports:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserLocation();
    fetchRecentReports();
  };

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenTranslateY.value }],
  }));

  if (!fontsLoaded) {
    return null;
  }

  const displayName = user?.name || "John Doe";
  const userInitial = displayName.trim().charAt(0).toUpperCase();

  const openDetails = (report) => {
    if (!report?.id) return;
    router.push({
      pathname: "/emergency-confirmation",
      params: { reportId: report.id },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={theme.background} />

      <Animated.View style={[styles.flex, screenAnimatedStyle]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 120,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.refreshTint}
              colors={[theme.refreshTint]}
            />
          }
        >
          <DashboardHeader
            displayName={displayName}
            userInitial={userInitial}
            theme={theme}
            onNotifications={() => router.push("/advisories")}
            onProfile={() => router.push("/(tabs)/profile")}
          />

          {activeAdvisories.length > 0 && (
            <AdvisoryBanner advisories={activeAdvisories} theme={theme} />
          )}

          <ReportEmergencyCard
            theme={theme}
            onReport={() => router.push("/emergency-form")}
          />

          <View style={styles.sectionCompact}>
            <SectionHeader title="Quick Actions" theme={theme} />
            <QuickActionsPanel
              theme={theme}
              onSOS={handleSOS}
              onHotline={openEmergencyHotline}
              onMap={() => router.push("/responder-map")}
              onContacts={() => router.push("/help-support")}
              onHistory={() => router.push("/(tabs)/history")}
              sosLoading={sosLoading}
            />
          </View>

          <NearbyStrip
            reports={nearbyReports}
            theme={theme}
            onPressCard={openDetails}
            onSeeAll={() => router.push("/responder-map")}
          />

          <RecentList
            reports={recentReports}
            theme={theme}
            onPressRow={openDetails}
            onSeeAll={() => router.push("/(tabs)/history")}
          />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: typography.caption + 1,
    marginBottom: 4,
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: typography.title,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  dateLine: {
    fontFamily: "Inter_400Regular",
    fontSize: typography.caption,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  notifBadge: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: typography.body,
  },
  reportCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 4,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  reportTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  reportCopyCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  reportTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  reportTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: typography.section,
    letterSpacing: -0.3,
  },
  reportPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  reportPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  reportSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: typography.caption + 1,
    lineHeight: 18,
  },
  sirenWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  reportCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  reportCtaText: {
    fontFamily: "Inter_700Bold",
    fontSize: typography.body,
    letterSpacing: 0.15,
  },
  sectionCompact: {
    marginTop: S * 2.5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S * 1.25,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.2,
  },
  sectionAction: {
    fontFamily: "Inter_600SemiBold",
    fontSize: typography.caption + 1,
  },
  quickPanel: {
    gap: S * 1.25,
  },
  quickPrimaryRow: {
    flexDirection: "row",
    gap: S * 1.25,
  },
  quickPrimaryBtn: {
    flex: 1,
    alignItems: "flex-start",
    paddingHorizontal: S * 1.75,
    paddingVertical: S * 1.75,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  quickPrimaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickPrimaryLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 2,
  },
  quickPrimarySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  quickSecondaryRow: {
    flexDirection: "row",
    gap: S,
  },
  quickSecondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 108,
    paddingVertical: S * 1.5,
    paddingHorizontal: S / 2,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  quickSecondaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickSecondaryLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    marginBottom: 2,
    textAlign: "center",
  },
  quickSecondarySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  stripSection: {
    marginTop: S * 2.5,
  },
  stripEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: S,
    minHeight: 52,
    paddingHorizontal: S * 1.5,
    borderRadius: 16,
    borderWidth: 1,
  },
  stripEmptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  nearbyScroll: {
    gap: 12,
    paddingRight: S,
    paddingBottom: 2,
  },
  nearbyCard: {
    width: 178,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  nearbyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  nearbyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    flexShrink: 0,
  },
  nearbyMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    flex: 1,
    textAlign: "right",
  },
  mapStub: {
    height: 88,
    marginHorizontal: 10,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  mapRoadH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 5,
  },
  mapRoadV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 5,
  },
  mapBlock: {
    position: "absolute",
    width: 42,
    height: 28,
    borderRadius: 4,
  },
  mapPinCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPinOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 9,
  },
  nearbyStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  nearbyStatusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  recentSection: {
    marginTop: S * 2.5,
  },
  recentList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  recentCopy: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginBottom: 2,
  },
  recentLocation: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  recentTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
