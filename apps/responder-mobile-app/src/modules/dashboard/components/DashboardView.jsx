import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  List,
  Radio,
  ShieldCheck,
} from "lucide-react-native";
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
import useUserStore from "@/store/userStore";
import { getFirebaseAuth, waitForFirebaseAuthUser } from "@packages/firebase";
import ActiveAssignmentCard from "@/modules/dashboard/components/ActiveAssignmentCard";
import DashboardTopBar from "@/modules/dashboard/components/DashboardTopBar";
import DashboardIncidentRow from "@/modules/dashboard/components/DashboardIncidentRow";
import DashboardSectionLabel from "@/modules/dashboard/components/DashboardSectionLabel";
import DashboardStatCell from "@/modules/dashboard/components/DashboardStatCell";
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
import { useResponderDuty } from "@/modules/dashboard/hooks/useResponderDuty";
import DutyResourceCard from "@/modules/dashboard/components/DutyResourceCard";
import { useDashboardLocationTracking } from "@/modules/dashboard/hooks/useDashboardLocationTracking";
import { useResponderLocationSnapshot } from "@/modules/dashboard/hooks/useResponderLocationSnapshot";
import {
  formatResponderName,
  getResponderInitials,
  getResponderRoleLabel,
} from "@/utils/formatResponderIdentity";
import { getBottomNavHeight } from "@/utils/navigationInsets";
import { useIncidentAlert } from "@/providers/PriorityAlertProvider";
import { buildDashboardStyles } from "./dashboardView.styles";

const ACTIVE_STATUSES = new Set([
  "pending",
  "dispatched",
  "awaiting_resources",
  "active",
  "enroute",
  "on_scene",
]);

function pickActiveAssignment(cases) {
  const open = cases.filter((c) => {
    const status = String(c.status || "").toLowerCase();
    return (
      ACTIVE_STATUSES.has(status) &&
      status !== "done" &&
      status !== "resolved" &&
      !c.postIncidentReport?.submittedAt
    );
  });

  if (open.length === 0) return null;

  const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...open].sort((a, b) => {
    const pa = priorityRank[String(a.priority || "medium").toLowerCase()] ?? 2;
    const pb = priorityRank[String(b.priority || "medium").toLowerCase()] ?? 2;
    if (pb !== pa) return pb - pa;
    const ta = a.updatedAt?.toDate?.() ?? a.updatedAt ?? a.createdAt;
    const tb = b.updatedAt?.toDate?.() ?? b.updatedAt ?? b.createdAt;
    return new Date(tb) - new Date(ta);
  })[0];
}

export default function DashboardView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUserStore();
  const { alertingCount } = useIncidentAlert();
  const authUid = getFirebaseAuth().currentUser?.uid ?? user?.uid;
  const [refreshing, setRefreshing] = useState(false);
  const [locationPaused, setLocationPaused] = useState(false);
  const scrollRef = useRef(null);
  const dutySectionYRef = useRef(0);

  const { cases, initialSyncPending } = useAssignedEmergencies(
    user && authUid ? authUid : undefined,
    { onRealtimeSnapshot: () => setRefreshing(false) }
  );

  const duty = useResponderDuty(authUid);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { resolvedScheme } = useResqTheme();
  const D = useMemo(
    () => ({
      ...(resolvedScheme === "dark" ? dashboardThemeDark : dashboardThemeLight),
      alertBadge: "#DC2626",
    }),
    [resolvedScheme]
  );
  const styles = useMemo(() => buildDashboardStyles(D), [D]);

  const [authReady, setAuthReady] = React.useState(false);
  const [firebaseUid, setFirebaseUid] = React.useState(
    () => getFirebaseAuth().currentUser?.uid ?? null
  );

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const firebaseUser = await waitForFirebaseAuthUser();
      if (cancelled) return;
      setAuthReady(true);
      if (!firebaseUser) {
        router.replace("/login");
        return;
      }
      setFirebaseUid(firebaseUser.uid);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, router]);

  const trackingEnabled = !!(user && authReady && firebaseUid && !locationPaused);
  useDashboardLocationTracking(trackingEnabled, {
    resourceId: duty.duty.resourceId,
    isPrimary: duty.isPrimary,
  });

  const responderCoords = useResponderLocationSnapshot(trackingEnabled);

  useFocusEffect(
    useCallback(() => {
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
    if (!caseData?.id) return;
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

  const displayName = useMemo(
    () => formatResponderName(user?.email || ""),
    [user?.email]
  );
  const initials = useMemo(
    () => getResponderInitials({ email: user?.email, displayName }),
    [user?.email, displayName]
  );
  const roleLabel = useMemo(
    () => getResponderRoleLabel(duty.activeResource),
    [duty.activeResource]
  );

  const onDuty = Boolean(duty.activeResource);
  const dutyUnitLabel = duty.activeResource?.name ?? null;

  const handlePressDuty = useCallback(() => {
    if (onDuty) {
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    scrollRef.current?.scrollTo({
      y: Math.max(dutySectionYRef.current - 12, 0),
      animated: true,
    });
  }, [onDuty]);

  if (!fontsLoaded) return null;
  if (initialSyncPending) {
    return (
      <LoadingScreen
        title="RESQ Responders"
        subtitle="Preparing Mission Dashboard..."
      />
    );
  }

  const activeAssignment = pickActiveAssignment(cases);
  const otherCases = activeAssignment
    ? cases.filter((c) => c.id !== activeAssignment.id)
    : cases;

  const activeCount = cases.filter((c) =>
    ACTIVE_STATUSES.has(String(c.status || "").toLowerCase())
  ).length;
  const completedCount = cases.filter(
    (c) => c.status === "done" || c.status === "resolved"
  ).length;
  const assignedCount = cases.length;

  const dutySection = (
    <View
      style={[styles.content, styles.dutySection]}
      onLayout={(event) => {
        dutySectionYRef.current = event.nativeEvent.layout.y;
      }}
    >
      <DutyResourceCard
        D={D}
        activeResource={duty.activeResource}
        claimableResources={duty.claimableResources}
        isPrimary={duty.isPrimary}
        isSaving={duty.isSaving}
        error={duty.error}
        clearError={duty.clearError}
        onGoOnDuty={duty.goOnDuty}
        onGoOffDuty={duty.goOffDuty}
        showStatusPill={false}
      />
    </View>
  );

  const headerTopPad = insets.top + (Platform.OS === "android" ? 4 : spacing.xs);

  return (
    <View style={styles.root}>
      <StatusBar
        style={resolvedScheme === "dark" ? "light" : "dark"}
        backgroundColor={D.bgBottom}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: getBottomNavHeight(insets) + spacing.md,
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
        <DashboardTopBar
          initials={initials}
          displayName={displayName}
          roleLabel={roleLabel}
          onDuty={onDuty}
          dutyUnitLabel={dutyUnitLabel}
          onPressDuty={handlePressDuty}
          notificationCount={alertingCount}
          onPressNotifications={() => router.push("/notifications")}
          onPressProfile={() => router.push("/settings")}
          topInset={headerTopPad}
          theme={D}
        />

        <View style={styles.divider} />

        {!onDuty ? dutySection : null}

        <View style={[styles.content, styles.section]}>
          <DashboardSectionLabel
            Icon={CalendarDays}
            label="Response Summary"
            color={D.accent}
            theme={D}
          />
          <View style={styles.statsRow}>
            <DashboardStatCell
              Icon={Activity}
              value={activeCount}
              label="Active"
              valueColor={D.statActive}
              iconColor={D.statActive}
              iconBg={D.statCardActiveTop ?? D.accentSoft}
              bordered
              theme={D}
            />
            <DashboardStatCell
              Icon={CheckCircle2}
              value={completedCount}
              label="Done"
              valueColor={D.statResolved}
              iconColor={D.statResolved}
              iconBg={D.statCardResolvedTop ?? D.accentSoft}
              bordered
              theme={D}
            />
            <DashboardStatCell
              Icon={ClipboardList}
              value={assignedCount}
              label="All"
              iconColor={D.accent}
              iconBg={D.statCardOnlineTop ?? D.accentSoft}
              theme={D}
            />
          </View>
        </View>

        <View style={[styles.content, styles.section]}>
          <DashboardSectionLabel
            Icon={Radio}
            label="Active"
            color={D.accent}
            theme={D}
          />
          {activeAssignment ? (
            <ActiveAssignmentCard
              case={activeAssignment}
              onPress={() => handleCasePress(activeAssignment)}
              onStatusUpdate={handleCaseStatusUpdate}
              responderCoords={responderCoords}
            />
          ) : (
            <View style={styles.activeEmpty}>
              <View style={[styles.emptyIconWell, { backgroundColor: D.accentSoft }]}>
                <ShieldCheck size={16} color={D.accent} strokeWidth={2} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.activeEmptyTitle}>Clear</Text>
                <Text style={styles.activeEmptyText}>No active assignment</Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.content, styles.section]}>
          <View style={styles.listHeader}>
            <DashboardSectionLabel
              Icon={List}
              label="Queue"
              color={D.accent}
              theme={D}
              style={{ flex: 1, marginBottom: 0 }}
            />
            {otherCases.length > 0 ? (
              <Text style={styles.listCount}>{otherCases.length}</Text>
            ) : null}
          </View>

          {cases.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconWell, { backgroundColor: D.accentSoft }]}>
                <ClipboardList size={16} color={D.accent} strokeWidth={2} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No incidents</Text>
                <Text style={styles.emptySubtitle}>Waiting for dispatch</Text>
              </View>
            </View>
          ) : otherCases.length === 0 ? (
            <View style={styles.activeEmpty}>
              <View style={[styles.emptyIconWell, { backgroundColor: D.accentSoft }]}>
                <ShieldCheck size={16} color={D.accent} strokeWidth={2} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.activeEmptyTitle}>Queue empty</Text>
                <Text style={styles.activeEmptyText}>Only active case shown above</Text>
              </View>
            </View>
          ) : (
            otherCases.map((caseData) => (
              <DashboardIncidentRow
                key={caseData.id}
                case={caseData}
                onPress={() => handleCasePress(caseData)}
                onStatusUpdate={handleCaseStatusUpdate}
                responderCoords={responderCoords}
              />
            ))
          )}
        </View>

        {onDuty ? dutySection : null}
      </ScrollView>
    </View>
  );
}
