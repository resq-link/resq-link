import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Camera, MapPin, Upload } from "lucide-react-native";
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
import useUpload from "../utils/useUpload";
import { getApiUrl, UI_MODE, mockData } from "../utils/api";

const INCIDENT_TYPES = [
  { id: "fire", label: "🔥 Fire", emoji: "🔥" },
  { id: "medical", label: "🚑 Medical", emoji: "🚑" },
  { id: "crime", label: "🚓 Crime", emoji: "🚓" },
  { id: "accident", label: "🚗 Accident", emoji: "🚗" },
  { id: "flood", label: "🌊 Flood", emoji: "🌊" },
  { id: "other", label: "⚡ Other", emoji: "⚡" },
];

export default function EmergencyFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();
  const [upload, { loading: uploading }] = useUpload();

  const [incidentType, setIncidentType] = useState("");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHeaderBorder, setShowHeaderBorder] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
      }
    } catch (err) {
      console.error("Location error:", err);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant camera roll permissions");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Image picker error:", err);
      setError("Failed to pick image");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant camera permissions");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Failed to take photo");
    }
  };

  const handleSubmit = async () => {
    if (!incidentType) {
      setError("Please select an incident type");
      return;
    }

    if (!locationText.trim()) {
      setError("Please enter a location");
      return;
    }

    if (!user) {
      setError("Please login to submit a report");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // UI MODE: Use mock data for UI development
      if (UI_MODE) {
        // Simulate API delay for realistic UI testing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log("🎨 UI MODE: Using mock emergency submit data");
        const mockReport = {
          ...mockData.emergencySubmit.report,
          incident_type: incidentType,
          location_text: locationText.trim(),
        };
        
        router.replace({
          pathname: "/emergency-confirmation",
          params: { reportId: mockReport.id },
        });
        return;
      }

      let imageUrl = null;

      // Upload image if present
      if (imageUri) {
        const uploadResult = await upload({
          reactNativeAsset: {
            uri: imageUri,
            type: "image/jpeg",
            name: "emergency-photo.jpg",
          },
        });

        if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }

        imageUrl = uploadResult.url;
      }

      // Submit emergency report
      const response = await fetch(getApiUrl("/api/emergency/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          incidentType,
          locationText: locationText.trim(),
          latitude,
          longitude,
          imageUrl,
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit report");
      }

      const data = await response.json();
      router.replace({
        pathname: "/emergency-confirmation",
        params: { reportId: data.report.id },
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit emergency report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setShowHeaderBorder(scrollY > 0);
  };

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading || uploading) {
    return (
      <LoadingScreen
        title={uploading ? "Uploading image..." : "Submitting report..."}
        subtitle="Please wait"
        variant="login"
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" backgroundColor="#000000" />

      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: "#000000",
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: 20,
          zIndex: 1000,
          borderBottomWidth: showHeaderBorder ? 1 : 0,
          borderBottomColor: "#404040",
        }}
      >
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <BackButton variant="login" />
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 30,
            color: "#FFFFFF",
          }}
        >
          Report Emergency
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: insets.top + 160,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ErrorAlert
          message={error}
          onDismiss={() => setError("")}
          variant="login"
        />

        {/* Incident Type */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: "#FFFFFF",
            marginBottom: 12,
          }}
        >
          Incident Type <Text style={{ color: "#9AFF55" }}>*</Text>
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginBottom: 24,
            gap: 12,
          }}
        >
          {INCIDENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              onPress={() => setIncidentType(type.id)}
              style={{
                flex: 1,
                minWidth: "30%",
                backgroundColor: incidentType === type.id ? "#9AFF55" : "#252525",
                borderWidth: 1,
                borderColor:
                  incidentType === type.id ? "#9AFF55" : "#404040",
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>
                {type.emoji}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                  color: incidentType === type.id ? "#000000" : "#FFFFFF",
                  textAlign: "center",
                }}
              >
                {type.label.split(" ")[1]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: "#FFFFFF",
            marginBottom: 8,
          }}
        >
          Location <Text style={{ color: "#9AFF55" }}>*</Text>
        </Text>
        <TextInput
          style={{
            height: 50,
            borderWidth: 1,
            borderColor: "#6C6C6C",
            borderRadius: 12,
            paddingHorizontal: 16,
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: "#FFFFFF",
            backgroundColor: "transparent",
            marginBottom: 24,
          }}
          placeholder="Enter location or address"
          placeholderTextColor="#C1C1C1"
          value={locationText}
          onChangeText={setLocationText}
        />

        {/* Description */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: "#FFFFFF",
            marginBottom: 8,
          }}
        >
          Description (Optional)
        </Text>
        <TextInput
          style={{
            minHeight: 100,
            borderWidth: 1,
            borderColor: "#6C6C6C",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingTop: 12,
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: "#FFFFFF",
            backgroundColor: "transparent",
            marginBottom: 24,
            textAlignVertical: "top",
          }}
          placeholder="Add any additional details..."
          placeholderTextColor="#C1C1C1"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* Image Upload */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: "#FFFFFF",
            marginBottom: 12,
          }}
        >
          Photo (Optional)
        </Text>

        {imageUri ? (
          <View style={{ marginBottom: 24 }}>
            <Image
              source={{ uri: imageUri }}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 12,
                marginBottom: 12,
              }}
              contentFit="cover"
            />
            <TouchableOpacity
              onPress={() => setImageUri(null)}
              style={{
                backgroundColor: "#FF3B30",
                borderRadius: 8,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                  color: "#FFFFFF",
                }}
              >
                Remove Photo
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={takePhoto}
              style={{
                flex: 1,
                backgroundColor: "#252525",
                borderWidth: 1,
                borderColor: "#404040",
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Camera size={24} color="#9AFF55" style={{ marginBottom: 8 }} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                  color: "#FFFFFF",
                }}
              >
                Camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickImage}
              style={{
                flex: 1,
                backgroundColor: "#252525",
                borderWidth: 1,
                borderColor: "#404040",
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Upload size={24} color="#9AFF55" style={{ marginBottom: 8 }} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                  color: "#FFFFFF",
                }}
              >
                Gallery
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submit Button */}
        <CustomButton
          title="Submit Report"
          onPress={handleSubmit}
          variant="primary"
          buttonVariant="login"
          disabled={!incidentType || !locationText.trim()}
        />
      </ScrollView>
    </View>
  );
}
