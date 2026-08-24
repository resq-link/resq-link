import { StyleSheet } from "react-native";
import { spacing, radii } from "@/theme";

/** Style factory for dashboard — keeps `DashboardView.jsx` focused on composition. */
export function buildDashboardStyles(D) {
  const light = D.visualScheme === "light";
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: D.bgBottom,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.lg,
    },
    section: {
      marginBottom: spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: light ? "rgba(15, 23, 42, 0.08)" : D.borderSubtle,
      marginBottom: spacing.md,
    },
    statsRow: {
      flexDirection: "row",
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: light ? "rgba(15, 23, 42, 0.10)" : D.borderSubtle,
      backgroundColor: light ? "#FFFFFF" : D.surfaceCard,
      overflow: "hidden",
    },
    activeEmpty: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: light ? "rgba(15, 23, 42, 0.10)" : D.borderSubtle,
      backgroundColor: light ? "#FFFFFF" : D.surfaceCard,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    activeEmptyTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: D.textPrimary,
    },
    activeEmptyText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: D.textSecondary,
      marginTop: 1,
    },
    emptyCopy: {
      flex: 1,
      minWidth: 0,
    },
    listHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    listCount: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: D.textMuted,
    },
    emptyIconWell: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyWrap: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: light ? "rgba(15, 23, 42, 0.10)" : D.borderSubtle,
      backgroundColor: light ? "#FFFFFF" : D.surfaceCard,
      paddingVertical: 14,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    emptyTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: D.textPrimary,
    },
    emptySubtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: D.textSecondary,
      marginTop: 1,
    },
    dutySection: {
      marginTop: 4,
    },
    queueScrollContainer: {
      maxHeight: 410,
    },
  });
}
