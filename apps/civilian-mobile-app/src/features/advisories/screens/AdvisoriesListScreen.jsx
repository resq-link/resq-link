import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ChevronLeft,
  Search,
  Megaphone,
  Clock,
  MapPin,
  ChevronRight,
  Filter,
} from "lucide-react-native";
import {
  subscribeToActiveAdvisories,
  ADVISORY_CATEGORIES,
} from "@packages/firebase";
import { useAppTheme } from "@/hooks/useAppTheme";

const SEVERITY_CHIPS = {
  critical: { bg: "#ef4444", text: "#ffffff", label: "CRITICAL" },
  severe: { bg: "#f97316", text: "#ffffff", label: "SEVERE" },
  moderate: { bg: "#f59e0b", text: "#18181b", label: "MODERATE" },
  info: { bg: "#0ea5e9", text: "#ffffff", label: "NOTICE" },
};

const CATEGORY_FILTERS = [
  { key: "all", label: "All Bulletins" },
  { key: "weather", label: "Weather" },
  { key: "flood", label: "Flood" },
  { key: "evacuation", label: "Evacuation" },
  { key: "traffic_road", label: "Traffic & Road" },
  { key: "fire_hazard", label: "Fire" },
  { key: "health", label: "Health" },
  { key: "community", label: "Community" },
];

export default function AdvisoriesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToActiveAdvisories(
      (list) => {
        setAdvisories(list);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error("Advisories subscription error:", err);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsub();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const filteredList = useMemo(() => {
    return advisories.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchSummary = item.summary?.toLowerCase().includes(q);
        const matchBarangays = item.targetBarangays?.some((b) =>
          b.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchSummary && !matchBarangays) return false;
      }
      return true;
    });
  }, [advisories, selectedCategory, searchQuery]);

  const formatDate = (val) => {
    if (!val) return "";
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Public Advisories
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Official broadcasts by Command Center
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search notices, weather, barangays..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Category Pills Strip */}
      <View style={styles.categoryScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setSelectedCategory(cat.key)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: isSelected ? "#ffffff" : colors.text },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading bulletins...
          </Text>
        </View>
      ) : filteredList.length === 0 ? (
        <View style={styles.centerContainer}>
          <Megaphone size={40} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Advisories Found
          </Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            {searchQuery || selectedCategory !== "all"
              ? "No notices match your search or filter."
              : "There are currently no active public alerts."}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 80,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {filteredList.map((item) => {
            const severityKey = String(item.severity || "info").toLowerCase();
            const severityMeta = SEVERITY_CHIPS[severityKey] || SEVERITY_CHIPS.info;
            const categoryMeta =
              ADVISORY_CATEGORIES[item.category] || { label: "Notice" };

            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: "/advisory-detail",
                    params: { id: item.id },
                  })
                }
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.severityTag,
                        { backgroundColor: severityMeta.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityTagText,
                          { color: severityMeta.text },
                        ]}
                      >
                        {severityMeta.label}
                      </Text>
                    </View>

                    <Text style={[styles.categoryTag, { color: colors.textMuted }]}>
                      {categoryMeta.label}
                    </Text>
                  </View>

                  <Text style={[styles.timeText, { color: colors.textMuted }]}>
                    {formatDate(item.effectiveAt || item.createdAt)}
                  </Text>
                </View>

                <Text
                  style={[styles.cardTitle, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <Text
                  style={[styles.cardSummary, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {item.summary || item.content}
                </Text>

                <View style={styles.cardBottomRow}>
                  <View style={styles.scopeWrap}>
                    <MapPin size={12} color={colors.textMuted} />
                    <Text style={[styles.scopeText, { color: colors.textMuted }]}>
                      {item.targetScope === "all"
                        ? "City-wide"
                        : item.targetBarangays?.join(", ") || "Target area"}
                    </Text>
                  </View>

                  <View style={styles.viewPrompt}>
                    <Text style={[styles.viewPromptText, { color: colors.primary }]}>
                      View Guidelines
                    </Text>
                    <ChevronRight size={14} color={colors.primary} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  searchBar: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    paddingVertical: 0,
  },
  categoryScrollWrap: {
    marginBottom: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 10,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  severityTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityTagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  categoryTag: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  timeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardSummary: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(150,150,150,0.15)",
    paddingTop: 8,
  },
  scopeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  scopeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  viewPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewPromptText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
});
