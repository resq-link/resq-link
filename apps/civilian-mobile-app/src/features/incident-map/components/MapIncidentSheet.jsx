import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Check } from "lucide-react-native";
import {
  buildCivilianActivityFeed,
  buildCivilianTimeline,
} from "@/features/incident-map/utils/civilianMapPresentation";

function SectionLabel({ children, theme }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
      {children}
    </Text>
  );
}

function TimelineStep({ step, theme, index }) {
  const isComplete = step.state === "complete";
  const isCurrent = step.state === "current";

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(280)}
      style={styles.timelineRow}
    >
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.timelineDot,
            {
              backgroundColor: isCurrent
                ? theme.primary
                : isComplete
                  ? theme.primarySoft
                  : theme.border,
              borderColor: isCurrent || isComplete ? theme.primary : theme.border,
            },
          ]}
        >
          {isComplete ? (
            <Check size={8} color={theme.primary} strokeWidth={3} />
          ) : isCurrent ? (
            <View style={[styles.currentDotInner, { backgroundColor: "#FFFFFF" }]} />
          ) : null}
        </View>
      </View>
      <Text
        style={[
          styles.timelineLabel,
          {
            color: isCurrent ? theme.text : theme.textSecondary,
            fontFamily: isCurrent ? "Inter_700Bold" : "Inter_400Regular",
            opacity: step.state === "upcoming" ? 0.55 : 1,
          },
        ]}
        numberOfLines={1}
      >
        {step.label}
      </Text>
    </Animated.View>
  );
}

function ActivityEntry({ entry, theme, isLast }) {
  return (
    <View
      style={[
        styles.activityRow,
        !isLast && {
          borderBottomColor: theme.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={[styles.activityTime, { color: theme.textSecondary }]}>
        {entry.timeLabel}
      </Text>
      <Text style={[styles.activityMessage, { color: theme.text }]}>
        {entry.message}
      </Text>
    </View>
  );
}

function MapIncidentSheet({ theme, isLight, report, bottomInset }) {
  const timeline = useMemo(() => buildCivilianTimeline(report), [report]);
  const activityFeed = useMemo(() => buildCivilianActivityFeed(report), [report]);

  const cardInner = theme.cardInner ?? (isLight ? "#F2F2F7" : "#2A2A2A");
  const sheetTheme = { ...theme, cardInner };

  return (
    <BottomSheetScrollView
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingBottom: bottomInset + 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <SectionLabel theme={theme}>LIVE INCIDENT TIMELINE</SectionLabel>
      <View
        style={[
          styles.panel,
          { backgroundColor: theme.sheetBg ?? theme.card, borderColor: theme.border },
        ]}
      >
        {timeline.map((step, index) => (
          <TimelineStep
            key={step.key}
            step={step}
            theme={sheetTheme}
            index={index}
          />
        ))}
      </View>

      {activityFeed.length > 0 ? (
        <>
          <SectionLabel theme={theme}>LIVE UPDATES</SectionLabel>
          <View
            style={[
              styles.panel,
              { backgroundColor: theme.sheetBg ?? theme.card, borderColor: theme.border },
            ]}
          >
            {activityFeed.map((entry, index) => (
              <ActivityEntry
                key={entry.id}
                entry={entry}
                theme={theme}
                isLast={index === activityFeed.length - 1}
              />
            ))}
          </View>
        </>
      ) : null}
    </BottomSheetScrollView>
  );
}

export default memo(MapIncidentSheet);

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 2,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineRail: {
    width: 18,
    alignItems: "center",
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  currentDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineLabel: {
    flex: 1,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  activityRow: {
    paddingVertical: 10,
    gap: 4,
  },
  activityTime: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  activityMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
});
