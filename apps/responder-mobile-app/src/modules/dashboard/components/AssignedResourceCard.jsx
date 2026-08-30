import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ambulance, Radio, Truck } from "lucide-react-native";
import { radii, spacing } from "@/theme";

const TYPE_LABEL = {
  AMBULANCE: "Ambulance",
  BFP: "Fire truck",
  PNP: "Police unit",
  MDRRMO: "MDRRMO unit",
  PCG: "Coast guard",
  OTHER: "Other",
};

const STATUS_LABEL = {
  available: "Available",
  assigned: "Assigned",
  en_route: "En Route",
  on_scene: "On Scene",
  maintenance: "Maintenance",
  offline: "Offline",
};

const iconForType = (type) => (type === "AMBULANCE" ? Ambulance : Truck);

/**
 * Read-only card showing the resource Command Center assigned to this account.
 * No picker, edit, or switch controls — assignment is CC-managed only.
 */
export default function AssignedResourceCard({ D, assignedResource, isLoading, error }) {
  const styles = useMemo(() => buildStyles(D), [D]);
  const ResourceIcon = iconForType(assignedResource?.type);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ASSIGNED RESOURCE</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={D.accent} size="small" />
          <Text style={styles.loadingText}>Loading assignment…</Text>
        </View>
      </View>
    );
  }

  if (!assignedResource) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ASSIGNED RESOURCE</Text>
        <Text style={styles.emptyTitle}>No Resource Assigned</Text>
        <Text style={styles.emptyText}>
          Your Command Center has not assigned a resource to this responder account.
        </Text>
        <Text style={styles.emptyHint}>
          Contact your dispatcher or Command Center.
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  const statusLabel =
    STATUS_LABEL[assignedResource.status] ??
    String(assignedResource.status || "Unknown").replace(/_/g, " ");

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>ASSIGNED RESOURCE</Text>

      <View style={styles.activeRow}>
        <View style={[styles.iconWell, { backgroundColor: D.chipBg }]}>
          <ResourceIcon size={22} color={D.accent} />
        </View>
        <View style={styles.activeText}>
          <Text style={styles.activeName} numberOfLines={2}>
            {assignedResource.name}
          </Text>
          {assignedResource.resourceCode ? (
            <Text style={styles.resourceCode} numberOfLines={1}>
              {assignedResource.resourceCode}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.metaGrid}>
        {assignedResource.agency ? (
          <MetaRow label="Agency" value={assignedResource.agency} styles={styles} D={D} />
        ) : null}
        {(assignedResource.teamName || assignedResource.teamId) ? (
          <MetaRow
            label="Team"
            value={assignedResource.teamName || assignedResource.teamId}
            styles={styles}
            D={D}
          />
        ) : null}
        {assignedResource.stationName ? (
          <MetaRow label="Base" value={assignedResource.stationName} styles={styles} D={D} />
        ) : null}
        <MetaRow label="Status" value={statusLabel} styles={styles} D={D} highlight />
      </View>

      <View style={styles.roleRow}>
        <Radio size={13} color={D.statOnline} />
        <Text style={styles.roleText}>GPS tracking this unit</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function MetaRow({ label, value, styles, D, highlight = false }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text
        style={[styles.metaValue, highlight && { color: D.statOnline }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const buildStyles = (D) =>
  StyleSheet.create({
    card: {
      backgroundColor: D.visualScheme === "light" ? "#FFFFFF" : D.surfaceCard,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: D.textMuted,
      marginBottom: spacing.sm,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    loadingText: { fontSize: 12, color: D.textSecondary },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: D.textPrimary,
      marginBottom: spacing.xs,
    },
    emptyText: {
      fontSize: 12,
      color: D.textSecondary,
      lineHeight: 18,
    },
    emptyHint: {
      fontSize: 11,
      color: D.textMuted,
      marginTop: spacing.sm,
    },
    activeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    iconWell: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
    },
    activeText: { flex: 1, minWidth: 0 },
    activeName: { fontSize: 15, fontWeight: "700", color: D.textPrimary },
    resourceCode: {
      fontSize: 12,
      fontWeight: "600",
      color: D.textSecondary,
      marginTop: 2,
    },
    metaGrid: { gap: spacing.xs, marginBottom: spacing.sm },
    metaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    metaLabel: {
      width: 56,
      fontSize: 11,
      fontWeight: "600",
      color: D.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    metaValue: {
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
      color: D.textPrimary,
    },
    roleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.xs,
    },
    roleText: { fontSize: 11, color: D.textMuted, flex: 1 },
    errorText: { fontSize: 12, color: "#f87171", marginTop: spacing.sm },
  });
