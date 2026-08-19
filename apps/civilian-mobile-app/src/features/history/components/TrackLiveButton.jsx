import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ChevronRight, Navigation } from "lucide-react-native";
import { getTrackButtonPresentation } from "@/features/history/constants";
import { historyTypography } from "@/features/history/constants/typography";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

function TrackLiveButton({ status, highlighted = false }) {
  const { historyTheme } = useAppTheme();
  const presentation = getTrackButtonPresentation(status, historyTheme);
  const isLive =
    presentation.variant === "gradient" && presentation.showNavigationIcon;

  const styles = useThemedStyles(
    (t) => ({
      wrap: {
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        paddingTop: 2,
      },
      action: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
        minHeight: 36,
        minWidth: 44,
        justifyContent: "center",
      },
      actionLive: {
        backgroundColor: t.primaryMuted,
      },
      actionMuted: {
        backgroundColor: highlighted ? t.mutedSurface : "transparent",
      },
      label: {
        fontFamily: "Inter_600SemiBold",
        fontSize: historyTypography.cardFooter,
        letterSpacing: 0.05,
      },
      labelLive: {
        color: t.primary,
      },
      labelDefault: {
        color: t.textSecondary,
      },
    }),
    historyTheme
  );

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.action,
          isLive ? styles.actionLive : styles.actionMuted,
        ]}
      >
        {isLive ? (
          <Navigation size={14} color={historyTheme.primary} strokeWidth={2.4} />
        ) : null}
        <Text
          style={[
            styles.label,
            isLive ? styles.labelLive : styles.labelDefault,
          ]}
          numberOfLines={1}
        >
          {presentation.shortLabel || presentation.label}
        </Text>
        <ChevronRight
          size={16}
          color={isLive ? historyTheme.primary : historyTheme.textSecondary}
          strokeWidth={2.4}
        />
      </View>
    </View>
  );
}

export default memo(TrackLiveButton);
