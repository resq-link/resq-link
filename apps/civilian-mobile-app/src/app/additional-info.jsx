import { View, Text, StyleSheet } from "react-native";

/**
 * Placeholder route so Expo Router has a valid default export.
 * Wire navigation here when the additional-info flow is implemented.
 */
export default function AdditionalInfoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Additional information</Text>
      <Text style={styles.subtitle}>This screen is not connected to a flow yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
});
