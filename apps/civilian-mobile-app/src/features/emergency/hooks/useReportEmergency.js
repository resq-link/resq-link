import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import useUserStore from "@/stores/userStore";
import { UI_MODE, mockData } from "@/services/api";
import { submitEmergencyReport, uploadImageToStorage } from "@packages/firebase";
import {
  buildDescriptionPayload,
  DEFAULT_MAP_REGION,
  GPS_FALLBACK_TIMEOUT_MS,
  TOTAL_STEPS,
} from "@/features/emergency/constants";

export function useReportEmergency(initialCoords = null) {
  const router = useRouter();
  const { user } = useUserStore();

  const [step, setStep] = useState(0);
  const [incidentType, setIncidentType] = useState("");
  const [typeProfile, setTypeProfile] = useState("");
  const [locationText, setLocationText] = useState("");
  const [landmark, setLandmark] = useState("");
  const [peopleInvolved, setPeopleInvolved] = useState("");
  const [description, setDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [extraDetails, setExtraDetails] = useState({});
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [imageUris, setImageUris] = useState([]);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [error, setError] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);
  const [manualMapMode, setManualMapMode] = useState(false);

  const gpsFallbackTimerRef = useRef(null);
  const manualPinSelectedRef = useRef(false);
  const locationRequestedRef = useRef(false);
  const prefilledCoordsRef = useRef(false);

  useEffect(() => {
    return () => {
      if (gpsFallbackTimerRef.current) {
        clearTimeout(gpsFallbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (prefilledCoordsRef.current) return;

    const latRaw = initialCoords?.lat;
    const lngRaw = initialCoords?.lng;
    if (latRaw == null || lngRaw == null) return;

    const lat = parseFloat(String(latRaw));
    const lng = parseFloat(String(lngRaw));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat === 0 && lng === 0) return;

    prefilledCoordsRef.current = true;
    locationRequestedRef.current = true;
    manualPinSelectedRef.current = true;
    setLatitude(lat);
    setLongitude(lng);
    setLocationText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setLocationStatus("manual");
    setManualMapMode(true);
  }, [initialCoords?.lat, initialCoords?.lng]);

  const clearGpsTimer = useCallback(() => {
    if (gpsFallbackTimerRef.current) {
      clearTimeout(gpsFallbackTimerRef.current);
      gpsFallbackTimerRef.current = null;
    }
  }, []);

  const formatAddress = useCallback((address, lat, lng) => {
    const addressParts = [];
    if (address.streetNumber) addressParts.push(address.streetNumber);
    if (address.street) addressParts.push(address.street);
    if (address.city) addressParts.push(address.city);
    if (address.region) addressParts.push(address.region);

    if (addressParts.length > 0) {
      return addressParts.join(", ");
    }
    if (address.formattedAddress) {
      return address.formattedAddress;
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }, []);

  const getCurrentLocation = useCallback(async () => {
    clearGpsTimer();
    setIsGettingLocation(true);
    setLocationStatus(null);
    manualPinSelectedRef.current = false;
    setError("");

    gpsFallbackTimerRef.current = setTimeout(() => {
      setManualMapMode(true);
    }, GPS_FALLBACK_TIMEOUT_MS);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please enable location permissions in your device settings to automatically get your current location."
        );
        setLocationStatus("error");
        setManualMapMode(true);
        setIsGettingLocation(false);
        clearGpsTimer();
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      let resolvedLocationText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addresses?.length > 0) {
          resolvedLocationText = formatAddress(
            addresses[0],
            location.coords.latitude,
            location.coords.longitude
          );
        }
      } catch (geocodeError) {
        console.error("Reverse geocoding error:", geocodeError);
      }

      if (manualPinSelectedRef.current) {
        return;
      }

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      setLocationAccuracy(location.coords.accuracy ?? null);
      setLocationText(resolvedLocationText);
      setLocationStatus("success");
      setManualMapMode(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Location error:", err);
      setLocationStatus("error");
      setManualMapMode(true);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. You can place a pin on the map or type your address."
      );
    } finally {
      clearGpsTimer();
      setIsGettingLocation(false);
    }
  }, [clearGpsTimer, formatAddress]);

  const ensureLocationOnStep = useCallback(() => {
    if (locationRequestedRef.current) return;
    locationRequestedRef.current = true;
    getCurrentLocation();
  }, [getCurrentLocation]);

  const handleManualPin = useCallback((coordinate) => {
    manualPinSelectedRef.current = true;
    setLatitude(coordinate.latitude);
    setLongitude(coordinate.longitude);
    setLocationStatus("manual");
    setManualMapMode(true);

    const coordinateText = `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
    setLocationText((prev) => (prev.trim() ? prev : coordinateText));
  }, []);

  const openManualMap = useCallback(() => {
    setManualMapMode(true);
    if (!latitude && !longitude) {
      setLocationStatus("error");
    }
  }, [latitude, longitude]);

  const selectType = useCallback((type, profile) => {
    setIncidentType(type);
    setTypeProfile(profile);
    setExtraDetails({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const addImages = useCallback((uris) => {
    if (!uris?.length) return;
    setImageUris((prev) => [...prev, ...uris].slice(0, 6));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const removeImage = useCallback((uri) => {
    setImageUris((prev) => prev.filter((item) => item !== uri));
  }, []);

  const pickFromGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant camera roll permissions");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 6,
      });

      if (!result.canceled && result.assets?.length) {
        addImages(result.assets.map((asset) => asset.uri));
      }
    } catch (err) {
      console.error("Image picker error:", err);
      setError("Failed to pick image");
      Alert.alert("Gallery Error", "Failed to pick image. Please try again.");
    }
  }, [addImages]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant camera permissions");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        addImages([result.assets[0].uri]);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Failed to take photo");
      Alert.alert("Camera Error", "Failed to take photo. Please try again.");
    }
  }, [addImages]);

  const canContinue = useCallback(() => {
    switch (step) {
      case 0:
        return Boolean(incidentType && typeProfile);
      case 1:
        return Boolean(locationText.trim());
      case 2:
      case 3:
        return true;
      case 4:
        return Boolean(incidentType && locationText.trim() && user);
      default:
        return false;
    }
  }, [step, incidentType, typeProfile, locationText, user]);

  const goNext = useCallback(async () => {
    setError("");
    if (!canContinue()) {
      if (step === 0) setError("Please select an emergency type");
      else if (step === 1) setError("Please confirm your location");
      return;
    }

    if (step === 0) {
      ensureLocationOnStep();
    }

    if (step < TOTAL_STEPS - 1) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep((s) => s + 1);
    }
  }, [canContinue, step, ensureLocationOnStep]);

  const goBack = useCallback(() => {
    setError("");
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }, [step]);

  const goToStep = useCallback((targetStep) => {
    setError("");
    if (targetStep >= 0 && targetStep < TOTAL_STEPS) {
      setStep(targetStep);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
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

    setIsSubmitting(true);
    setSubmitProgress(0.15);
    setError("");

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const mergedDescription = buildDescriptionPayload(
        description,
        landmark,
        peopleInvolved,
        extraDetails,
        typeProfile,
        additionalNotes
      );

      if (UI_MODE) {
        setSubmitProgress(0.55);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setSubmitProgress(0.9);
        console.log("UI MODE: Using mock emergency submit data");
        const mockReport = {
          ...mockData.emergencySubmit.report,
          incident_type: incidentType,
          location_text: locationText.trim(),
        };
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSubmitProgress(1);
        await new Promise((resolve) => setTimeout(resolve, 400));
        router.replace({
          pathname: "/emergency-confirmation",
          params: { reportId: mockReport.id },
        });
        return;
      }

      let imageUrl = null;
      let imageUrls = [];

      if (imageUris.length > 0) {
        setSubmitProgress(0.35);
        try {
          imageUrls = await Promise.all(
            imageUris.map(async (uri, index) => {
              const fileName = `emergency_${Date.now()}_${index}_${Math.random().toString(36).substring(7)}.jpg`;
              return uploadImageToStorage(uri, "emergencies/photos/", fileName);
            })
          );
          imageUrl = imageUrls[0] || null;
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message || "Unknown error"}`);
        }
      }

      const fieldAssessment = Object.entries(extraDetails || {}).reduce((acc, [key, value]) => {
        if (typeof value === "string" && value.trim()) {
          acc[key] = value.trim();
        }
        return acc;
      }, {});

      setSubmitProgress(0.7);
      const userId = user.uid || user.id;
      if (!userId) {
        throw new Error("User ID not found. Please login again.");
      }

      const report = await submitEmergencyReport({
        userId,
        incidentType,
        typeProfile: typeProfile || null,
        locationText: locationText.trim(),
        landmark: landmark.trim() || null,
        peopleInvolved: peopleInvolved ? Number.parseInt(peopleInvolved, 10) : null,
        latitude,
        longitude,
        imageUrl,
        imageUrls: imageUrls.length > 0 ? imageUrls : null,
        description: mergedDescription,
        fieldAssessment: Object.keys(fieldAssessment).length > 0 ? fieldAssessment : null,
        status: "pending",
      });

      setSubmitProgress(1);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise((resolve) => setTimeout(resolve, 350));

      router.replace({
        pathname: "/emergency-confirmation",
        params: { reportId: report.id },
      });
    } catch (err) {
      console.error(err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to submit emergency report");
      setIsSubmitting(false);
      setSubmitProgress(0);
    }
  }, [
    incidentType,
    locationText,
    user,
    description,
    additionalNotes,
    landmark,
    peopleInvolved,
    extraDetails,
    typeProfile,
    imageUris,
    latitude,
    longitude,
    router,
  ]);

  const mapRegion =
    latitude && longitude
      ? {
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : DEFAULT_MAP_REGION;

  return {
    step,
    totalSteps: TOTAL_STEPS,
    incidentType,
    typeProfile,
    locationText,
    setLocationText,
    landmark,
    setLandmark,
    peopleInvolved,
    setPeopleInvolved,
    description,
    setDescription,
    additionalNotes,
    setAdditionalNotes,
    extraDetails,
    setExtraDetails,
    showAdvancedDetails,
    setShowAdvancedDetails,
    imageUris,
    latitude,
    longitude,
    locationAccuracy,
    isSubmitting,
    submitProgress,
    error,
    setError,
    isGettingLocation,
    locationStatus,
    manualMapMode,
    mapRegion,
    selectType,
    getCurrentLocation,
    handleManualPin,
    openManualMap,
    pickFromGallery,
    takePhoto,
    removeImage,
    canContinue,
    goNext,
    goBack,
    goToStep,
    handleSubmit,
    ensureLocationOnStep,
  };
}
