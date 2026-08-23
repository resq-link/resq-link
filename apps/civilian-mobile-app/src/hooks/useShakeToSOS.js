import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { usePathname } from "expo-router";
import { useSOS } from "@/hooks/useSOS";
import useUserStore from "@/stores/userStore";
import useSOSStore from "@/stores/sosStore";
import { HIDE_NAV_SCREENS } from "@/constants/routes";

const UPDATE_INTERVAL_MS = 50;
const SHAKE_THRESHOLD = 4.5;
const SHAKE_WINDOW_MS = 2000;
const REQUIRED_SHAKES = 3;
const SHAKE_MIN_GAP_MS = 120;
const SHAKE_COOLDOWN_MS = 15000;

function isShakeScreen(pathname) {
  if (!pathname || pathname === "/") return false;
  return !HIDE_NAV_SCREENS.some(
    (screen) => pathname === screen || pathname?.endsWith(screen)
  );
}

export function useShakeToSOS() {
  const pathname = usePathname();
  const { user } = useUserStore();
  const { handleSOS, sosLoading } = useSOS();
  const confirmVisible = useSOSStore((s) => s.confirmVisible);
  const handleSOSRef = useRef(handleSOS);
  const lastTriggerRef = useRef(0);
  const lastReadingRef = useRef({ x: 0, y: 0, z: 0, time: 0 });
  const shakeWindowRef = useRef({ count: 0, start: 0, lastPeak: 0 });
  const appStateRef = useRef(AppState.currentState);

  handleSOSRef.current = handleSOS;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const active =
      !!user &&
      isShakeScreen(pathname) &&
      !sosLoading &&
      !confirmVisible &&
      appStateRef.current === "active";

    if (!active) {
      shakeWindowRef.current = { count: 0, start: 0, lastPeak: 0 };
      return undefined;
    }

    let mounted = true;

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

    const listener = Accelerometer.addListener(({ x, y, z }) => {
      if (!mounted || appStateRef.current !== "active") return;

      const now = Date.now();
      const last = lastReadingRef.current;
      const elapsed = now - last.time;

      if (elapsed < UPDATE_INTERVAL_MS) return;

      const delta =
        Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
      const speed = (delta / elapsed) * 1000;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      lastReadingRef.current = { x, y, z, time: now };

      const isStrongShake =
        speed > SHAKE_THRESHOLD && magnitude > 1.25;

      if (!isStrongShake) return;
      if (now - lastTriggerRef.current < SHAKE_COOLDOWN_MS) return;

      const window = shakeWindowRef.current;

      if (now - window.lastPeak < SHAKE_MIN_GAP_MS) return;

      if (!window.start || now - window.start > SHAKE_WINDOW_MS) {
        window.start = now;
        window.count = 1;
        window.lastPeak = now;
        return;
      }

      window.count += 1;
      window.lastPeak = now;

      if (window.count < REQUIRED_SHAKES) return;

      window.count = 0;
      window.start = 0;
      window.lastPeak = 0;
      lastTriggerRef.current = now;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      handleSOSRef.current();
    });

    return () => {
      mounted = false;
      listener.remove();
    };
  }, [user, pathname, sosLoading, confirmVisible]);
}
