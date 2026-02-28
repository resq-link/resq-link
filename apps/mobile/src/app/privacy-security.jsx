import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useAppTheme } from "@/utils/useAppTheme";

export default function PrivacySecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const comingSoon = (feature) => {
    Alert.alert("Coming soon", `${feature} will be available soon.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Privacy & Security</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <RowItem
          label="Change password"
          onPress={() => comingSoon("Password change")}
          textColor={colors.text}
          separatorColor={colors.separator}
        />
        <RowItem
          label="Manage data & consent"
          onPress={() => comingSoon("Data and consent")}
          textColor={colors.text}
          separatorColor={colors.separator}
        />
        <RowItem
          label="Privacy policy"
          onPress={() => comingSoon("Privacy policy")}
          textColor={colors.text}
          separatorColor={colors.separator}
          isLast
        />
      </View>
    </View>
  );
}

function RowItem({ label, onPress, textColor, separatorColor, isLast = false }) {
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: separatorColor }, isLast && styles.lastRow]}
      onPress={onPress}
    >
      <Text style={[styles.rowText, { color: textColor }]}>{label}</Text>
      <ChevronRight size={18} color={textColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    marginTop: 2,
  },
  card: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
});

