import React, { type ReactNode, useCallback, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";

type ErrorBoundaryState = {
  hasError: boolean;
  error: unknown | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  return "Unknown error";
}

function getErrorStack(error: unknown): string {
  if (error instanceof Error && error.stack) {
    return error.stack.slice(0, 400);
  }
  return "";
}

function ErrorFallback({ error }: { error: unknown | null }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleReload = useCallback(() => {
    Updates.reloadAsync().catch(() => {});
  }, []);

  const message = getErrorMessage(error);
  const stack = getErrorStack(error);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>
        The app hit an unexpected error. Restart to continue.
      </Text>

      <ScrollView
        style={styles.detailsScroll}
        contentContainerStyle={styles.detailsContent}
        showsVerticalScrollIndicator
      >
        <Text style={styles.detailsLabel}>Error details</Text>
        <Text style={styles.detailsMessage} selectable>
          {message}
        </Text>
        {stack ? (
          <Text style={styles.detailsStack} selectable>
            {stack}
          </Text>
        ) : null}
      </ScrollView>

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
 * Surfaces error.message + truncated stack so TestFlight issues can be diagnosed.
 */
export class RootErrorBoundary extends React.Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error("RootErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
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
    paddingHorizontal: 24,
    paddingVertical: 48,
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
    marginBottom: 20,
  },
  detailsScroll: {
    maxHeight: 220,
    width: "100%",
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: "#1A1D21",
  },
  detailsContent: {
    padding: 14,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#71717A",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailsMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: "#FCA5A5",
    marginBottom: 10,
  },
  detailsStack: {
    fontSize: 11,
    lineHeight: 16,
    color: "#A1A1AA",
    fontFamily: "Courier",
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
