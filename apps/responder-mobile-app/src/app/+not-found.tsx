import { Stack, useRouter } from "expo-router";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { colors, radii, spacing } from "@/theme";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Go to home</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: colors.text,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  buttonText: {
    color: colors.white,
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
  },
});
