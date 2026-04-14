import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
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
import { getApiUrl, UI_MODE, mockData } from "../utils/api";
import { submitEmergencyReport, uploadImageToStorage } from "@packages/firebase";

const CIVILIAN_INCIDENT_TYPES = [
  { id: "fire", label: "Fire", emoji: "🔥" },
  { id: "medical", label: "Medical", emoji: "🚑" },
  { id: "vehicular_accident", label: "Vehicular Accident", emoji: "🚗" },
  { id: "police_emergency", label: "Police Emergency", emoji: "🚓" },
  { id: "electrical_powerline_hazard", label: "Electrical / Powerline Hazard", emoji: "⚡" },
  { id: "other_emergency", label: "Other Emergency", emoji: "🆘" },
];

const DEFAULT_MAP_REGION = {
  latitude: 17.6132,
  longitude: 121.727,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

const GPS_FALLBACK_TIMEOUT_MS = 10000;

export default function EmergencyFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUserStore();

  const [incidentType, setIncidentType] = useState("");
  const [locationText, setLocationText] = useState("");
  const [landmark, setLandmark] = useState("");
  const [peopleInvolved, setPeopleInvolved] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHeaderBorder, setShowHeaderBorder] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null); // 'success', 'manual', 'error', null
  const [showManualPinMap, setShowManualPinMap] = useState(false);
  const gpsFallbackTimerRef = useRef(null);
  const manualPinSelectedRef = useRef(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    requestLocationPermission();

    return () => {
      if (gpsFallbackTimerRef.current) {
        clearTimeout(gpsFallbackTimerRef.current);
      }
    };
  }, []);

  // Debug: Log imageUri changes
  useEffect(() => {
    console.log("imageUri state changed:", imageUri);
  }, [imageUri]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        await getCurrentLocation();
      } else {
        setLocationStatus("error");
        setShowManualPinMap(true);
      }
    } catch (err) {
      console.error("Location error:", err);
      setLocationStatus("error");
      setShowManualPinMap(true);
    }
  };

  const getCurrentLocation = async () => {
    if (gpsFallbackTimerRef.current) {
      clearTimeout(gpsFallbackTimerRef.current);
    }

    setIsGettingLocation(true);
    setLocationStatus(null);
    setShowManualPinMap(false);
    manualPinSelectedRef.current = false;
    setError("");
    gpsFallbackTimerRef.current = setTimeout(() => {
      setShowManualPinMap(true);
    }, GPS_FALLBACK_TIMEOUT_MS);

    try {
      // Check and request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please enable location permissions in your device settings to automatically get your current location."
        );
        setLocationStatus("error");
        setShowManualPinMap(true);
        setIsGettingLocation(false);
        return;
      }

      // Get current position with better accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      let resolvedLocationText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;

      // Reverse geocode to get address
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          // Format address: street number + street name, city, state
          const addressParts = [];
          if (address.streetNumber) addressParts.push(address.streetNumber);
          if (address.street) addressParts.push(address.street);
          if (addressParts.length > 0) {
            addressParts.push(addressParts.join(" "));
            addressParts.pop(); // Remove the duplicate
          }
          if (address.city) addressParts.push(address.city);
          if (address.region) addressParts.push(address.region);
          
          const formattedAddress = addressParts.length > 0 
            ? addressParts.join(", ")
            : address.formattedAddress || `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
          
          resolvedLocationText = formattedAddress;
        } else {
          // Fallback to coordinates if reverse geocoding fails
          resolvedLocationText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
        }
      } catch (geocodeError) {
        console.error("Reverse geocoding error:", geocodeError);
        // Fallback to coordinates
        resolvedLocationText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      }

      if (manualPinSelectedRef.current) {
        return;
      }

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      setLocationText(resolvedLocationText);
      setLocationStatus("success");
      setShowManualPinMap(false);
    } catch (err) {
      console.error("Location error:", err);
      setLocationStatus("error");
      setShowManualPinMap(true);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please enter your location manually."
      );
    } finally {
      if (gpsFallbackTimerRef.current) {
        clearTimeout(gpsFallbackTimerRef.current);
        gpsFallbackTimerRef.current = null;
      }
      setIsGettingLocation(false);
    }
  };

  const handleManualPin = (coordinate) => {
    manualPinSelectedRef.current = true;
    setLatitude(coordinate.latitude);
    setLongitude(coordinate.longitude);
    setLocationStatus("manual");

    const coordinateText = `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
    if (!locationText.trim()) {
      setLocationText(coordinateText);
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
        allowsEditing: false, // Remove editing for consistency and faster selection
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log("Image selected successfully:", uri);
        setImageUri(uri);
        console.log("Image URI set to state");
      } else {
        console.log("Image selection was canceled");
      }
    } catch (err) {
      console.error("Image picker error:", err);
      setError("Failed to pick image");
      Alert.alert("Gallery Error", "Failed to pick image. Please try again.");
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
        allowsEditing: false, // Remove editing for faster emergency reporting
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log("Photo taken successfully:", uri);
        setImageUri(uri);
        console.log("Photo URI set to state");
      } else {
        console.log("Photo capture was canceled");
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Failed to take photo");
      Alert.alert("Camera Error", "Failed to take photo. Please try again.");
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

      // Upload image to Firebase Storage if present
      if (imageUri) {
        try {
          // Generate a unique file name for this emergency report
          const fileName = `emergency_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          imageUrl = await uploadImageToStorage(imageUri, 'emergencies/photos/', fileName);
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message || 'Unknown error'}`);
        }
      }

      // Submit emergency report to Firestore
      const userId = user.uid || user.id;
      if (!userId) {
        throw new Error("User ID not found. Please login again.");
      }

      const report = await submitEmergencyReport({
        userId,
        incidentType,
        locationText: locationText.trim(),
        landmark: landmark.trim() || null,
        peopleInvolved: peopleInvolved ? Number.parseInt(peopleInvolved, 10) : null,
        latitude,
        longitude,
        imageUrl,
        description: description.trim() || null,
        status: "pending",
      });

      router.replace({
        pathname: "/emergency-confirmation",
        params: { reportId: report.id },
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

  if (isLoading) {
    return (
      <LoadingScreen
        title="Submitting report..."
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
          paddingBottom: insets.bottom + 100, // Extra padding for custom nav bar
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
          {CIVILIAN_INCIDENT_TYPES.map((type) => (
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
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location */}
        <View style={{ marginBottom: 24 }}>
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
                color: "#FFFFFF",
              }}
            >
              Location <Text style={{ color: "#9AFF55" }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={getCurrentLocation}
              disabled={isGettingLocation}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor:
                  locationStatus === "success" || locationStatus === "manual"
                    ? "#9AFF5520"
                    : "#252525",
                borderWidth: 1,
                borderColor:
                  locationStatus === "success" || locationStatus === "manual"
                    ? "#9AFF55"
                    : "#404040",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                opacity: isGettingLocation ? 0.6 : 1,
              }}
            >
              {isGettingLocation ? (
                <>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: "#9AFF55",
                      marginRight: 6,
                    }}
                  >
                    Getting...
                  </Text>
                </>
              ) : locationStatus === "success" || locationStatus === "manual" ? (
                <>
                  <MapPin size={14} color="#9AFF55" style={{ marginRight: 4 }} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      color: "#9AFF55",
                    }}
                  >
                    {locationStatus === "manual" ? "Pin Set" : "Location Found"}
                  </Text>
                </>
              ) : (
                <>
                  <MapPin size={14} color="#9AFF55" style={{ marginRight: 4 }} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      color: "#9AFF55",
                    }}
                  >
                    Get Current
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <TextInput
            style={{
              height: 50,
              borderWidth: 1,
              borderColor:
                locationStatus === "success" || locationStatus === "manual"
                  ? "#9AFF55"
                  : "#6C6C6C",
              borderRadius: 12,
              paddingHorizontal: 16,
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              color: "#FFFFFF",
              backgroundColor: "transparent",
            }}
            placeholder="Enter location or address"
            placeholderTextColor="#C1C1C1"
            value={locationText}
            onChangeText={(text) => {
              setLocationText(text);
              setLocationStatus(null); // Reset status when user manually edits
            }}
          />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: "#FFFFFF",
              marginTop: 12,
              marginBottom: 8,
            }}
          >
            Nearest Landmark (Optional)
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
            }}
            placeholder="Nearest landmark"
            placeholderTextColor="#C1C1C1"
            value={landmark}
            onChangeText={setLandmark}
          />
          {showManualPinMap && (
            <View
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: "#404040",
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "#111111",
              }}
            >
              <View style={{ padding: 12 }}>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: "#FFFFFF",
                  }}
                >
                  Set Location on Map
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: "#C1C1C1",
                    marginTop: 4,
                    lineHeight: 18,
                  }}
                >
                  GPS is taking longer than expected. Tap the map to place the incident pin.
                </Text>
              </View>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={{ height: 220, width: "100%" }}
                initialRegion={
                  latitude && longitude
                    ? {
                        latitude,
                        longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      }
                    : DEFAULT_MAP_REGION
                }
                onPress={(event) => handleManualPin(event.nativeEvent.coordinate)}
              >
                {latitude && longitude ? (
                  <Marker
                    coordinate={{ latitude, longitude }}
                    draggable
                    onDragEnd={(event) => handleManualPin(event.nativeEvent.coordinate)}
                    pinColor="#9AFF55"
                    title="Incident location"
                  />
                ) : null}
              </MapView>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 11,
                  color: "#C1C1C1",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                {latitude && longitude
                  ? `Pinned at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                  : "No pin selected yet."}
              </Text>
            </View>
          )}
          {latitude && longitude && (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 11,
                color: "#9AFF55",
                marginTop: 4,
                opacity: 0.7,
              }}
            >
              Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
          )}
        </View>

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: "#FFFFFF",
            marginBottom: 8,
          }}
        >
          Number of People Involved (Optional)
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
          placeholder="Enter a number if applicable"
          placeholderTextColor="#C1C1C1"
          value={peopleInvolved}
          onChangeText={(text) => setPeopleInvolved(text.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
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
                backgroundColor: "#252525",
              }}
              resizeMode="cover"
              onError={(error) => {
                console.error("Image load error:", error);
                setError("Failed to load image. Please try again.");
              }}
            />
            <TouchableOpacity
              onPress={() => {
                console.log("Removing photo");
                setImageUri(null);
              }}
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
