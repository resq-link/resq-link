import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { ChevronDown, MapPin, Camera, Image as ImageIcon } from "lucide-react-native";
import BackButton from "@/components/BackButton";
import FormInput from "@/components/FormInput";
import CustomButton from "@/components/CustomButton";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorAlert from "@/components/ErrorAlert";
import useUserStore from "@/stores/userStore";
import { UI_MODE } from "@/services/api";
import { useAppTheme } from "@/hooks/useAppTheme";
import { GOV_ID_TYPES } from "@/features/auth/constants/govIdTypes";
import KycPrivacyNotice from "@/features/legal/components/KycPrivacyNotice";
import LegalConsentCheckbox from "@/features/legal/components/LegalConsentCheckbox";
import {
  isValidPhilippinePhone,
  normalizePhilippinePhone,
} from "@/features/auth/utils/phone";
import { sendEmailOtp } from "@/features/auth/utils/emailOtpApi";

let registerCivilian = null;
let firebaseError = null;

if (!UI_MODE) {
  try {
    const firebaseModule = require("@packages/firebase");
    if (firebaseModule?.registerCivilian) {
      registerCivilian = firebaseModule.registerCivilian;
    } else {
      firebaseError = "registerCivilian is not exported from Firebase module";
    }
  } catch (error) {
    firebaseError = error.message || "Failed to load Firebase module.";
  }
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, authTheme: theme } = useAppTheme();
  const { setUser } = useUserStore();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [govIdType, setGovIdType] = useState("");
  const [idMenuOpen, setIdMenuOpen] = useState(false);
  const [idPhotoUri, setIdPhotoUri] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showHeaderBorder, setShowHeaderBorder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const canContinueStep1 = useMemo(
    () =>
      firstName.trim() &&
      lastName.trim() &&
      address.trim() &&
      isValidPhilippinePhone(phoneNumber),
    [firstName, lastName, address, phoneNumber]
  );

  const canContinueStep2 = useMemo(() => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return validEmail && password.length >= 6 && password === confirmPassword;
  }, [email, password, confirmPassword]);

  const canSubmit = Boolean(govIdType && idPhotoUri && acceptedLegal);

  if (!fontsLoaded) {
    return null;
  }

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    setError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required to fill your address.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      if (!place) {
        setError("Could not resolve an address from your location.");
        return;
      }
      const parts = [
        place.name,
        place.street,
        place.district,
        place.subregion,
        place.city,
        place.region,
        place.postalCode,
      ].filter(Boolean);
      const unique = [...new Set(parts)];
      setAddress(unique.join(", "));
    } catch (err) {
      setError(err.message || "Failed to get current location.");
    } finally {
      setLocating(false);
    }
  };

  const pickIdPhoto = async (fromCamera) => {
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Please allow camera access to photograph your ID.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
          aspect: [4, 3],
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          setIdPhotoUri(result.assets[0].uri);
        }
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setIdPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      setError(err.message || "Failed to select ID photo.");
    }
  };

  const goNext = () => {
    setError("");
    if (step === 1 && !canContinueStep1) {
      setError("Please fill in your name, address, and a valid Philippine mobile number.");
      return;
    }
    if (step === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("Please select an ID type and upload the front of your government ID.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const phone = normalizePhilippinePhone(phoneNumber);

      if (UI_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await setUser({
          uid: "mock-user-123",
          email: email.trim().toLowerCase(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone,
          address,
          role: "civilian",
          status: "pending_email_verification",
        });
        router.replace("/email-verification");
        return;
      }

      if (!registerCivilian) {
        throw new Error(
          firebaseError || "Firebase is not available. Check your .env configuration."
        );
      }

      const { uid, profile } = await registerCivilian({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone,
        address: address.trim(),
        govIdType,
        govIdFrontUri: idPhotoUri,
      });

      await sendEmailOtp({ uid, email: profile.email });
      await setUser({
        uid: profile.uid,
        email: profile.email,
        name: profile.name,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        role: profile.role,
        status: profile.status,
      });

      router.replace("/email-verification");
    } catch (err) {
      let message = err.message || "Failed to create account.";
      if (message.includes("email-already-in-use")) {
        message = "An account with this email already exists. Try logging in.";
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen
        title="Creating your account..."
        subtitle="Uploading your ID and sending a verification email"
        variant="register"
      />
    );
  }

  const stepTitle = step === 1 ? "Personal info" : step === 2 ? "Account" : "Government ID";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

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
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <BackButton
            variant="register"
            onPress={step > 1 ? () => setStep((prev) => prev - 1) : undefined}
          />
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 30,
            color: colors.text,
          }}
        >
          Create account
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 6,
          }}
        >
          Step {step} of 3 · {stepTitle}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: insets.top + 180,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          setShowHeaderBorder(event.nativeEvent.contentOffset.y > 0);
        }}
        scrollEventThrottle={16}
      >
        <ErrorAlert
          message={error}
          onDismiss={() => setError("")}
          variant="register"
        />

        {step === 1 && (
          <>
            <FormInput
              label="First Name"
              placeholder="Juan"
              value={firstName}
              onChangeText={setFirstName}
              variant="register"
              required
              autoCapitalize="words"
            />
            <FormInput
              label="Last Name"
              placeholder="Dela Cruz"
              value={lastName}
              onChangeText={setLastName}
              variant="register"
              required
              autoCapitalize="words"
            />
            <FormInput
              label="Address"
              placeholder="Street, Barangay, City"
              value={address}
              onChangeText={setAddress}
              variant="register"
              required
              autoCapitalize="words"
            />
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                lineHeight: 17,
                color: colors.textSecondary,
                marginTop: -8,
                marginBottom: 8,
              }}
            >
              Optional: we use your location only to suggest your address. See our Privacy Policy for details.
            </Text>
            <TouchableOpacity
              disabled={locating}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: -12,
                marginBottom: 24,
                gap: 8,
              }}
            >
              <MapPin size={16} color={theme.link} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                  color: theme.link,
                }}
              >
                {locating ? "Getting location..." : "Use current location"}
              </Text>
            </TouchableOpacity>
            <FormInput
              label="Philippine Phone Number"
              placeholder="+639171234567"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              variant="register"
              required
            />
            <CustomButton
              title="Continue"
              onPress={goNext}
              variant="register"
              buttonVariant="register"
              disabled={!canContinueStep1}
            />
          </>
        )}

        {step === 2 && (
          <>
            <FormInput
              label="Email Address"
              placeholder="you@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              variant="register"
              required
              autoCapitalize="none"
            />
            <FormInput
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              variant="register"
              required
            />
            <FormInput
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              variant="register"
              required
            />
            <CustomButton
              title="Continue"
              onPress={goNext}
              variant="register"
              buttonVariant="register"
              disabled={!canContinueStep2}
            />
          </>
        )}

        {step === 3 && (
          <>
            <KycPrivacyNotice colors={colors} theme={theme} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: theme.primaryText,
                marginBottom: 8,
              }}
            >
              Government ID type <Text style={{ color: theme.primaryGreen }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setIdMenuOpen((open) => !open)}
              style={{
                minHeight: 50,
                borderWidth: 1,
                borderColor: theme.inputBorder,
                borderRadius: 12,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: theme.inputBg,
                marginBottom: idMenuOpen ? 8 : 24,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 16,
                  color: govIdType ? theme.primaryText : theme.mutedText,
                }}
              >
                {govIdType || "Select ID type"}
              </Text>
              <ChevronDown size={18} color={theme.mutedText} />
            </TouchableOpacity>
            {idMenuOpen
              ? GOV_ID_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      setGovIdType(type);
                      setIdMenuOpen(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 15,
                        color: type === govIdType ? theme.link : theme.primaryText,
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))
              : null}

            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: theme.primaryText,
                marginTop: idMenuOpen ? 16 : 0,
                marginBottom: 8,
              }}
            >
              Front of Government ID <Text style={{ color: theme.primaryGreen }}>*</Text>
            </Text>
            {idPhotoUri ? (
              <Image
                source={{ uri: idPhotoUri }}
                style={{
                  width: "100%",
                  height: 180,
                  borderRadius: 12,
                  marginBottom: 12,
                  backgroundColor: theme.inputBg,
                }}
              />
            ) : (
              <View
                style={{
                  height: 140,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.inputBorder,
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: theme.mutedText,
                  }}
                >
                  No photo selected
                </Text>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => pickIdPhoto(true)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.inputBorder,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Camera size={18} color={theme.primaryText} />
                <Text style={{ fontFamily: "Inter_600SemiBold", color: theme.primaryText }}>
                  Camera
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => pickIdPhoto(false)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.inputBorder,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ImageIcon size={18} color={theme.primaryText} />
                <Text style={{ fontFamily: "Inter_600SemiBold", color: theme.primaryText }}>
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>
            <LegalConsentCheckbox
              checked={acceptedLegal}
              onToggle={() => setAcceptedLegal((value) => !value)}
              colors={colors}
              theme={theme}
            />
            <CustomButton
              title="Submit & verify email"
              onPress={handleSubmit}
              variant="register"
              buttonVariant="register"
              disabled={!canSubmit}
            />
          </>
        )}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "auto",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.textSecondary,
            }}
          >
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: theme.link,
              }}
            >
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
