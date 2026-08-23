import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ChevronLeft,
  Share2,
  PhoneCall,
  Clock,
  MapPin,
  AlertTriangle,
  Radio,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react-native";
import { getAdvisory, ADVISORY_CATEGORIES } from "@packages/firebase";
import { useAppTheme } from "@/hooks/useAppTheme";
import { openEmergencyHotline } from "@/utils/emergencyHotline";

const SEVERITY_METAS = {
  critical: {
    bg: "#450a0a",
    border: "#ef4444",
    badgeBg: "#ef4444",
    badgeText: "#ffffff",
    title: "CRITICAL ALERT",
    iconColor: "#f87171",
  },
  severe: {
    bg: "#431407",
    border: "#f97316",
    badgeBg: "#f97316",
    badgeText: "#ffffff",
    title: "SEVERE WARNING",
    iconColor: "#fb923c",
  },
  moderate: {
    bg: "#451a03",
    border: "#f59e0b",
    badgeBg: "#f59e0b",
    badgeText: "#18181b",
    title: "MODERATE ADVISORY",
    iconColor: "#fbbf24",
  },
  info: {
    bg: "#082f49",
    border: "#0ea5e9",
    badgeBg: "#0ea5e9",
    badgeText: "#ffffff",
    title: "PUBLIC NOTICE",
    iconColor: "#38bdf8",
  },
};

export default function AdvisoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const [advisory, setAdvisory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getAdvisory(String(id))
      .then((data) => {
        if (isMounted) {
          setAdvisory(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load advisory:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleShare = async () => {
    if (!advisory) return;
    try {
      await Share.share({
        title: advisory.title,
        message: `🚨 [${advisory.severity?.toUpperCase()} ADVISORY] ${advisory.title}\n\n${advisory.summary || advisory.content}\n\nIssued by RESQ-Link Command Center`,
      });
    } catch (error) {
      console.warn("Share error:", error);
    }
  };

  const formatDate = (val) => {
    if (!val) return "N/A";
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const severityKey = String(advisory?.severity || "info").toLowerCase();
  const severityMeta = SEVERITY_METAS[severityKey] || SEVERITY_METAS.info;
  const categoryMeta =
    ADVISORY_CATEGORIES[advisory?.category] || { label: "Public Bulletin" };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor={severityMeta.bg} />

      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: severityMeta.bg,
            borderBottomColor: severityMeta.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#ffffff" />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerBadgeText}>{severityMeta.title}</Text>
          <Text style={styles.headerSubText} numberOfLines={1}>
            Official Public Advisory
          </Text>
        </View>

        <Pressable
          onPress={handleShare}
          style={styles.headerBtn}
          accessibilityLabel="Share advisory"
        >
          <Share2 size={20} color="#ffffff" />
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading official notice...
          </Text>
        </View>
      ) : !advisory ? (
        <View style={styles.centerContainer}>
          <AlertTriangle size={48} color={colors.textMuted} />
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>
            Advisory Not Found
          </Text>
          <Text style={[styles.notFoundSub, { color: colors.textMuted }]}>
            This public bulletin may have been removed or expired.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card }]}
          >
            <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold" }}>
              Return to Dashboard
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Severity & Category Chips */}
          <View style={styles.chipRow}>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: severityMeta.badgeBg },
              ]}
            >
              <Text
                style={[
                  styles.severityBadgeText,
                  { color: severityMeta.badgeText },
                ]}
              >
                {severityMeta.title}
              </Text>
            </View>

            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                {categoryMeta.label}
              </Text>
            </View>
          </View>

          {/* Main Title */}
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {advisory.title}
          </Text>

          {/* Metadata Card: Issued / Valid Until / Issued By */}
          <View
            style={[
              styles.metaCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.metaRow}>
              <Clock size={16} color={colors.textMuted} />
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                Issued:
              </Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {formatDate(advisory.effectiveAt || advisory.createdAt)}
              </Text>
            </View>

            {advisory.expiresAt && (
              <View style={styles.metaRow}>
                <Clock size={16} color={colors.textMuted} />
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                  Valid Until:
                </Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {formatDate(advisory.expiresAt)}
                </Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <Radio size={16} color={colors.textMuted} />
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                Issuer:
              </Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {advisory.createdBy?.name || "Command Center"}
              </Text>
            </View>
          </View>

          {/* Target Area Card */}
          <View
            style={[
              styles.areaCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.areaHeader}>
              <MapPin size={18} color={severityMeta.iconColor} />
              <Text style={[styles.areaTitle, { color: colors.text }]}>
                Affected Target Area
              </Text>
            </View>
            <Text style={[styles.areaBody, { color: colors.textMuted }]}>
              {advisory.targetScope === "all"
                ? "City-wide advisory applicable to all barangays and residents."
                : `Targeted Sectors: ${
                    advisory.targetBarangays?.join(", ") || "Designated zones"
                  }`}
            </Text>
          </View>

          {/* Detailed Instructions / Body Content */}
          <View
            style={[
              styles.contentCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Instructions & Safety Guidelines
            </Text>
            <Text style={[styles.contentText, { color: colors.text }]}>
              {advisory.content}
            </Text>
          </View>

          {/* Emergency Hotline Action Bar */}
          <Pressable
            onPress={openEmergencyHotline}
            style={({ pressed }) => [
              styles.hotlineBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <PhoneCall size={20} color="#ffffff" />
            <Text style={styles.hotlineBtnText}>Contact Emergency Hotline 911</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#ffffff",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerSubText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginTop: 12,
  },
  notFoundTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginTop: 16,
  },
  notFoundSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  backBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  mainTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  metaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    width: 75,
  },
  metaValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    flex: 1,
  },
  areaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  areaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  areaTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  areaBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  contentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginBottom: 10,
  },
  contentText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  hotlineBtn: {
    backgroundColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#dc2626",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  hotlineBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#ffffff",
  },
});
