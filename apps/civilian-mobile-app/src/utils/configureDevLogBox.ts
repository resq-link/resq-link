import { LogBox } from "react-native";

/**
 * Dev-only: reduce noisy, expected warnings. Remove patterns if you need to debug those areas.
 */
export function configureDevLogBox(): void {
  if (!__DEV__) return;

  LogBox.ignoreLogs([
    // Harmless Metro / Expo dev noise (add patterns as needed)
  ]);
}

configureDevLogBox();
