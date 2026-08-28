import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { AlertCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import useSOSStore from "@/stores/sosStore";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function SOSConfirmationModal() {
  const { confirmVisible, closeConfirmation, confirm } = useSOSStore();
  const { isLight } = useAppTheme();

  const backdrop = isLight ? "rgba(13, 15, 18, 0.55)" : "rgba(0, 0, 0, 0.72)";
  const cardBg = isLight ? "#FFFFFF" : "#1C1C1E";
  const titleColor = isLight ? "#0D0F12" : "#FFFFFF";
  const bodyColor = isLight ? "#5C6370" : "#A1A1AA";
  const cancelBg = isLight ? "#F2F2F7" : "#2C2C2E";
  const cancelText = isLight ? "#0D0F12" : "#FFFFFF";

  return (
    <Modal
      visible={confirmVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeConfirmation}
    >
      <View style={[styles.backdrop, { backgroundColor: backdrop }]}>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <LinearGradient
            colors={["#FF5A52", "#FF3B30"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <AlertCircle size={32} color="#FFFFFF" strokeWidth={2.2} />
          </LinearGradient>

          <Text style={[styles.title, { color: titleColor }]}>SOS Emergency</Text>
          <Text style={[styles.body, { color: bodyColor }]}>
            This will send your location to the command center. Tap Send SOS to
            confirm.
          </Text>

          <Pressable
            onPress={confirm}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send SOS"
          >
            <LinearGradient
              colors={["#FF5A52", "#FF3B30"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendButtonInner}
            >
              <Text style={styles.sendButtonText}>Send SOS</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={closeConfirmation}
            style={({ pressed }) => [
              styles.cancelButton,
              { backgroundColor: cancelBg },
              pressed && styles.cancelButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Cancel SOS"
          >
            <Text style={[styles.cancelButtonText, { color: cancelText }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  sendButton: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
  },
  sendButtonPressed: {
    opacity: 0.88,
  },
  sendButtonInner: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  cancelButton: {
    width: "100%",
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonPressed: {
    opacity: 0.85,
  },
  cancelButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});

