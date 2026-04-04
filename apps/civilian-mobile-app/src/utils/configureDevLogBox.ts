import { LogBox } from "react-native";

/**
 * Dev-only: reduce noisy, expected warnings. Remove patterns if you need to debug those areas.
 */
export function configureDevLogBox(): void {
  if (!__DEV__) return;

  LogBox.ignoreLogs([
    // packages/firebase emergencies.ts: intentional fallback when Firestore composite index is missing.
    "Composite index not found, using alternative query method",

  ]);
}

configureDevLogBox();
