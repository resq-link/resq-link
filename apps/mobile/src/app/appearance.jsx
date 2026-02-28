import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useAppTheme } from "@/utils/useAppTheme";

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode, activeTheme, setThemePreference } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handleSaveTheme = async () => {
    const success = await setThemePreference(themeMode);
    if (success) {
      Alert.alert("Saved", "Theme preference updated.");
      router.back();
    } else {
      Alert.alert("Error", "Could not save theme preference.");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F5F5F7" />

      <View style={[styles.topArea, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.title}>Appearance</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Application theme</Text>
        <Text style={styles.sectionDescription}>
          Selecting a particular option will change the appearance (coloring) of
          the application according to your preferences.
        </Text>

        <View style={styles.previewRow}>
          <ThemeOption
            label="Light"
            selected={themeMode === "light"}
            onPress={() => setThemePreference("light")}
            previewTheme="light"
          />
          <ThemeOption
            label="Dark"
            selected={themeMode === "dark"}
            onPress={() => setThemePreference("dark")}
            previewTheme="dark"
          />
          <ThemeOption
            label="System"
            selected={themeMode === "system"}
            onPress={() => setThemePreference("system")}
            previewTheme={activeTheme}
          />
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveTheme}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ThemeOption({ label, selected, onPress, previewTheme }) {
  const isLight = previewTheme === "light";

  return (
    <TouchableOpacity style={styles.optionWrap} onPress={onPress} activeOpacity={0.85}>
      <View
        style={[
          styles.phoneMock,
          {
            backgroundColor: isLight ? "#FFFFFF" : "#111111",
            borderColor: isLight ? "#DCDCE0" : "#2A2A2E",
          },
        ]}
      >
        <View style={styles.mockHeader}>
          <View
            style={[
              styles.mockLine,
              { backgroundColor: isLight ? "#E8E8ED" : "#2C2C2F", width: "55%" },
            ]}
          />
          <View
            style={[
              styles.mockPill,
              { backgroundColor: isLight ? "#111111" : "#FFFFFF" },
            ]}
          />
        </View>
        <View style={styles.mockList}>
          <View
            style={[
              styles.mockCard,
              { backgroundColor: isLight ? "#F2F2F5" : "#1C1C20" },
            ]}
          />
          <View
            style={[
              styles.mockCard,
              { backgroundColor: isLight ? "#F2F2F5" : "#1C1C20" },
            ]}
          />
          <View
            style={[
              styles.mockFooterPill,
              { backgroundColor: isLight ? "#111111" : "#FFFFFF" },
            ]}
          />
        </View>
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  topArea: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8ED",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    marginLeft: -6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 42,
    color: "#111111",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    color: "#111111",
    marginBottom: 8,
  },
  sectionDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 18,
    lineHeight: 26,
    color: "#55555A",
    marginBottom: 24,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  optionWrap: {
    alignItems: "center",
    flex: 1,
  },
  phoneMock: {
    width: "100%",
    aspectRatio: 0.54,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    justifyContent: "space-between",
  },
  mockHeader: {
    gap: 8,
  },
  mockLine: {
    height: 7,
    borderRadius: 999,
  },
  mockPill: {
    width: 16,
    height: 5,
    borderRadius: 999,
    alignSelf: "flex-end",
  },
  mockList: {
    gap: 8,
  },
  mockCard: {
    width: "100%",
    height: 16,
    borderRadius: 6,
  },
  mockFooterPill: {
    width: 20,
    height: 6,
    borderRadius: 999,
    alignSelf: "flex-end",
  },
  optionLabel: {
    marginTop: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 22,
    color: "#111111",
  },
  radioOuter: {
    marginTop: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#C6C6CC",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  radioOuterSelected: {
    borderColor: "#111111",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#111111",
  },
  bottomBar: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#E8E8ED",
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#F5F5F7",
  },
  saveButton: {
    backgroundColor: "#000000",
    minHeight: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    color: "#FFFFFF",
  },
});
