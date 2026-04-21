import { Dimensions } from "react-native";

const { height: SCREEN_H } = Dimensions.get("window");

/** Default / collapsed sheet cap */
export const SHEET_COLLAPSED_MAX = Math.min(SCREEN_H * 0.34, 248);
/** Expanded sheet height when user drags the handle up */
export const SHEET_EXPANDED_MAX = Math.min(SCREEN_H * 0.52, 480);
/** Bottom padding above tab bar */
export const NAV_CLEARANCE = 72;

export const MAP_LOGO = require("../../../assets/images/resq-link-logo.png");
