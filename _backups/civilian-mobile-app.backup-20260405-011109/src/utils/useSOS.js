import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import useUserStore from "./userStore";
import { UI_MODE, mockData } from "./api";

export function useSOS() {
  const router = useRouter();
  const { user } = useUserStore();
  const [sosLoading, setSosLoading] = useState(false);

  const handleSOS = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to send an SOS signal.");
      return;
    }

    // Request confirmation for SOS
    Alert.alert(
      "SOS Emergency",
      "This will immediately send your location to the command center. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send SOS",
          style: "destructive",
          onPress: async () => {
            await sendSOSReport();
          },
        },
      ]
    );
  };

  const sendSOSReport = async () => {
    setSosLoading(true);
    
    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Get user ID
      const userId = user.uid || user.id;
      if (!userId) {
        throw new Error("User ID not found. Please login again.");
      }

      // Request location permission and get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "SOS requires location access. Please enable location permissions in your device settings."
        );
        setSosLoading(false);
        return;
      }

      // Get current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      // Reverse geocode to get address
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
        // Use coordinates as fallback
      }

      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log("🎨 UI MODE: Using mock SOS emergency submit data");
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const mockReport = {
          ...mockData.emergencySubmit.report,
          incident_type: "other",
          location_text: locationText,
        };
        
        router.push({
          pathname: "/emergency-confirmation",
          params: { reportId: mockReport.id },
        });
        setSosLoading(false);
        return;
      }

      const { submitEmergencyReport } = await import("@packages/firebase");
      const report = await submitEmergencyReport({
        userId,
        incidentType: "other", // Default to "other" for SOS
        locationText,
        latitude,
        longitude,
        imageUrl: null,
        description: "SOS Emergency - One Tap Alert",
        status: "pending",
      });

      // Success haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to confirmation screen
      router.push({
        pathname: "/emergency-confirmation",
        params: { reportId: report.id },
      });
    } catch (err) {
      console.error("SOS Error:", err);
      
      // Error haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      Alert.alert(
        "SOS Failed",
        err.message || "Failed to send SOS signal. Please try again or use the Report Emergency form."
      );
    } finally {
      setSosLoading(false);
    }
  };

  return {
    handleSOS,
    sosLoading,
  };
}
