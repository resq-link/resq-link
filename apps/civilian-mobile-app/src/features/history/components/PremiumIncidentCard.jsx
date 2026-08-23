import React, { memo, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import {
  Building2,
  Calendar,
  ChevronRight,
  Clock3,
  Flame,
  Hash,
  MapPin,
  Navigation,
  Radio,
  Shield,
  Smartphone,
  Timer,
  Zap,
} from "lucide-react-native";
import {
  getCardStatusAccent,
  getIncidentMeta,
  getStatusPresentation,
  getTrackButtonPresentation,
  isActiveReport,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PremiumIncidentCard({ report, onPress, featured = false }) {
  const { historyTheme, isLight } = useAppTheme();
  const scale = useSharedValue(1);

  const statusPresentation = getStatusPresentation(
    report.status,
    historyTheme,
    isLight
  );
  const statusAccent = getCardStatusAccent(report.status, historyTheme, isLight);
  const isLiveMission = statusPresentation.isLiveDispatch === true;
  const isDeclined = statusPresentation.tagText === "DECLINED";

  const meta = getIncidentMeta(report.incidentType, report.typeProfile);
  const reportId = formatReportId(report);
  const agency = formatAgencyLabel(report);
  const responseDuration = formatResponseDuration(report);
  const reportSource = formatReportSource(report);
  const dateLabel = formatCardDate(report.createdAt);
  const timeLabel = formatCardClock(report.createdAt);

  const styles = useThemedStyles(
    (t) => ({
      cardContainer: {
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: isLiveMission
          ? isLight
            ? "rgba(220, 38, 38, 0.35)"
            : "rgba(255, 69, 58, 0.45)"
          : t.border,
        shadowColor: isLiveMission ? statusAccent : t.shadow,
        shadowOffset: { width: 0, height: isLiveMission ? 4 : 2 },
        shadowOpacity: isLiveMission ? (isLight ? 0.16 : 0.28) : isLight ? 0.06 : 0.15,
        shadowRadius: isLiveMission ? 12 : 6,
        elevation: isLiveMission ? 4 : 2,
        overflow: "hidden",
      },
      cardInner: {
        flexDirection: "row",
      },
      telemetryStripe: {
        width: 5,
        backgroundColor: statusAccent,
      },
      mainBody: {
        flex: 1,
        padding: 14,
        gap: 10,
      },
      headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      },
      titleGroup: {
        flex: 1,
        minWidth: 0,
        gap: 2,
      },
      callsignRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      },
      callsignTag: {
        fontFamily: "Inter_700Bold",
        fontSize: 10,
        color: t.textSecondary,
        letterSpacing: 0.4,
      },
      liveIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 4,
        backgroundColor: isLight ? "rgba(220, 38, 38, 0.1)" : "rgba(255, 69, 58, 0.2)",
      },
      liveIndicatorText: {
        fontFamily: "Inter_700Bold",
        fontSize: 9,
        color: isLight ? "#DC2626" : "#FF5247",
        letterSpacing: 0.5,
      },
      titleText: {
        fontFamily: "Inter_700Bold",
        fontSize: 15,
        color: t.text,
        letterSpacing: -0.2,
      },
      detailsBox: {
        borderRadius: 10,
        backgroundColor: isLight ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 6,
      },
      locationRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 7,
      },
      locationText: {
        flex: 1,
        fontFamily: "Inter_500Medium",
        fontSize: 12,
        color: t.text,
        lineHeight: 16,
      },
      telemetryGrid: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
        paddingTop: 2,
      },
      telemetryItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      },
      telemetryText: {
        fontFamily: "Inter_500Medium",
        fontSize: 11,
        color: t.textSecondary,
      },
      declinedText: {
        fontFamily: "Inter_500Medium",
        fontSize: 11,
        color: isLight ? "#DC2626" : "#FF5247",
      },
      agencyBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.07)",
      },
      agencyText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 10.5,
        color: t.text,
      },
      footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 2,
      },
      footerDuration: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      },
      footerDurationText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 11,
        color: isLight ? "#059669" : "#34D399",
      },
      liveActionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: isLight ? "#DC2626" : "#EF4444",
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
      },
      liveActionText: {
        fontFamily: "Inter_700Bold",
        fontSize: 12,
        color: "#FFFFFF",
        letterSpacing: 0.4,
        textTransform: "uppercase",
      },
      neutralActionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingVertical: 4,
        paddingHorizontal: 6,
      },
      neutralActionText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 11.5,
        color: t.primary,
      },
    }),
    historyTheme
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 18, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      style={[styles.cardContainer, animatedStyle]}
      android_ripple={{ color: "rgba(128, 128, 128, 0.12)", borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}, ${statusPresentation.label}, ${report.locationText || "location unavailable"}`}
      accessibilityHint="Opens incident details"
    >
      <View style={styles.cardInner}>
        <View style={styles.telemetryStripe} />

        <View style={styles.mainBody}>
          <View style={styles.headerRow}>
            <IncidentIconBadge meta={meta} size="md" />

            <View style={styles.titleGroup}>
              <View style={styles.callsignRow}>
                <Text style={styles.callsignTag}>{reportId}</Text>
                {isLiveMission ? (
                  <View style={styles.liveIndicator}>
                    <Radio size={9} color={isLight ? "#DC2626" : "#FF5247"} strokeWidth={2.6} />
                    <Text style={styles.liveIndicatorText}>LIVE MISSION</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.titleText} numberOfLines={1}>
                {meta.label}
              </Text>
            </View>

            <StatusChip status={report.status} size={isLiveMission ? "md" : "sm"} />
          </View>

          <View style={styles.detailsBox}>
            <View style={styles.locationRow}>
              <MapPin
                size={13}
                color={isLiveMission ? (isLight ? "#DC2626" : "#FF5247") : historyTheme.textSecondary}
                strokeWidth={2.2}
                style={{ marginTop: 1 }}
              />
              <Text style={styles.locationText} numberOfLines={2}>
                {report.locationText || "Location coordinates on file"}
              </Text>
            </View>

            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryItem}>
                <Calendar size={12} color={historyTheme.textSecondary} strokeWidth={2} />
                <Text style={styles.telemetryText}>{dateLabel}</Text>
              </View>
              <View style={styles.telemetryItem}>
                <Clock3 size={12} color={historyTheme.textSecondary} strokeWidth={2} />
                <Text style={styles.telemetryText}>{timeLabel}</Text>
              </View>
              {agency ? (
                <View style={styles.agencyBadge}>
                  <Building2 size={11} color={historyTheme.text} strokeWidth={2.2} />
                  <Text style={styles.agencyText} numberOfLines={1}>
                    {agency}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.footerRow}>
            {isLiveMission ? (
              <View style={styles.liveActionButton}>
                <Navigation size={13} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={styles.liveActionText}>Track Dispatch Live</Text>
                <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.6} />
              </View>
            ) : (
              <>
                <View style={styles.footerDuration}>
                  {responseDuration ? (
                    <>
                      <Zap size={12} color={isLight ? "#059669" : "#34D399"} strokeWidth={2.4} />
                      <Text style={styles.footerDurationText}>{responseDuration}</Text>
                    </>
                  ) : isDeclined ? (
                    <Text style={styles.declinedText}>Case Closed by Dispatch</Text>
                  ) : reportSource ? (
                    <Text style={styles.telemetryText}>Via {reportSource}</Text>
                  ) : (
                    <Text style={styles.telemetryText}>Incident Recorded</Text>
                  )}
                </View>

                <View style={styles.neutralActionButton}>
                  <Text style={[styles.neutralActionText, isDeclined && { color: historyTheme.textSecondary }]}>
                    {statusPresentation.actionLabel || "View Dossier"}
                  </Text>
                  <ChevronRight size={14} color={isDeclined ? historyTheme.textSecondary : historyTheme.primary} strokeWidth={2.4} />
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default memo(PremiumIncidentCard);

