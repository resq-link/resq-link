import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { LEGAL_URLS } from "@/constants/legal";
import { openLegalDocument } from "@/utils/openLegalDocument";

export default function LegalConsentCheckbox({ checked, onToggle, colors, theme }) {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.row}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="Agree to Privacy Policy and Terms of Use"
      >
        <View
          style={[
            styles.box,
            {
              borderColor: checked ? theme.link : theme.inputBorder,
              backgroundColor: checked ? theme.link : "transparent",
            },
          ]}
        >
          {checked ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
        </View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          I agree to the{" "}
          <Text
            style={[styles.link, { color: theme.link }]}
            onPress={() => openLegalDocument(LEGAL_URLS.privacyPolicy, "Privacy policy")}
          >
            Privacy Policy
          </Text>
          ,{" "}
          <Text
            style={[styles.link, { color: theme.link }]}
            onPress={() => openLegalDocument(LEGAL_URLS.dataPrivacyNotice, "Data privacy notice")}
          >
            Data Privacy Notice
          </Text>
          , and{" "}
          <Text
            style={[styles.link, { color: theme.link }]}
            onPress={() => openLegalDocument(LEGAL_URLS.termsOfUse, "Terms of use")}
          >
            Terms of Use
          </Text>
          . I consent to identity verification using my government ID.
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  label: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  link: {
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
});
