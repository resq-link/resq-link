import React, { useMemo } from "react";
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
import { useAppTheme } from "@/hooks/useAppTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode, activeTheme, colors, setThemePreference } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const styles = useThemedStyles(
    (c) => ({
      container: {
        flex: 1,
        backgroundColor: c.background,
      },
      topArea: {
        paddingHorizontal: 20,
        paddingBottom: 18,
        borderBottomWidth: 1,
        borderBottomColor: c.separator,
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
        color: c.text,
      },
      content: {
        paddingHorizontal: 20,
        paddingTop: 22,
      },
      sectionTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 24,
        color: c.text,
        marginBottom: 8,
      },
      sectionDescription: {
        fontFamily: "Inter_400Regular",
        fontSize: 18,
        lineHeight: 26,
        color: c.textSecondary,
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
      optionLabel: {
        marginTop: 10,
        fontFamily: "Inter_400Regular",
        fontSize: 22,
        color: c.text,
      },
      radioOuter: {
        marginTop: 12,
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: c.borderAlt,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.card,
      },
      radioOuterSelected: {
        borderColor: c.text,
      },
      radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: c.text,
      },
      bottomBar: {
        marginTop: "auto",
        borderTopWidth: 1,
        borderTopColor: c.separator,
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: c.background,
      },
      saveButton: {
        backgroundColor: c.text,
        minHeight: 56,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
      },
      saveText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 24,
        color: c.background,
      },
    }),
    colors
  );

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
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <View style={[styles.topArea, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={colors.text} />
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
            colors={colors}
          />
          <ThemeOption
            label="Dark"
            selected={themeMode === "dark"}
            onPress={() => setThemePreference("dark")}
            previewTheme="dark"
            colors={colors}
          />
          <ThemeOption
            label="System"
            selected={themeMode === "system"}
            onPress={() => setThemePreference("system")}
            previewTheme={activeTheme}
            colors={colors}
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

function ThemeOption({ label, selected, onPress, previewTheme, colors }) {
  const isLight = previewTheme === "light";
  const mockStyles = useMemo(
    () => ({
      phoneBg: isLight ? "#FFFFFF" : "#111111",
      phoneBorder: isLight ? "#DCDCE0" : "#2A2A2E",
      line: isLight ? "#E8E8ED" : "#2C2C2F",
      pill: isLight ? "#111111" : "#FFFFFF",
      card: isLight ? "#F2F2F5" : "#1C1C20",
    }),
    [isLight]
  );

  return (
    <TouchableOpacity style={stylesStatic.optionWrap} onPress={onPress} activeOpacity={0.85}>
      <View
        style={[
          stylesStatic.phoneMock,
          {
            backgroundColor: mockStyles.phoneBg,
            borderColor: mockStyles.phoneBorder,
          },
        ]}
      >
        <View style={stylesStatic.mockHeader}>
          <View
            style={[
              stylesStatic.mockLine,
              { backgroundColor: mockStyles.line, width: "55%" },
            ]}
          />
          <View
            style={[
              stylesStatic.mockPill,
              { backgroundColor: mockStyles.pill },
            ]}
          />
        </View>
        <View style={stylesStatic.mockList}>
          <View
            style={[
              stylesStatic.mockCard,
              { backgroundColor: mockStyles.card },
            ]}
          />
          <View
            style={[
              stylesStatic.mockCard,
              { backgroundColor: mockStyles.card },
            ]}
          />
          <View
            style={[
              stylesStatic.mockFooterPill,
              { backgroundColor: mockStyles.pill },
            ]}
          />
        </View>
      </View>
      <Text style={[stylesStatic.optionLabel, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          stylesStatic.radioOuter,
          {
            borderColor: selected ? colors.text : colors.borderAlt,
            backgroundColor: colors.card,
          },
        ]}
      >
        {selected ? (
          <View style={[stylesStatic.radioInner, { backgroundColor: colors.text }]} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const stylesStatic = StyleSheet.create({
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
  },
  radioOuter: {
    marginTop: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
