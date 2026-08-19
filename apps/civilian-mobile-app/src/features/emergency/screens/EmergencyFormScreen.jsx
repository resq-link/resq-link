import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { ChevronLeft, X } from "lucide-react-native";
import ReportProgress from "@/features/emergency/components/ReportProgress";
import EmergencyTypeSelector from "@/features/emergency/components/EmergencyTypeSelector";
import LocationStep from "@/features/emergency/components/LocationStep";
import DetailsSection from "@/features/emergency/components/DetailsSection";
import AttachmentPicker from "@/features/emergency/components/AttachmentPicker";
import ReviewSummary from "@/features/emergency/components/ReviewSummary";
import BottomActionBar from "@/features/emergency/components/BottomActionBar";
import SubmittingOverlay from "@/features/emergency/components/SubmittingOverlay";
import { useReportEmergency } from "@/features/emergency/hooks/useReportEmergency";
import HeaderStepIndicator from "@/features/emergency/components/HeaderStepIndicator";
import { reportTypography } from "@/features/emergency/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function EmergencyFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const reduceMotionRef = useRef(false);
  const { reportTheme, colors } = useAppTheme();

  const report = useReportEmergency({
    lat: typeof params.lat === "string" ? params.lat : undefined,
    lng: typeof params.lng === "string" ? params.lng : undefined,
  });

  const styles = useThemedStyles(
    (t) => ({
      root: {
        flex: 1,
        backgroundColor: t.background,
      },
      flex: {
        flex: 1,
      },
      header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 8,
      },
      headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.surface,
      },
      headerCenter: {
        flex: 1,
        alignItems: "center",
      },
      headerTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: reportTypography.body,
        color: t.text,
      },
      headerStep: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.caption,
        color: t.textSecondary,
        marginTop: 2,
      },
      progressWrap: {
        paddingHorizontal: 20,
      },
      scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
      },
      errorBanner: {
        backgroundColor: t.emergencyMuted,
        borderWidth: 1,
        borderColor: "rgba(255, 59, 48, 0.35)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
      },
      errorText: {
        fontFamily: "Inter_400Regular",
        fontSize: reportTypography.caption + 1,
        color: "#FFD4D0",
        lineHeight: 20,
      },
    }),
    reportTheme
  );

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
  }, []);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleChangeExtraDetail = useCallback(
    (key, value) => {
      report.setExtraDetails((current) => ({ ...current, [key]: value }));
    },
    [report.setExtraDetails]
  );

  const renderStep = () => {
    switch (report.step) {
      case 0:
        return (
          <EmergencyTypeSelector
            incidentType={report.incidentType}
            typeProfile={report.typeProfile}
            onSelect={report.selectType}
          />
        );
      case 1:
        return (
          <LocationStep
            locationText={report.locationText}
            onChangeLocationText={(text) => {
              report.setLocationText(text);
              if (text) report.setError("");
            }}
            latitude={report.latitude}
            longitude={report.longitude}
            locationAccuracy={report.locationAccuracy}
            locationStatus={report.locationStatus}
            isGettingLocation={report.isGettingLocation}
            manualMapMode={report.manualMapMode}
            mapRegion={report.mapRegion}
            onRefresh={report.getCurrentLocation}
            onEditManually={report.openManualMap}
            onManualPin={report.handleManualPin}
            onMount={report.ensureLocationOnStep}
          />
        );
      case 2:
        return (
          <DetailsSection
            typeProfile={report.typeProfile}
            description={report.description}
            onChangeDescription={report.setDescription}
            landmark={report.landmark}
            onChangeLandmark={report.setLandmark}
            peopleInvolved={report.peopleInvolved}
            onChangePeopleInvolved={report.setPeopleInvolved}
            additionalNotes={report.additionalNotes}
            onChangeAdditionalNotes={report.setAdditionalNotes}
            extraDetails={report.extraDetails}
            onChangeExtraDetail={handleChangeExtraDetail}
            showAdvanced={report.showAdvancedDetails}
            onToggleAdvanced={() =>
              report.setShowAdvancedDetails((v) => !v)
            }
          />
        );
      case 3:
        return (
          <AttachmentPicker
            imageUris={report.imageUris}
            onTakePhoto={report.takePhoto}
            onPickGallery={report.pickFromGallery}
            onRemove={report.removeImage}
          />
        );
      case 4:
        return (
          <ReviewSummary
            incidentType={report.incidentType}
            typeProfile={report.typeProfile}
            locationText={report.locationText}
            description={report.description}
            additionalNotes={report.additionalNotes}
            landmark={report.landmark}
            peopleInvolved={report.peopleInvolved}
            imageUris={report.imageUris}
            onEditStep={report.goToStep}
          />
        );
      default:
        return null;
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const StepWrapper = reduceMotionRef.current ? View : Animated.View;
  const stepEntering = reduceMotionRef.current ? undefined : FadeIn.duration(220);
  const stepExiting = reduceMotionRef.current ? undefined : FadeOut.duration(160);

  return (
    <View style={styles.root}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={reportTheme.background} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={report.step > 0 ? report.goBack : handleClose}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={report.step > 0 ? "Go back" : "Close"}
        >
          {report.step > 0 ? (
            <ChevronLeft size={22} color={reportTheme.text} strokeWidth={2.4} />
          ) : (
            <X size={22} color={reportTheme.text} strokeWidth={2.4} />
          )}
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Report Emergency</Text>
          <Text style={styles.headerStep}>
            Step {report.step + 1} of {report.totalSteps}
          </Text>
        </View>
        <HeaderStepIndicator
          currentStep={report.step}
          totalSteps={report.totalSteps}
        />
      </View>

      <View style={styles.progressWrap}>
        <ReportProgress currentStep={report.step} totalSteps={report.totalSteps} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 112 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {report.error ? (
            <Pressable
              style={styles.errorBanner}
              onPress={() => report.setError("")}
              accessibilityRole="alert"
            >
              <Text style={styles.errorText}>{report.error}</Text>
            </Pressable>
          ) : null}

          <StepWrapper
            key={report.step}
            entering={stepEntering}
            exiting={stepExiting}
          >
            {renderStep()}
          </StepWrapper>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomActionBar
        step={report.step}
        totalSteps={report.totalSteps}
        canContinue={report.canContinue()}
        isSubmitting={report.isSubmitting}
        onBack={report.goBack}
        onContinue={report.goNext}
        onSubmit={report.handleSubmit}
        bottomInset={insets.bottom}
      />

      <SubmittingOverlay
        visible={report.isSubmitting}
        progress={report.submitProgress}
      />
    </View>
  );
}
