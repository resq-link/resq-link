import React, { useEffect, useMemo, useState } from "react";
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
  Map,
  MapPin,
  Navigation,
  PhoneCall,
  ShieldAlert,
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
  normalizeOperationalStatus,
} from "@packages/firebase";
import StatusChip from "@/features/history/components/StatusChip";
import { getIncidentMeta } from "@/features/history/constants";
import { useAppTheme } from "@/hooks/useAppTheme";
import { openEmergencyHotline } from "@/utils/emergencyHotline";
import { useSOS } from "@/hooks/useSOS";

const ACTIVE_INCIDENT_STATUSES = new Set(["pending", "active", "on_scene"]);

const typography = {
  display: 32,
  title: 24,
  section: 20,
  body: 16,
  caption: 13,
  badge: 12,
};

const CARD_RADIUS = 20;
const CARD_PADDING = 16;

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

const getIncidentLabel = (type) => {
  const typeMap = {
    fire: "Fire",
    medical: "Medical Emergency",
    vehicular_accident: "Vehicular Accident",
    police_emergency: "Police Emergency",
    electrical_powerline_hazard: "Electrical / Powerline Hazard",
    other_emergency: "Other Emergency",
  };
  return typeMap[type] || "Emergency";
};

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

function DashboardCard({ children, style, theme }) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SectionHeader({ title, actionLabel, onAction, theme }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.sectionAction, { color: theme.primaryGreen }]}>
            {actionLabel}
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
          {getGreeting()}
        </Text>
        <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.dateLine, { color: theme.mutedText }]}>{today}</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          onPress={onNotifications}
          style={[styles.headerIconBtn, { backgroundColor: theme.surface }]}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Bell size={20} color={theme.text} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={onProfile}
          style={[styles.avatarBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          accessibilityLabel="Open profile"
          accessibilityRole="button"
        >
          <Text style={[styles.avatarText, { color: theme.primaryGreen }]}>
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
    <View
      style={[
        styles.reportCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View style={styles.reportHeader}>
        <View
          style={[styles.reportIconWrap, { backgroundColor: theme.emergencySoft }]}
        >
          <ShieldAlert size={20} color={theme.emergency} strokeWidth={2.2} />
        </View>
        <View style={styles.reportCopy}>
          <View style={styles.reportTitleRow}>
            <Text
              style={[styles.reportTitle, { color: theme.text }]}
              accessibilityRole="header"
            >
              Report Emergency
            </Text>
            <View
              style={[styles.reportPill, { backgroundColor: theme.emergencySoft }]}
            >
              <Text style={[styles.reportPillText, { color: theme.emergency }]}>
                24/7
              </Text>
            </View>
          </View>
          <Text
            style={[styles.reportSubtitle, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            Alert responders and share your location instantly.
          </Text>
        </View>
      </View>

      <AnimatedPressable
        onPress={onReport}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.reportCtaOuter,
          animatedStyle,
          Platform.OS === "ios" ? { shadowColor: theme.emergency } : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Report emergency now"
      >
        <LinearGradient
          colors={[theme.emergency, theme.emergencyGradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.reportCta}
        >
          <AlertTriangle size={17} color={theme.onEmergency} strokeWidth={2.4} />
          <Text style={[styles.reportCtaText, { color: theme.onEmergency }]}>
            Report Now
          </Text>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

function ActiveIncidentCard({ report, theme, onTrackLive, onViewDetails }) {
  const meta = getIncidentMeta(report.incidentType, report.typeProfile);
  const IncidentIcon = meta.Icon;
  const trackAnim = usePressScale();

  return (
    <DashboardCard theme={theme} style={styles.activeCard}>
      <View style={styles.activeTopRow}>
        <View style={[styles.activeIconBadge, { backgroundColor: meta.iconBg }]}>
          <IncidentIcon size={18} color={meta.iconColor} strokeWidth={2.2} />
        </View>

        <View style={styles.activeBody}>
          <View style={styles.activeTitleRow}>
            <Text
              style={[styles.activeType, { color: theme.text }]}
              numberOfLines={1}
            >
              {getIncidentLabel(report.incidentType)}
            </Text>
            <StatusChip status={report.status} size="md" />
          </View>

          <View style={styles.activeMetaLine}>
            <Clock size={13} color={theme.mutedIcon} strokeWidth={2} />
            <Text
              style={[styles.activeMetaText, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              Reported {formatDate(report.createdAt)}
            </Text>
          </View>

          {report.locationText ? (
            <View style={styles.activeMetaLine}>
              <MapPin size={13} color={theme.mutedIcon} strokeWidth={2} />
              <Text
                style={[styles.activeMetaText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {report.locationText}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.activeActions}>
        <AnimatedPressable
          onPress={onTrackLive}
          onPressIn={trackAnim.onPressIn}
          onPressOut={trackAnim.onPressOut}
          style={[
            styles.trackLiveOuter,
            trackAnim.animatedStyle,
            Platform.OS === "ios" ? { shadowColor: theme.primaryGreen } : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="View live tracking"
        >
          <LinearGradient
            colors={[theme.primaryGreen, theme.primaryGreen]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.trackLiveBtn}
          >
            <Navigation size={16} color={theme.onPrimary} strokeWidth={2.4} />
            <Text style={[styles.trackLiveText, { color: theme.onPrimary }]}>
              View Live Tracking
            </Text>
          </LinearGradient>
        </AnimatedPressable>

        <Pressable
          onPress={onViewDetails}
          style={({ pressed }) => [
            styles.detailsBtn,
            pressed && { opacity: 0.72 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="View incident details"
          hitSlop={6}
        >
          <Text style={[styles.detailsBtnText, { color: theme.textSecondary }]}>
            View Details
          </Text>
          <ChevronRight size={15} color={theme.mutedIcon} strokeWidth={2.4} />
        </Pressable>
      </View>
    </DashboardCard>
  );
}

function QuickPrimaryButton({ label, icon: Icon, color, bg, onPress, disabled, theme }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={[
        styles.quickPrimaryBtn,
        { backgroundColor: theme.card, borderColor: theme.border },
        animatedStyle,
        disabled && { opacity: 0.55 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickPrimaryIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={color} strokeWidth={2.2} />
      </View>
      <Text style={[styles.quickPrimaryLabel, { color: theme.text }]}>{label}</Text>
    </AnimatedPressable>
  );
}

function QuickSecondaryButton({ label, icon: Icon, color, bg, onPress, theme }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.quickSecondaryBtn,
        { backgroundColor: theme.card, borderColor: theme.border },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickSecondaryIcon, { backgroundColor: bg }]}>
        <Icon size={16} color={color} strokeWidth={2} />
      </View>
      <Text style={[styles.quickSecondaryLabel, { color: theme.textSecondary }]}>
        {label}
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
          icon={AlertCircle}
          color={theme.emergency}
          bg={theme.emergencySoft}
          onPress={onSOS}
          disabled={sosLoading}
          theme={theme}
        />
        <QuickPrimaryButton
          label="Call 911"
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
          icon={Map}
          color={theme.accentBlue}
          bg={theme.accentBlueSoft}
          onPress={onMap}
          theme={theme}
        />
        <QuickSecondaryButton
          label="Contacts"
          icon={Contact}
          color={theme.accentPurple}
          bg={theme.accentPurpleSoft}
          onPress={onContacts}
          theme={theme}
        />
        <QuickSecondaryButton
          label="History"
          icon={History}
          color={theme.primaryGreen}
          bg={theme.primaryGreenSoft}
          onPress={onHistory}
          theme={theme}
        />
      </View>
    </View>
  );
}

function NearbyStrip({ reports, theme, onPressCard, onSeeAll }) {
  return (
    <View style={styles.stripSection}>
      <SectionHeader
        title="Nearby"
        actionLabel={reports.length > 0 ? "See all" : undefined}
        onAction={reports.length > 0 ? onSeeAll : undefined}
        theme={theme}
      />
      {reports.length === 0 ? (
        <View
          style={[
            styles.stripEmpty,
            { backgroundColor: theme.card, borderColor: theme.border },
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
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${getShortLabel(report.incidentType)}, ${distanceLabel}`}
              >
                <View style={[styles.nearbyIcon, { backgroundColor: meta.iconBg }]}>
                  <Icon size={14} color={meta.iconColor} strokeWidth={2} />
                </View>
                <Text
                  style={[styles.nearbyTitle, { color: theme.text }]}
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
                <View style={styles.nearbyStatus}>
                  <StatusChip status={report.status} size="sm" />
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
        title="Recent"
        actionLabel={reports.length > 0 ? "See all" : undefined}
        onAction={reports.length > 0 ? onSeeAll : undefined}
        theme={theme}
      />
      {items.length === 0 ? (
        <View
          style={[
            styles.stripEmpty,
            { backgroundColor: theme.card, borderColor: theme.border },
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
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {items.map((report, index) => {
            const meta = getIncidentMeta(report.incidentType, report.typeProfile);
            const Icon = meta.Icon;
            const isLast = index === items.length - 1;

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
                accessibilityLabel={`${getShortLabel(report.incidentType)}, ${formatDate(report.createdAt)}`}
              >
                <View style={[styles.recentIcon, { backgroundColor: meta.iconBg }]}>
                  <Icon size={14} color={meta.iconColor} strokeWidth={2} />
                </View>
                <Text
                  style={[styles.recentTitle, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {getShortLabel(report.incidentType)}
                </Text>
                <Text style={[styles.recentTime, { color: theme.mutedText }]}>
                  {formatDate(report.createdAt)}
                </Text>
                <ChevronRight size={14} color={theme.mutedIcon} strokeWidth={2} />
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
            status: "pending",
            createdAt: new Date(Date.now() - 1800000),
            latitude: userLocation.latitude + 0.02,
            longitude: userLocation.longitude + 0.02,
            distance: 2.3,
          },
          {
            id: "nearby-2",
            incidentType: "medical",
            locationText: "789 Pine Rd",
            status: "active",
            createdAt: new Date(Date.now() - 3600000),
            latitude: userLocation.latitude - 0.03,
            longitude: userLocation.longitude + 0.04,
            distance: 5.1,
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

  const activeIncident = useMemo(() => {
    return (
      recentReports.find((report) =>
        ACTIVE_INCIDENT_STATUSES.has(normalizeOperationalStatus(report.status))
      ) ?? null
    );
  }, [recentReports]);

  if (!fontsLoaded) {
    return null;
  }

  const displayName = user?.name || "John Doe";
  const userInitial = displayName.trim().charAt(0).toUpperCase();

  const openLiveMap = (report) => {
    if (!report?.id) return;
    router.push({
      pathname: "/responder-map",
      params: { reportId: report.id },
    });
  };

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
            onNotifications={() => router.push("/notifications")}
            onProfile={() => router.push("/(tabs)/profile")}
          />

          <ReportEmergencyCard
            theme={theme}
            onReport={() => router.push("/emergency-form")}
          />

          {activeIncident ? (
            <View style={styles.section}>
              <SectionHeader title="Active Incident" theme={theme} />
              <ActiveIncidentCard
                report={activeIncident}
                theme={theme}
                onTrackLive={() => openLiveMap(activeIncident)}
                onViewDetails={() => openDetails(activeIncident)}
              />
            </View>
          ) : null}

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
            onPressCard={openLiveMap}
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
  card: {
    borderRadius: CARD_RADIUS,
    padding: CARD_PADDING,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Platform.OS === "ios" ? 0.1 : 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
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
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: typography.body,
  },
  reportCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  reportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reportCopy: {
    flex: 1,
    minWidth: 0,
  },
  reportTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
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
  reportCtaOuter: {
    borderRadius: 14,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? {
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
        }
      : { elevation: 2 }),
  },
  reportCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 18,
  },
  reportCtaText: {
    fontFamily: "Inter_700Bold",
    fontSize: typography.body,
    letterSpacing: 0.15,
  },
  section: {
    marginTop: 20,
  },
  sectionCompact: {
    marginTop: S * 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S,
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
  activeCard: {
    gap: 12,
    padding: 14,
  },
  activeTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  activeIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activeBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  activeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  activeType: {
    fontFamily: "Inter_600SemiBold",
    fontSize: typography.body,
    letterSpacing: -0.2,
    flex: 1,
  },
  activeMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeMetaText: {
    fontFamily: "Inter_400Regular",
    fontSize: typography.caption,
    flex: 1,
  },
  activeActions: {
    gap: 8,
  },
  trackLiveOuter: {
    borderRadius: 14,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? {
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.14,
          shadowRadius: 6,
        }
      : { elevation: 2 }),
  },
  trackLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  trackLiveText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: typography.caption + 1,
    letterSpacing: 0.1,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 36,
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: typography.caption,
  },
  quickPanel: {
    gap: S,
  },
  quickPrimaryRow: {
    flexDirection: "row",
    gap: S,
  },
  quickPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: S,
    minHeight: 44,
    paddingHorizontal: S * 1.5,
    paddingVertical: S,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickPrimaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickPrimaryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    flex: 1,
  },
  quickSecondaryRow: {
    flexDirection: "row",
    gap: S,
  },
  quickSecondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: S,
    paddingHorizontal: S / 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  quickSecondaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickSecondaryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  stripSection: {
    marginTop: S * 2,
  },
  stripEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: S,
    minHeight: 44,
    paddingHorizontal: S * 1.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  stripEmptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  nearbyScroll: {
    gap: S,
    paddingRight: S,
  },
  nearbyCard: {
    width: 120,
    padding: S,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  nearbyIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  nearbyMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  nearbyStatus: {
    marginTop: 2,
  },
  recentSection: {
    marginTop: S * 2,
  },
  recentList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S,
    minHeight: 44,
    paddingHorizontal: S * 1.5,
    paddingVertical: S,
  },
  recentIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  recentTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    flex: 1,
  },
  recentTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
