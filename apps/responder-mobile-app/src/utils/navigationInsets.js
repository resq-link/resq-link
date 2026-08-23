import { Platform } from "react-native";

const ANDROID_MIN_BOTTOM_INSET = 12;
const IOS_MIN_BOTTOM_INSET = 8;

/** Visible tab row height excluding the device bottom safe area. */
export const NAV_BAR_CONTENT_HEIGHT = 76;

export function getBottomNavInset(insets) {
  const min =
    Platform.OS === "android" ? ANDROID_MIN_BOTTOM_INSET : IOS_MIN_BOTTOM_INSET;
  return Math.max(insets?.bottom ?? 0, min);
}

/** Total occupied height from the bottom edge (bar + safe area). */
export function getBottomNavHeight(insets) {
  return NAV_BAR_CONTENT_HEIGHT + getBottomNavInset(insets);
}
