import React, { useCallback } from "react";
import {
  View,
  SectionList,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import Animated, { FadeInDown } from "react-native-reanimated";
import HistoryHeader from "@/features/history/components/HistoryHeader";
import SearchBar from "@/features/history/components/SearchBar";
import FilterChips from "@/features/history/components/FilterChips";
import ActiveIncidentCard from "@/features/history/components/ActiveIncidentCard";
import IncidentHistoryCard from "@/features/history/components/IncidentHistoryCard";
import TimelineSectionHeader from "@/features/history/components/TimelineSectionHeader";
import EmptyHistoryState from "@/features/history/components/EmptyHistoryState";
import HistorySkeleton from "@/features/history/components/HistorySkeleton";
import { useHistoryReports } from "@/features/history/hooks/useHistoryReports";
import { STATUS_FILTERS, TYPE_FILTERS } from "@/features/history/constants";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { getBottomNavHeight } from "@/utils/navigationInsets";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const history = useHistoryReports();
  const { historyTheme, colors } = useAppTheme();

  const styles = useThemedStyles(
    (t) => ({
      root: {
        flex: 1,
      },
      topChrome: {
        paddingBottom: 10,
        backgroundColor: t.background,
      },
      listSurface: {
        flex: 1,
        backgroundColor: t.background,
      },
      skeletonWrap: {
        flex: 1,
        paddingHorizontal: 16,
      },
    }),
    historyTheme
  );

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const openReport = useCallback(
    (report) => {
      if (!report?.id) return;
      router.push({
        pathname: "/emergency-confirmation",
        params: { reportId: report.id },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <Animated.View
        entering={index < 8 ? FadeInDown.duration(240).delay(index * 30) : undefined}
      >
        <IncidentHistoryCard
          report={item}
          onPress={() => openReport(item)}
        />
      </Animated.View>
    ),
    [openReport]
  );

  const renderSectionHeader = useCallback(
    ({ section: { title, data } }) => (
      <TimelineSectionHeader title={title} count={data.length} />
    ),
    []
  );

  const ListHeader = useCallback(() => {
    if (!history.activeReport) return null;
    return (
      <ActiveIncidentCard
        report={history.activeReport}
        onPress={() => openReport(history.activeReport)}
      />
    );
  }, [history.activeReport, openReport]);

  const ListEmpty = useCallback(() => {
    if (history.loading) return null;
    return (
      <EmptyHistoryState
        filtered={history.isFilteredEmpty}
        onReport={
          history.isFilteredEmpty
            ? undefined
            : () => router.push("/emergency-form")
        }
      />
    );
  }, [history.loading, history.isFilteredEmpty, router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.root, { backgroundColor: historyTheme.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={historyTheme.background} />

      <View
        style={[
          styles.topChrome,
          { paddingTop: insets.top + 6, paddingHorizontal: 16 },
        ]}
      >
        <HistoryHeader
          onBack={() => router.push("/dashboard")}
          reportCount={history.isEmpty ? 0 : history.totalCount}
        />
        <SearchBar
          value={history.searchQuery}
          onChangeText={history.setSearchQuery}
        />
        <FilterChips
          statusFilters={STATUS_FILTERS}
          typeFilters={TYPE_FILTERS}
          statusFilter={history.statusFilter}
          typeFilter={history.typeFilter}
          onStatusChange={history.setStatusFilter}
          onTypeChange={history.setTypeFilter}
        />
      </View>

      {history.loading ? (
        <View style={styles.skeletonWrap}>
          <HistorySkeleton />
        </View>
      ) : history.isEmpty ? (
        <EmptyHistoryState onReport={() => router.push("/emergency-form")} />
      ) : (
        <View style={styles.listSurface}>
        <SectionList
          sections={history.sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            history.sections.length === 0 && !history.activeReport ? ListEmpty : null
          }
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: getBottomNavHeight(insets) + 20,
            flexGrow:
              history.sections.length === 0 && !history.activeReport ? 1 : undefined,
          }}
          refreshControl={
            <RefreshControl
              refreshing={history.refreshing}
              onRefresh={history.onRefresh}
              tintColor={historyTheme.primary}
              colors={[historyTheme.primary]}
              progressBackgroundColor={historyTheme.surface}
            />
          }
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          accessibilityLabel="Emergency report history"
        />
        </View>
      )}
    </View>
  );
}
