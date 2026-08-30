import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Shield,
  Radio,
  ExternalLink,
} from "lucide-react-native";
import { getIncidentMeta } from "@/features/history/constants";
import {
  getCivilianStatusColor,
  getCivilianStatusShortLabel,
} from "@/features/emergency/utils/incidentStatus";

export default function OngoingIncidentFloatingCard({
  incident,
  theme,
  onOpenDetails,
  onCallDispatcher,
  onMessageDispatcher,
  onCallResponder,
}) {
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);

  if (!incident) return null;

  const meta = getIncidentMeta(incident.incidentType, incident.typeProfile) || {};
  const Icon = meta.Icon || meta.icon || AlertTriangle;

  const statusLabel = getCivilianStatusShortLabel(incident);
  const statusColor = getCivilianStatusColor(incident);

  const isResponderAssigned = Boolean(incident.responder || incident.assignedResponderId);
  const responderName = incident.responderName || incident.responder || "Assigned Unit";

  const refNumber = incident.id ? `APP-${incident.id.slice(-5).toUpperCase()}` : "APP-INCIDENT";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1E293B", "#0F172A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: "rgba(56, 189, 248, 0.4)",
            shadowColor: "#000",
          },
        ]}
      >
        {/* Top Header Row (Always Visible) */}
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          style={styles.headerRow}
          accessibilityRole="button"
          accessibilityLabel={`Ongoing emergency ${meta.label}, status: ${statusLabel}`}
        >
          <View style={[styles.iconWrap, { backgroundColor: meta.badgeBg || "rgba(255, 59, 48, 0.16)" }]}>
            {Icon && <Icon size={18} color={meta.iconColor || "#EF4444"} strokeWidth={2.4} />}
          </View>

          <View style={styles.headerTextCol}>
            <View style={styles.titleRow}>
              <Text style={styles.typeTitle} numberOfLines={1}>
                {meta.label}
              </Text>
              <View style={styles.refBadge}>
                <Text style={styles.refBadgeText}>{refNumber}</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.expandBtn}>
            {expanded ? (
              <ChevronUp size={18} color="#94A3B8" />
            ) : (
              <ChevronDown size={18} color="#94A3B8" />
            )}
          </View>
        </Pressable>

        {/* Collapsed Quick Actions */}
        {!expanded && (
          <View style={styles.quickActionRow}>
            <Pressable
              onPress={onCallDispatcher}
              style={[styles.actionPill, styles.actionPillCall]}
              accessibilityRole="button"
              accessibilityLabel="Call dispatcher"
            >
              <Phone size={13} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.actionPillTextCall}>Call Dispatcher</Text>
            </Pressable>

            <Pressable
              onPress={onMessageDispatcher}
              style={[styles.actionPill, styles.actionPillMsg]}
              accessibilityRole="button"
              accessibilityLabel="Message dispatcher"
            >
              <MessageSquare size={13} color="#38BDF8" strokeWidth={2.2} />
              <Text style={styles.actionPillTextMsg}>Message</Text>
            </Pressable>

            {isResponderAssigned && onCallResponder && (
              <Pressable
                onPress={onCallResponder}
                style={[styles.actionPill, styles.actionPillResp]}
                accessibilityRole="button"
                accessibilityLabel="Call responder"
              >
                <Radio size={13} color="#F59E0B" strokeWidth={2.2} />
                <Text style={styles.actionPillTextResp}>Call Unit</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Expanded Details View */}
        {expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            {/* Location & Details */}
            {incident.locationText && (
              <View style={styles.detailRow}>
                <MapPin size={14} color="#94A3B8" style={styles.detailIcon} />
                <Text style={styles.detailText} numberOfLines={2}>
                  {incident.locationText}
                </Text>
              </View>
            )}

            {incident.landmark && (
              <View style={styles.detailRow}>
                <Shield size={14} color="#94A3B8" style={styles.detailIcon} />
                <Text style={styles.detailText} numberOfLines={1}>
                  Landmark: {incident.landmark}
                </Text>
              </View>
            )}

            {/* Assigned Unit Banner */}
            {isResponderAssigned && (
              <View style={styles.unitBanner}>
                <View style={styles.unitIconWrap}>
                  <Radio size={14} color="#10B981" />
                </View>
                <View style={styles.unitCol}>
                  <Text style={styles.unitTitle}>Assigned Response Unit</Text>
                  <Text style={styles.unitName}>{responderName}</Text>
                </View>
              </View>
            )}

            {/* Full Action Buttons Grid */}
            <View style={styles.expandedActionsGrid}>
              <Pressable
                onPress={onCallDispatcher}
                style={[styles.expandedBtn, { backgroundColor: "#10B981" }]}
                accessibilityRole="button"
              >
                <Phone size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.expandedBtnText}>Call Dispatch</Text>
              </Pressable>

              <Pressable
                onPress={onMessageDispatcher}
                style={[styles.expandedBtn, { backgroundColor: "#0284C7" }]}
                accessibilityRole="button"
              >
                <MessageSquare size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.expandedBtnText}>Live Chat</Text>
              </Pressable>

              {isResponderAssigned && onCallResponder && (
                <Pressable
                  onPress={onCallResponder}
                  style={[styles.expandedBtn, { backgroundColor: "#D97706" }]}
                  accessibilityRole="button"
                >
                  <Radio size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.expandedBtnText}>Call Unit</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => onOpenDetails?.(incident)}
                style={[
                  styles.expandedBtn,
                  { backgroundColor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(255,255,255,0.15)", borderWidth: 1 },
                ]}
                accessibilityRole="button"
              >
                <ExternalLink size={15} color="#E2E8F0" strokeWidth={2.2} />
                <Text style={[styles.expandedBtnText, { color: "#E2E8F0" }]}>Full Status</Text>
              </Pressable>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  refBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    borderWidth: 0.8,
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  refBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#38BDF8",
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  expandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionPillCall: {
    backgroundColor: "#10B981",
  },
  actionPillTextCall: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionPillMsg: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
  },
  actionPillTextMsg: {
    fontSize: 11,
    fontWeight: "700",
    color: "#38BDF8",
  },
  actionPillResp: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  actionPillTextResp: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  detailIcon: {
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
    color: "#CBD5E1",
    lineHeight: 17,
  },
  unitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 12,
    padding: 10,
    marginVertical: 8,
  },
  unitIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  unitCol: {
    flex: 1,
  },
  unitTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6EE7B7",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  unitName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  expandedActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  expandedBtn: {
    flexGrow: 1,
    flexBasis: "47%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  expandedBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
