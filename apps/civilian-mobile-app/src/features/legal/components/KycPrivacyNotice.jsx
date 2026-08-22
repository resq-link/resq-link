import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shield } from "lucide-react-native";

export default function KycPrivacyNotice({ colors, theme }) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.inputBg,
          borderColor: theme.inputBorder,
        },
      ]}
    >
      <View style={styles.header}>
        <Shield size={18} color={theme.link} />
        <Text style={[styles.title, { color: colors.text }]}>Identity verification</Text>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        To protect emergency services from misuse, we require a photo of your government-issued ID. Your ID is uploaded
        securely, reviewed manually by authorized RESQ-Link administrators, and used only for identity verification — not
        for advertising or sale to third parties.
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary, marginTop: 8 }]}>
        By continuing, you consent to this processing as described in our Privacy Policy and Data Privacy Notice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
});
