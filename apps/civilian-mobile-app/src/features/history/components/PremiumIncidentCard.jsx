import React, { memo, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  Building2,
  Calendar,
  ChevronRight,
  Clock3,
  Hash,
  MapPin,
  Navigation,
  Radio,
  Smartphone,
  Timer,
} from "lucide-react-native";
import {
  getCardStatusAccent,
  getIncidentMeta,
  getStatusPresentation,
  getTrackButtonPresentation,
} from "@/features/history/constants";
import {
  formatAgencyLabel,
  formatCardClock,
  formatCardDate,
  formatReportId,
  formatReportSource,
  formatResponseDuration,
} from "@/features/history/utils";
import IncidentIconBadge from "@/features/history/components/IncidentIconBadge";
import StatusChip from "./StatusChip";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { createHistoryCardShell } from "@/theme/factories";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MetaLine({ icon: Icon, children, theme, styles }) {
  return (
    <View style={styles.metaLine}>
      <View style={[styles.metaIconWrap, { backgroundColor: theme.surface }]}>
        <Icon size={13} color={theme.textSecondary} strokeWidth={2.2} />
      </View>
      <Text style={styles.metaText} numberOfLines={2}>
        {children}
      </Text>
    </View>
  );
}

function PremiumIncidentCard({ report, onPress, featured = false }) {
  const { historyTheme, isLight } = useAppTheme();
  const scale = useSharedValue(1);

  const cardShell = useMemo(
    () => createHistoryCardShell(historyTheme, { featured }),
    [historyTheme, featured]
  );

  const statusPresentation = getStatusPresentation(
    report.status,
    historyTheme,
    isLight
  );
  const statusAccent = getCardStatusAccent(report.status, historyTheme, isLight);
  const actionPresentation = getTrackButtonPresentation(report.status, historyTheme);
  const isLiveAction =
    actionPresentation.variant === "gradient" &&
    actionPresentation.showNavigationIcon;

  const styles = useThemedStyles(
    (t) => ({
      card: {
        marginBottom: 12,
      },
      accentBar: {
        height: 4,
        width: "100%",
      },
      content: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
        gap: 12,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      },
      iconShell: {
        borderRadius: 14,
        padding: 2,
      },
      headerText: {
        flex: 1,
        minWidth: 0,
        gap: 3,
      },
      liveRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: t.emergencyMuted,
        marginBottom: 2,
      },
      liveText: {
        fontFamily: "Inter_700Bold",
        fontSize: historyTypography.badge,
        color: t.emergency,
        letterSpacing: 0.5,
        textTransform: "uppercase",
      },
      title: {
        fontFamily: "Inter_700Bold",
        fontSize: historyTypography.cardTitle + 1,
        color: t.text,
        letterSpacing: -0.2,
      },
      subtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: historyTypography.cardMeta,
        color: t.textSecondary,
      },
      metaPanel: {
        borderRadius: 14,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
      },
      metaLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 22,
      },
      metaIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
      },
      metaText: {
        flex: 1,
        fontFamily: "Inter_600SemiBold",
        fontSize: historyTypography.cardMetaStrong,
        color: t.text,
        lineHeight: 18,
      },
      inlineMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      },
      inlineMetaItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
      },
      inlineMetaText: {
        flex: 1,
        fontFamily: "Inter_600SemiBold",
        fontSize: historyTypography.cardMetaStrong,
        color: t.text,
      },
      inlineDivider: {
        width: 1,
        height: 14,
        borderRadius: 1,
        backgroundColor: t.divider,
      },
      footerBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderRadius: 14,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
        paddingLeft: 12,
        paddingRight: 6,
        paddingVertical: 6,
        minHeight: 44,
      },
      footerMeta: {
        flex: 1,
        minWidth: 0,
        gap: 2,
      },
      footerMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
      },
      footerMetaText: {
        flex: 1,
        fontFamily: "Inter_400Regular",
        fontSize: historyTypography.cardFooter,
        color: t.textSecondary,
      },
      actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        minHeight: 44,
        minWidth: 44,
        justifyContent: "center",
      },
      actionLabel: {
        fontFamily: "Inter_700Bold",
        fontSize: historyTypography.cardFooter,
        letterSpacing: 0.05,
      },
    }),
    historyTheme
  );

  const meta = getIncidentMeta(report.incidentType, report.typeProfile);
  const reportId = formatReportId(report);
  const agency = formatAgencyLabel(report);
  const responseDuration = formatResponseDuration(report);
  const reportSource = formatReportSource(report);
  const dateLabel = formatCardDate(report.createdAt);
  const timeLabel = formatCardClock(report.createdAt);

  const actionBg = isLiveAction
    ? historyTheme.primaryMuted
    : statusPresentation.muted;
  const actionColor = isLiveAction
    ? historyTheme.primary
    : statusPresentation.color;
  const actionBorder = isLiveAction
    ? historyTheme.primary
    : statusPresentation.border;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.982, { damping: 18, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      style={[styles.card, cardShell, animatedStyle]}
      android_ripple={{ color: "rgba(128, 128, 128, 0.14)", borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}, ${statusPresentation.label}, ${report.locationText || "location unavailable"}`}
      accessibilityHint="Opens report details"
    >
      <View style={[styles.accentBar, { backgroundColor: statusAccent }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconShell}>
            <IncidentIconBadge meta={meta} size="md" />
          </View>

          <View style={styles.headerText}>
            {featured ? (
              <View style={styles.liveRow}>
                <Radio size={10} color={historyTheme.emergency} strokeWidth={2.5} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            ) : null}
            <Text style={styles.title} numberOfLines={1}>
              {meta.label}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Report {reportId}
            </Text>
          </View>

          <StatusChip status={report.status} size={featured ? "md" : "sm"} />
        </View>

        <View style={styles.metaPanel}>
          <View style={styles.inlineMeta}>
            <View style={styles.inlineMetaItem}>
              <Calendar size={14} color={historyTheme.textSecondary} strokeWidth={2.2} />
              <Text style={styles.inlineMetaText} numberOfLines={1}>
                {dateLabel}
              </Text>
            </View>
            <View style={styles.inlineDivider} />
            <View style={styles.inlineMetaItem}>
              <Clock3 size={14} color={historyTheme.textSecondary} strokeWidth={2.2} />
              <Text style={styles.inlineMetaText} numberOfLines={1}>
                {timeLabel}
              </Text>
            </View>
          </View>

          <MetaLine icon={MapPin} theme={historyTheme} styles={styles}>
            {report.locationText || "Location unavailable"}
          </MetaLine>

          {reportSource ? (
            <MetaLine icon={Smartphone} theme={historyTheme} styles={styles}>
              Reported via {reportSource}
            </MetaLine>
          ) : null}
        </View>

        <View style={styles.footerBar}>
          <View style={styles.footerMeta}>
            {agency ? (
              <View style={styles.footerMetaRow}>
                <Building2 size={13} color={historyTheme.textSecondary} strokeWidth={2.2} />
                <Text style={styles.footerMetaText} numberOfLines={1}>
                  {agency}
                </Text>
              </View>
            ) : (
              <View style={styles.footerMetaRow}>
                <Hash size={13} color={historyTheme.textSecondary} strokeWidth={2.2} />
                <Text style={styles.footerMetaText} numberOfLines={1}>
                  {reportId}
                </Text>
              </View>
            )}
            {responseDuration ? (
              <View style={styles.footerMetaRow}>
                <Timer size={13} color={historyTheme.textSecondary} strokeWidth={2.2} />
                <Text style={styles.footerMetaText} numberOfLines={1}>
                  {responseDuration}
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.actionBtn,
              {
                backgroundColor: actionBg,
                borderWidth: 1,
                borderColor: actionBorder,
              },
            ]}
          >
            {isLiveAction ? (
              <Navigation size={14} color={actionColor} strokeWidth={2.4} />
            ) : null}
            <Text style={[styles.actionLabel, { color: actionColor }]} numberOfLines={1}>
              {actionPresentation.shortLabel || actionPresentation.label}
            </Text>
            <ChevronRight size={16} color={actionColor} strokeWidth={2.4} />
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default memo(PremiumIncidentCard);
