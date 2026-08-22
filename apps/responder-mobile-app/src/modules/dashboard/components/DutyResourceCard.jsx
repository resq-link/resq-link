import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  Ambulance,
  Check,
  ChevronRight,
  Radio,
  Truck,
  Users,
  X,
} from "lucide-react-native";
import { radii, spacing } from "@/theme";

const TYPE_LABEL = {
  AMBULANCE: "Ambulance",
  BFP: "Fire truck",
  PNP: "Police unit",
  MDRRMO: "MDRRMO unit",
  PCG: "Coast guard",
  OTHER: "Other",
};

const iconForType = (type) => (type === "AMBULANCE" ? Ambulance : Truck);

const describeResource = (resource) =>
  [TYPE_LABEL[resource?.type] ?? "Unit", resource?.stationName]
    .filter(Boolean)
    .join(" · ");

const crewCount = (resource) => resource?.assignedResponderIds?.length ?? 0;

/**
 * Duty control on the responder dashboard: which vehicle they are crewing, and
 * the picker for choosing one.
 *
 * Vehicles already carrying a crew stay selectable — a second responder joins
 * as crew rather than taking over — so the list distinguishes "available" from
 * "N on board" instead of hiding claimed units.
 */
export default function DutyResourceCard({
  D,
  activeResource,
  claimableResources,
  isPrimary,
  isSaving,
  error,
  clearError,
  onGoOnDuty,
  onGoOffDuty,
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const styles = buildStyles(D);
  const onDuty = Boolean(activeResource);
  const ActiveIcon = iconForType(activeResource?.type);

  const openPicker = () => {
    clearError?.();
    setIsPickerOpen(true);
  };

  const handleSelect = async (resourceId) => {
    const ok = await onGoOnDuty(resourceId);
    if (ok) setIsPickerOpen(false);
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>DUTY STATUS</Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: onDuty ? `${D.statOnline}22` : D.chipBg },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: onDuty ? D.statOnline : D.textMuted },
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: onDuty ? D.statOnline : D.textMuted },
              ]}
            >
              {onDuty ? "ON DUTY" : "OFF DUTY"}
            </Text>
          </View>
        </View>

        {onDuty ? (
          <>
            <View style={styles.activeRow}>
              <View style={[styles.iconWell, { backgroundColor: D.chipBg }]}>
                <ActiveIcon size={22} color={D.accent} />
              </View>
              <View style={styles.activeText}>
                <Text style={styles.activeName} numberOfLines={1}>
                  {activeResource.name}
                </Text>
                <Text style={styles.activeMeta} numberOfLines={1}>
                  {describeResource(activeResource)}
                </Text>
              </View>
            </View>

            <View style={styles.roleRow}>
              <Radio size={13} color={isPrimary ? D.statOnline : D.textMuted} />
              <Text style={styles.roleText}>
                {isPrimary
                  ? "Your GPS is tracking this unit"
                  : "Riding as crew — the primary responder's GPS tracks this unit"}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={openPicker}
                disabled={isSaving}
                style={[styles.secondaryButton, isSaving && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Change vehicle"
              >
                <Text style={styles.secondaryButtonText}>Change unit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onGoOffDuty}
                disabled={isSaving}
                style={[styles.dangerButton, isSaving && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Go off duty"
              >
                <Text style={styles.dangerButtonText}>
                  {isSaving ? "…" : "Go off duty"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.emptyText}>
              Choose the unit you are crewing so dispatch can track it.
            </Text>
            <TouchableOpacity
              onPress={openPicker}
              disabled={isSaving}
              style={[styles.primaryButton, isSaving && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel="Select a unit and go on duty"
            >
              <Text style={styles.primaryButtonText}>Select unit</Text>
              <ChevronRight size={16} color="#06111f" />
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <Modal
        visible={isPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !isSaving && setIsPickerOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Select your unit</Text>
                <Text style={styles.sheetSubtitle}>
                  Units already crewed can be joined
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPickerOpen(false)}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Close unit picker"
              >
                <X size={22} color={D.textSecondary} />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <FlatList
              data={claimableResources}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.sheetList}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>
                  No units are in service right now.
                </Text>
              }
              renderItem={({ item }) => {
                const RowIcon = iconForType(item.type);
                const crew = crewCount(item);
                const isCurrent = item.id === activeResource?.id;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item.id)}
                    disabled={isSaving || isCurrent}
                    style={[styles.row, isCurrent && styles.rowCurrent]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, ${
                      crew === 0 ? "available" : `${crew} on board`
                    }`}
                  >
                    <View style={[styles.iconWell, { backgroundColor: D.chipBg }]}>
                      <RowIcon size={20} color={D.accent} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {describeResource(item)}
                      </Text>
                    </View>
                    {isCurrent ? (
                      <Check size={18} color={D.statOnline} />
                    ) : crew > 0 ? (
                      <View style={styles.crewChip}>
                        <Users size={12} color={D.textMuted} />
                        <Text style={styles.crewChipText}>{crew}</Text>
                      </View>
                    ) : (
                      <Text style={styles.availableText}>Available</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {isSaving ? (
              <View style={styles.savingOverlay}>
                <ActivityIndicator color={D.accent} />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const buildStyles = (D) =>
  StyleSheet.create({
    card: {
      backgroundColor: D.surfaceCard,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.6,
      color: D.textMuted,
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
    activeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    iconWell: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
    },
    activeText: { flex: 1, minWidth: 0 },
    activeName: { fontSize: 17, fontWeight: "700", color: D.textPrimary },
    activeMeta: { fontSize: 12, color: D.textSecondary, marginTop: 2 },
    roleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: spacing.md,
    },
    roleText: { fontSize: 11.5, color: D.textMuted, flex: 1 },
    actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
    secondaryButton: {
      flex: 1,
      height: 42,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: { fontSize: 13, fontWeight: "700", color: D.textSecondary },
    dangerButton: {
      flex: 1,
      height: 42,
      borderRadius: radii.md,
      backgroundColor: "#ef444422",
      borderWidth: 1,
      borderColor: "#ef444466",
      alignItems: "center",
      justifyContent: "center",
    },
    dangerButtonText: { fontSize: 13, fontWeight: "700", color: "#f87171" },
    emptyText: { fontSize: 13, color: D.textSecondary, marginBottom: spacing.lg },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      height: 46,
      borderRadius: radii.md,
      backgroundColor: D.accent,
    },
    primaryButtonText: { fontSize: 14, fontWeight: "800", color: "#06111f" },
    errorText: { fontSize: 12, color: "#f87171", marginTop: spacing.sm },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: D.bgMid,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: spacing.lg,
      maxHeight: "78%",
      borderTopWidth: 1,
      borderColor: D.borderSubtle,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: D.textPrimary },
    sheetSubtitle: { fontSize: 12, color: D.textMuted, marginTop: 3 },
    sheetList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      backgroundColor: D.surfaceCardInner,
      marginBottom: spacing.sm,
    },
    rowCurrent: { borderColor: D.statOnline },
    rowText: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 15, fontWeight: "700", color: D.textPrimary },
    rowMeta: { fontSize: 11.5, color: D.textMuted, marginTop: 2 },
    crewChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: D.chipBg,
    },
    crewChipText: { fontSize: 11, fontWeight: "700", color: D.textMuted },
    availableText: { fontSize: 11, fontWeight: "700", color: D.statOnline },
    emptyListText: {
      fontSize: 13,
      color: D.textMuted,
      textAlign: "center",
      paddingVertical: spacing.xxl,
    },
    savingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    disabled: { opacity: 0.6 },
  });
