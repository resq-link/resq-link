import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Linking,
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

export default function ReportIssueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleSubmit = async () => {
    if (!subject.trim() || !details.trim()) {
      Alert.alert("Missing info", "Please add both subject and details.");
      return;
    }

    const mailtoUrl = `mailto:support@rescueapp.local?subject=${encodeURIComponent(
      `[Issue] ${subject.trim()}`
    )}&body=${encodeURIComponent(details.trim())}`;

    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (!canOpen) {
      Alert.alert("Not available", "No email app available on this device.");
      return;
    }

    await Linking.openURL(mailtoUrl);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Report an issue</Text>
      </View>

      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder="Subject"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      />

      <TextInput
        value={details}
        onChangeText={setDetails}
        placeholder="Describe the issue"
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        style={[
          styles.textArea,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      />

      <TouchableOpacity style={[styles.sendButton, { borderColor: colors.text }]} onPress={handleSubmit}>
        <Text style={[styles.sendText, { color: colors.text }]}>Send</Text>
      </TouchableOpacity>
    </View>
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
  input: {
    marginTop: 20,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  textArea: {
    marginTop: 12,
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  sendButton: {
    marginTop: 18,
    borderWidth: 2,
    borderRadius: 999,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  sendText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
});

