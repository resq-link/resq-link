import React, { type ReactNode, useCallback, useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";

type ErrorBoundaryState = {
  hasError: boolean;
};

function ErrorFallback() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleReload = useCallback(() => {
    Updates.reloadAsync().catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>
        The app hit an unexpected error. Restart to continue.
      </Text>
      <Pressable
        onPress={handleReload}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Restart app"
      >
        <Text style={styles.buttonText}>Restart App</Text>
      </Pressable>
    </View>
  );
}

/**
 * Production-safe root error boundary. Catches unhandled render/lifecycle
 * errors so release builds show a recovery UI instead of crashing.
 */
export class RootErrorBoundary extends React.Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    if (__DEV__) {
      console.error("RootErrorBoundary caught:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F12",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#A1A1AA",
    textAlign: "center",
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#16A34A",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 180,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
