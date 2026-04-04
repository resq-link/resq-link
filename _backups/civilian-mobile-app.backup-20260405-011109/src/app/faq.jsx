import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react-native";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useAppTheme } from "@/utils/useAppTheme";

const FAQ_ITEMS = [
  {
    q: "How do I report an emergency?",
    a: "Tap the SOS or Report Emergency button and complete the emergency form.",
  },
  {
    q: "How can I view my previous reports?",
    a: "Go to History from the bottom navigation to view all submitted reports.",
  },
  {
    q: "Can I change app appearance?",
    a: "Yes. Open Settings > Appearance, choose Light/Dark/System, then tap Save.",
  },
  {
    q: "How do I contact support?",
    a: "Open Settings > Help & Support, then use Report an issue or Email support.",
  },
];

export default function FaqScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [openIndex, setOpenIndex] = useState(0);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>FAQ</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 18, paddingBottom: 20 }}>
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <TouchableOpacity
              key={item.q}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setOpenIndex(isOpen ? -1 : index)}
              activeOpacity={0.8}
            >
              <View style={styles.questionRow}>
                <Text style={[styles.question, { color: colors.text }]}>{item.q}</Text>
                {isOpen ? (
                  <ChevronUp size={18} color={colors.text} />
                ) : (
                  <ChevronDown size={18} color={colors.text} />
                )}
              </View>
              {isOpen ? <Text style={[styles.answer, { color: colors.textSecondary }]}>{item.a}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  question: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  answer: {
    marginTop: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 21,
  },
});

