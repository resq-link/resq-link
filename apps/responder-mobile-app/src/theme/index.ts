export {
  ResqThemeProvider,
  useResqTheme,
  buildSemanticColors,
} from "@/context/ResqThemeContext";

export { darkResqTokens, lightResqTokens } from "./tokens/resqTokens";

/** @deprecated Static snapshot (dark-only). Prefer `useResqTheme().colors`. */
export { colors } from "./palettes/colors";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
};

export {
  dashboardThemeDark,
  dashboardThemeLight,
  dashboardTheme,
} from "./themes/dashboardTheme";

export { getMapTheme, MAP_DARK_STYLE, MAP_LIGHT_STYLE } from "./themes/mapTheme";

/** Dashboard settings copy + legacy alias — prefer `dashboardConstants.unitLabel` via theme where needed */
export {
  dashboardConstants,
  dashboardPalette,
} from "./palettes/dashboardPalette";
