/**
 * Fallback dark semantic colors for edge cases outside React tree.
 * Screens should use `useResqTheme().colors`.
 */
import { buildSemanticColors } from "@/context/ResqThemeContext";
import { darkResqTokens } from "../tokens/resqTokens";

export const colors = buildSemanticColors(darkResqTokens);
