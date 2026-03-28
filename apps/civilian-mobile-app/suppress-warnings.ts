import { LogBox } from "react-native";

/**
 * Must be imported before other app modules so LogBox applies before
 * dependency trees load (SafeAreaView deprecation, etc.).
 */
if (__DEV__) {
  LogBox.ignoreAllLogs();
  LogBox.ignoreLogs([
    "SafeAreaView has been deprecated",
    "Non-serializable values were found in the navigation state",
  ]);

  // LogBox does not stop Metro from printing `console.warn` to the terminal.
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const text = args
      .map((a) =>
        typeof a === "string"
          ? a
          : a !== null &&
              typeof a === "object" &&
              "message" in a &&
              typeof (a as { message?: unknown }).message === "string"
            ? String((a as { message: string }).message)
            : String(a),
      )
      .join(" ");
    if (text.includes("SafeAreaView has been deprecated")) {
      return;
    }
    originalWarn.apply(console, args as Parameters<typeof console.warn>);
  };
}
