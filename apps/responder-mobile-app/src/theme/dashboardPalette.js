/**
 * Back-compat: logged-in palette keys match `darkResqTokens` / `lightResqTokens`.
 * Prefer `useResqTheme().t` for correct light/dark.
 */
export { darkResqTokens as dashboardPalette } from "./resqTokens";

export const dashboardConstants = {
  unitLabel: "BFP Tuguegarao Unit",
};
