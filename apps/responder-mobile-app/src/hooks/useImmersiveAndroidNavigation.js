import { useEffect, useRef } from "react";
import { AppState, Keyboard, Platform } from "react-native";

const REHIDE_DELAY_MS = 150;

async function getNavigationBar() {
  if (Platform.OS !== "android") {
    return null;
  }
  return import("expo-navigation-bar");
}

/**
 * Hides the Android system navigation bar so RESQ-Link custom bottom nav is
 * the primary navigation chrome. With edge-to-edge enabled, only visibility
 * and style APIs are supported (not position/behavior).
 */
export async function applyImmersiveAndroidNavigationBar() {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    const NavigationBar = await getNavigationBar();
    if (!NavigationBar) return;
    await NavigationBar.setVisibilityAsync("hidden");
  } catch (error) {
    if (__DEV__) {
      console.warn("[ImmersiveNav] setVisibilityAsync failed:", error);
    }
  }

  try {
    const NavigationBar = await getNavigationBar();
    if (!NavigationBar) return;
    await NavigationBar.setStyle("dark");
  } catch (error) {
    if (__DEV__) {
      console.warn("[ImmersiveNav] setStyle failed:", error);
    }
  }
}

/**
 * Keeps Android immersive navigation active for the entire app session.
 * iOS is unaffected (no system navigation bar to hide).
 */
export function useImmersiveAndroidNavigation() {
  const rehideTimerRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return undefined;
    }

    let visibilitySubscription = null;

    const scheduleRehide = () => {
      if (rehideTimerRef.current) {
        clearTimeout(rehideTimerRef.current);
      }
      rehideTimerRef.current = setTimeout(() => {
        applyImmersiveAndroidNavigationBar();
      }, REHIDE_DELAY_MS);
    };

    applyImmersiveAndroidNavigationBar();

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        scheduleRehide();
      }
    });

    getNavigationBar()
      .then((NavigationBar) => {
        if (!NavigationBar?.addVisibilityListener) return;
        visibilitySubscription = NavigationBar.addVisibilityListener(
          ({ visibility }) => {
            if (visibility === "visible") {
              scheduleRehide();
            }
          }
        );
      })
      .catch(() => {});

    const keyboardSubscription = Keyboard.addListener(
      "keyboardDidHide",
      scheduleRehide
    );

    return () => {
      appStateSubscription.remove();
      visibilitySubscription?.remove?.();
      keyboardSubscription.remove();
      if (rehideTimerRef.current) {
        clearTimeout(rehideTimerRef.current);
      }
    };
  }, []);
}
