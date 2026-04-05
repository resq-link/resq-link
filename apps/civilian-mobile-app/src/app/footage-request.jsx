import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { format } from "date-fns";
import { MapPin, Clock3 } from "lucide-react-native";
import { Calendar } from "react-native-calendars";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import BackButton from "../components/BackButton";
import CustomButton from "../components/CustomButton";
import ErrorAlert from "../components/ErrorAlert";
import LoadingScreen from "../components/LoadingScreen";
import useUserStore from "../utils/userStore";
import { UI_MODE, mockData } from "../utils/api";
import {
  submitFootageRequest,
  subscribeToUserFootageRequests,
  getUserFootageRequests,
  FOOTAGE_PURPOSE_KEYS,
  FOOTAGE_PURPOSE_LABELS,
} from "@packages/firebase";
import { useAppTheme } from "@/utils/useAppTheme";

const PURPOSE_OPTIONS = FOOTAGE_PURPOSE_KEYS.map((id) => ({
  id,
  label: FOOTAGE_PURPOSE_LABELS[id],
}));

function formatSubmittedAt(createdAt) {
  if (!createdAt) return "—";
  try {
    const d =
      createdAt instanceof Date
        ? createdAt
        : typeof createdAt?.toDate === "function"
          ? createdAt.toDate()
          : new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

export default function FootageRequestScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const { colors, isLight } = useAppTheme();

  const [purpose, setPurpose] = useState("");
  const [purposeOtherText, setPurposeOtherText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [notes, setNotes] = useState("");
  const [incidentDate, setIncidentDate] = useState(
    () => format(new Date(), "yyyy-MM-dd")
  );
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHeaderBorder, setShowHeaderBorder] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);
  const [footageHistory, setFootageHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const accent = "#9AFF55";
  const inputBg = isLight ? "#F0F1F5" : "#252525";
  const inputBorder = isLight ? "#D8DAE0" : "#404040";

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: colors.background,
      calendarBackground: colors.background,
      textSectionTitleColor: colors.textSecondary,
      selectedDayBackgroundColor: accent,
      selectedDayTextColor: "#000000",
      todayTextColor: accent,
      dayTextColor: colors.text,
      textDisabledColor: colors.textSecondary,
      dotColor: accent,
      selectedDotColor: "#000000",
      arrowColor: colors.text,
      monthTextColor: colors.text,
      textDayFontFamily: "Inter_400Regular",
      textMonthFontFamily: "Inter_600SemiBold",
      textDayHeaderFontFamily: "Inter_600SemiBold",
    }),
    [colors.background, colors.text, colors.textSecondary]
  );

  const resetFormAfterSubmit = useCallback(() => {
    setPurpose("");
    setPurposeOtherText("");
    setLocationText("");
    setNotes("");
    setIncidentDate(format(new Date(), "yyyy-MM-dd"));
    setLocationStatus(null);
  }, []);

  const loadFootageHistory = useCallback(async () => {
    const userId = user?.uid || user?.id;
    if (!userId) {
      setFootageHistory([]);
      setHistoryLoading(false);
      setHistoryRefreshing(false);
      return;
    }
    if (UI_MODE) {
      setFootageHistory(mockData.footageRequestHistory);
      setHistoryLoading(false);
      setHistoryRefreshing(false);
      return;
    }
    try {
      const list = await getUserFootageRequests(userId, 50);
      setFootageHistory(list);
    } catch (e) {
      console.error("Footage history refresh:", e);
    } finally {
      setHistoryLoading(false);
      setHistoryRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) {
      setFootageHistory([]);
      setHistoryLoading(false);
      return;
    }
    if (UI_MODE) {
      setFootageHistory(mockData.footageRequestHistory);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    const unsub = subscribeToUserFootageRequests(
      (list) => {
        setFootageHistory(list);
        setHistoryLoading(false);
      },
      { userId, limitCount: 50 }
    );
    return () => unsub();
  }, [user]);

  const onHistoryRefresh = useCallback(() => {
    setHistoryRefreshing(true);
    loadFootageHistory();
  }, [loadFootageHistory]);

  const getStatusMeta = (status) => {
    switch (status) {
      case "pending":
        return {
          title: "Under review",
          subtitle: "The command center has not finished reviewing this request yet.",
          border: "#FF9500",
          bg: isLight ? "rgba(255, 149, 0, 0.12)" : "rgba(255, 149, 0, 0.15)",
        };
      case "footage_found":
        return {
          title: "Footage found",
          subtitle: "The command center located footage for this request.",
          border: accent,
          bg: isLight ? "rgba(154, 255, 85, 0.15)" : "rgba(154, 255, 85, 0.12)",
        };
      case "footage_not_found":
        return {
          title: "Footage not found",
          subtitle: "The command center could not find matching footage.",
          border: isLight ? "#8E8E93" : "#636366",
          bg: isLight ? "rgba(142, 142, 147, 0.12)" : "rgba(99, 99, 102, 0.2)",
        };
      default:
        return {
          title: status || "Unknown",
          subtitle: "",
          border: inputBorder,
          bg: inputBg,
        };
    }
  };

  const purposeLineForItem = (item) => {
    const label = FOOTAGE_PURPOSE_LABELS[item.purpose] || item.purpose;
    if (item.purpose === "other" && item.purposeOtherText) {
      return `${label}: ${item.purposeOtherText}`;
    }
    return label;
  };

  const formatAddressFromGeocode = (address, lat, lng) => {
    const street = [address.streetNumber, address.street].filter(Boolean).join(" ");
    const parts = [street, address.city, address.region, address.country].filter(
      Boolean
    );
    if (parts.length) return parts.join(", ");
    if (address.formattedAddress) return address.formattedAddress;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationStatus(null);
    setError("");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission required",
          "Enable location in settings to fill the incident location automatically."
        );
        setLocationStatus("error");
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = coords;

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (addresses?.length) {
          setLocationText(formatAddressFromGeocode(addresses[0], latitude, longitude));
        } else {
          setLocationText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      } catch (geocodeErr) {
        console.error("Reverse geocoding error:", geocodeErr);
        setLocationText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }

      setLocationStatus("success");
    } catch (err) {
      console.error("Location error:", err);
      setLocationStatus("error");
      Alert.alert(
        "Location error",
        "Could not get your current location. Please type the location manually."
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!purpose) {
      setError("Please select a purpose for your request.");
      return;
    }
    if (purpose === "other" && !purposeOtherText.trim()) {
      setError("Please describe the purpose when selecting Others.");
      return;
    }
    if (!locationText.trim()) {
      setError("Location of incident is required.");
      return;
    }
    if (!incidentDate.trim()) {
      setError("Date is required.");
      return;
    }

    const userId = user?.uid || user?.id;
    if (!userId) {
      setError("Please sign in to submit a footage request.");
      return;
    }

    setIsLoading(true);
    try {
      if (UI_MODE) {
        await new Promise((r) => setTimeout(r, 1200));
        const newItem = {
          id: `mock-fr-${Date.now()}`,
          purpose,
          purposeOtherText: purpose === "other" ? purposeOtherText.trim() : null,
          locationText: locationText.trim(),
          incidentDate: incidentDate.trim(),
          status: "pending",
          createdAt: new Date(),
        };
        setFootageHistory((prev) => [newItem, ...prev]);
        resetFormAfterSubmit();
        Alert.alert(
          "Request sent",
          "Your request appears below. You will see updates when the command center responds."
        );
        return;
      }

      await submitFootageRequest({
        userId,
        purpose,
        purposeOtherText: purpose === "other" ? purposeOtherText.trim() : null,
        locationText: locationText.trim(),
        notes: notes.trim() || null,
        incidentDate: incidentDate.trim(),
      });

      resetFormAfterSubmit();
      Alert.alert(
        "Request submitted",
        "Your request appears in the history below. Pull down to refresh; status updates when the command center responds."
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to submit footage request.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <LoadingScreen
        title="Submitting request..."
        subtitle="Please wait"
        variant="login"
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isLight ? "dark" : "light"} />

      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: 20,
          zIndex: 1000,
          borderBottomWidth: showHeaderBorder ? 1 : 0,
          borderBottomColor: inputBorder,
        }}
      >
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <BackButton
            variant="login"
            iconColor={colors.text}
            style={{
              backgroundColor: inputBg,
              borderColor: inputBorder,
            }}
          />
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 28,
            color: colors.text,
          }}
        >
          Footage request
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 8,
          }}
        >
          Request CCTV or evidence footage from the command center.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: insets.top + 200,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) =>
          setShowHeaderBorder(e.nativeEvent.contentOffset.y > 0)
        }
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={historyRefreshing}
            onRefresh={onHistoryRefresh}
            tintColor={accent}
            colors={[accent]}
          />
        }
      >
        <ErrorAlert
          message={error}
          onDismiss={() => setError("")}
          variant="login"
        />

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.text,
            marginBottom: 12,
          }}
        >
          Purpose / reason <Text style={{ color: accent }}>*</Text>
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {PURPOSE_OPTIONS.map((opt) => {
            const selected = purpose === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setPurpose(opt.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: selected ? accent : inputBg,
                  borderWidth: 1,
                  borderColor: selected ? accent : inputBorder,
                  maxWidth: "100%",
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                    color: selected ? "#000000" : colors.text,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {purpose === "other" && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Describe purpose <Text style={{ color: accent }}>*</Text>
            </Text>
            <TextInput
              value={purposeOtherText}
              onChangeText={setPurposeOtherText}
              placeholder="Required when Others is selected"
              placeholderTextColor={colors.textSecondary}
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 15,
                color: colors.text,
                backgroundColor: inputBg,
                borderWidth: 1,
                borderColor: inputBorder,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                minHeight: 44,
              }}
            />
          </View>
        )}

        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: colors.text,
              }}
            >
              Location of incident <Text style={{ color: accent }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={getCurrentLocation}
              disabled={isGettingLocation}
              accessibilityLabel="Use current location"
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor:
                  locationStatus === "success"
                    ? isLight
                      ? "rgba(154, 255, 85, 0.2)"
                      : "rgba(154, 255, 85, 0.12)"
                    : inputBg,
                borderWidth: 1,
                borderColor:
                  locationStatus === "success" ? accent : inputBorder,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                opacity: isGettingLocation ? 0.6 : 1,
              }}
            >
              {isGettingLocation ? (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: accent,
                  }}
                >
                  Getting…
                </Text>
              ) : locationStatus === "success" ? (
                <>
                  <MapPin size={14} color={accent} style={{ marginRight: 4 }} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      color: accent,
                    }}
                  >
                    Location found
                  </Text>
                </>
              ) : (
                <>
                  <MapPin size={14} color={accent} style={{ marginRight: 4 }} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      color: accent,
                    }}
                  >
                    Use current
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <TextInput
            value={locationText}
            onChangeText={(text) => {
              setLocationText(text);
              setLocationStatus(null);
            }}
            placeholder="Street, barangay, landmark…"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              color: colors.text,
              backgroundColor: inputBg,
              borderWidth: 1,
              borderColor:
                locationStatus === "success" ? accent : inputBorder,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              minHeight: 88,
              textAlignVertical: "top",
            }}
          />
        </View>

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.text,
            marginBottom: 8,
          }}
        >
          Notes
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional details (optional)"
          placeholderTextColor={colors.textSecondary}
          multiline
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 15,
            color: colors.text,
            backgroundColor: inputBg,
            borderWidth: 1,
            borderColor: inputBorder,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            minHeight: 100,
            marginBottom: 20,
            textAlignVertical: "top",
          }}
        />

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.text,
            marginBottom: 8,
          }}
        >
          Date of incident <Text style={{ color: accent }}>*</Text>
        </Text>
        <TouchableOpacity
          onPress={() => setDateModalOpen(true)}
          style={{
            backgroundColor: inputBg,
            borderWidth: 1,
            borderColor: inputBorder,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 14,
            marginBottom: 28,
          }}
        >
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.text }}>
            {incidentDate}
          </Text>
        </TouchableOpacity>

        <CustomButton title="Submit request" onPress={handleSubmit} variant="primary" />

        <View
          style={{
            marginTop: 36,
            paddingTop: 28,
            borderTopWidth: 1,
            borderTopColor: inputBorder,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Clock3 size={20} color={accent} style={{ marginRight: 10 }} />
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 20,
                color: colors.text,
              }}
            >
              Your request history
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 20,
              paddingLeft: 30,
            }}
          >
            See when the command center has reviewed your request and the outcome.
          </Text>

          {historyLoading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="small" color={accent} />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginTop: 10,
                }}
              >
                Loading your requests…
              </Text>
            </View>
          ) : footageHistory.length === 0 ? (
            <View
              style={{
                backgroundColor: inputBg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: inputBorder,
                padding: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: colors.text,
                  marginBottom: 6,
                }}
              >
                No requests yet
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.textSecondary }}>
                Submit a footage request above. It will show up here with status updates from the command center.
              </Text>
            </View>
          ) : (
            footageHistory.map((item) => {
              const meta = getStatusMeta(item.status);
              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: inputBg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: inputBorder,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      alignSelf: "flex-start",
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: meta.bg,
                      borderWidth: 1,
                      borderColor: meta.border,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 13,
                        color: colors.text,
                      }}
                    >
                      {meta.title}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      color: colors.textSecondary,
                      marginBottom: 10,
                      lineHeight: 18,
                    }}
                  >
                    {meta.subtitle}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                      color: colors.text,
                      marginBottom: 4,
                    }}
                  >
                    {purposeLineForItem(item)}
                  </Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.textSecondary, marginBottom: 2 }}>
                    Incident date: {item.incidentDate}
                  </Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.textSecondary, marginBottom: 2 }}>
                    Location: {item.locationText}
                  </Text>
                  {item.notes ? (
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 6,
                        lineHeight: 18,
                      }}
                    >
                      Notes: {item.notes}
                    </Text>
                  ) : null}
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
                    Submitted {formatSubmittedAt(item.createdAt)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={dateModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDateModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: insets.bottom + 16,
              paddingTop: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 16,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17, color: colors.text }}>
                Incident date
              </Text>
              <TouchableOpacity onPress={() => setDateModalOpen(false)}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: accent }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <Calendar
              current={incidentDate}
              onDayPress={(day) => {
                setIncidentDate(day.dateString);
                setDateModalOpen(false);
              }}
              markedDates={{
                [incidentDate]: { selected: true, selectedColor: accent },
              }}
              theme={calendarTheme}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
