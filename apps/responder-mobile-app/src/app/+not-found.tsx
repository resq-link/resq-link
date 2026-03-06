import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  
  return (
    <>
      <Stack.Screen options={{ title: 'Oops! Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.button}>
          <Text style={styles.buttonText}>Go to home screen</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});

