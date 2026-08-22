import { useState, useEffect, useRef, useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import useUserStore from "@/stores/userStore";
import useSOSStore from "@/stores/sosStore";
import { UI_MODE, mockData } from "@/services/api";
import { submitEmergencyReport } from "@packages/firebase";

export function useSOS() {
  const router = useRouter();
  const { user } = useUserStore();
  const [sosLoading, setSosLoading] = useState(false);
  const { openConfirmation, registerConfirmHandler, confirmVisible } =
    useSOSStore();

  const sendSOSReport = useCallback(async () => {
    setSosLoading(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const userId = user?.uid || user?.id;
      if (!userId) {
        throw new Error("User ID not found. Please login again.");
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "SOS requires location access. Please enable location permissions in your device settings."
        );
        setSosLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      let locationText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          const addressParts = [];
          if (address.streetNumber) addressParts.push(address.streetNumber);
          if (address.street) addressParts.push(address.street);
          if (address.city) addressParts.push(address.city);
          if (address.region) addressParts.push(address.region);

          if (addressParts.length > 0) {
            locationText = addressParts.join(", ");
          } else if (address.formattedAddress) {
            locationText = address.formattedAddress;
          }
        }
      } catch (geocodeError) {
        console.error("Reverse geocoding error:", geocodeError);
      }

      if (UI_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.log("🎨 UI MODE: Using mock SOS emergency submit data");

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const mockReport = {
          ...mockData.emergencySubmit.report,
          incident_type: "other_emergency",
          location_text: locationText,
        };

        router.push({
          pathname: "/emergency-confirmation",
          params: { reportId: mockReport.id },
        });
        setSosLoading(false);
        return;
      }

      const report = await submitEmergencyReport({
        userId,
        incidentType: "other_emergency",
        locationText,
        latitude,
        longitude,
        imageUrl: null,
        description: "SOS Emergency - Shake Alert",
        status: "pending",
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.push({
        pathname: "/emergency-confirmation",
        params: { reportId: report.id },
      });
    } catch (err) {
      console.error("SOS Error:", err);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert(
        "SOS Failed",
        err.message ||
          "Failed to send SOS signal. Please try again or use the Report Emergency form."
      );
    } finally {
      setSosLoading(false);
    }
  }, [user, router]);

  const sendRef = useRef(sendSOSReport);
  sendRef.current = sendSOSReport;

  useEffect(() => {
    registerConfirmHandler(() => sendRef.current());
  }, [registerConfirmHandler]);

  const handleSOS = () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to send an SOS signal.");
      return;
    }

    if (confirmVisible || sosLoading) {
      return;
    }

    openConfirmation();
  };

  return {
    handleSOS,
    sosLoading,
  };
}
