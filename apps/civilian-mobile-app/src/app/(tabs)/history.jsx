import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Clock, ChevronLeft } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import useUserStore from "@/utils/userStore";
import { UI_MODE, mockData } from "@/utils/api";
import { getUserEmergencyReports } from "@packages/firebase";
import { useAppTheme } from "@/utils/useAppTheme";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isLight } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        // Simulate API delay for realistic UI testing
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log("≡ƒÄ¿ UI MODE: Using mock history data");
        setReports(mockData.emergencyList.reports);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch reports from Firestore
      const userId = user.uid || user.id;
      if (!userId) {
        console.error("User ID not found");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const reports = await getUserEmergencyReports(userId, 100);
      
      // Convert to expected format
      const formattedReports = reports.map(report => ({
        id: report.id,
        incident_type: report.incidentType,
        location_text: report.locationText,
        status: report.status,
        description: report.description || null,
        created_at: report.createdAt instanceof Date 
          ? report.createdAt.toISOString() 
          : (report.createdAt ? new Date(report.createdAt).toISOString() : new Date().toISOString()),
      }));
      
      setReports(formattedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  if (!fontsLoaded) {
    return null;
  }

  const getIncidentEmoji = (type) => {
    const map = {
      fire: "≡ƒöÑ",
      medical: "≡ƒÜæ",
      crime: "≡ƒÜô",
      accident: "≡ƒÜù",
      flood: "≡ƒîè",
      other: "ΓÜí",
    };
    return map[type] || "≡ƒôì";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#FF9500";
      case "responding":
        return "#007AFF";
      case "resolved":
        return "#9AFF55";
      default:
        return "#9A9A9A";
    }
  };

  const getStatusBadgeStyle = (status) => {
    const normalizedStatus = (status || "").toLowerCase();
    if (!isLight) {
      const color = getStatusColor(normalizedStatus);
      return {
        backgroundColor: color + "20",
        textColor: color,
      };
    }

    switch (normalizedStatus) {
      case "pending":
        return { backgroundColor: "#FFF4E5", textColor: "#B35A00" };
      case "responding":
        return { backgroundColor: "#E8F0FF", textColor: "#0B57D0" };
      case "resolved":
        return { backgroundColor: "#E8F7ED", textColor: "#1E7A35" };
      default:
        return { backgroundColor: "#EEEEF2", textColor: "#616168" };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 96,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9AFF55"
          />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push("/dashboard")}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>History</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {reports.length} {reports.length === 1 ? "Report" : "Reports"}
        </Text>

        {loading ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Loading reports...
            </Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color="#5A5A5A" style={{ marginBottom: 16 }} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
                color: colors.text,
                marginBottom: 8,
              }}
            >
              No Reports Yet
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Your emergency reports will appear here
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {reports.map((report, index) => {
              const badgeStyle = getStatusBadgeStyle(report.status);
              return (
                <View
                  key={report.id}
                  style={[
                    styles.reportRow,
                    { borderBottomColor: colors.separator },
                    index === reports.length - 1 && styles.lastReportRow,
                  ]}
                >
                  <View style={styles.reportTop}>
                    <View style={styles.reportTitleBlock}>
                      <Text style={styles.emoji}>{getIncidentEmoji(report.incident_type)}</Text>
                      <View style={styles.reportTitleText}>
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 16,
                            color: colors.text,
                            marginBottom: 2,
                          }}
                        >
                          {report.incident_type.charAt(0).toUpperCase() +
                            report.incident_type.slice(1)}{" "}
                          Emergency
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 12,
                            color: colors.textSecondary,
                          }}
                        >
                          {formatDate(report.created_at)}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        backgroundColor: badgeStyle.backgroundColor,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 12,
                          color: badgeStyle.textColor,
                        }}
                      >
                        {report.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 14,
                      color: colors.text,
                      marginTop: 12,
                    }}
                  >
                    ≡ƒôì {report.location_text}
                  </Text>
                  {report.description && (
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 14,
                        color: colors.textSecondary,
                        marginTop: 8,
                      }}
                    >
                      {report.description}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    marginLeft: 8,
  },
  headerSpacer: {
    width: 36,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  reportRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  lastReportRow: {
    borderBottomWidth: 0,
  },
  reportTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  reportTitleText: {
    flex: 1,
    marginRight: 10,
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 20,
    minHeight: 180,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
  },
});
