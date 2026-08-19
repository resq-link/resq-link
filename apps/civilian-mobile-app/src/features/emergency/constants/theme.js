import { createReportTheme } from "@/theme/factories";

export { createReportTheme };

/** @deprecated Use useAppTheme().reportTheme instead */
export const reportTheme = createReportTheme(false);

export const reportTypography = {
  display: 32,
  title: 24,
  body: 16,
  caption: 13,
};

export const STEP_LABELS = [
  "Type",
  "Location",
  "Details",
  "Review",
];
