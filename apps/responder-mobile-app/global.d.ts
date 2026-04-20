/// <reference types="expo-router/types" />

declare module "@/theme" {
  export type AppearancePreference = "light" | "dark" | "system";

  export function useResqTheme(): {
    appearance: AppearancePreference;
    setAppearance: (next: AppearancePreference) => void;
    hydrated: boolean;
    resolvedScheme: "light" | "dark";
    systemScheme: "light" | "dark";
    t: Record<string, string>;
    colors: Record<string, string>;
    statusBarStyle: "light" | "dark";
  };

  export function ResqThemeProvider(props: {
    children: import("react").ReactNode;
  }): import("react").ReactElement;

  export function buildSemanticColors(
    t: Record<string, string>
  ): Record<string, string>;

  export const darkResqTokens: Record<string, string>;
  export const lightResqTokens: Record<string, string>;

  export const spacing: Record<string, number>;
  export const radii: Record<string, number>;
  export const colors: Record<string, string>;

  export const dashboardThemeDark: Record<string, string | number | boolean>;
  export const dashboardThemeLight: Record<string, string | number | boolean>;
  export const dashboardTheme: Record<string, string | number | boolean>;
}

