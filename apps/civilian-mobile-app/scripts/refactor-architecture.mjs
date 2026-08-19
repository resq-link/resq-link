/**
 * One-time architecture refactor: moves files and rewrites imports.
 * Run from apps/civilian-mobile-app: node scripts/refactor-architecture.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function moveFile(fromRel, toRel) {
  const from = path.join(ROOT, fromRel);
  const to = path.join(ROOT, toRel);
  if (!fs.existsSync(from)) {
    console.warn(`SKIP missing: ${fromRel}`);
    return;
  }
  ensureDir(path.dirname(to));
  if (fs.existsSync(to)) {
    console.warn(`SKIP exists: ${toRel}`);
    return;
  }
  fs.renameSync(from, to);
  console.log(`MOVED ${fromRel} -> ${toRel}`);
}

const moves = [
  // Stores
  ["src/utils/userStore.js", "src/stores/userStore.js"],
  ["src/utils/auth/store.js", "src/stores/authStore.js"],
  // Hooks
  ["src/utils/auth/useAuth.js", "src/hooks/useAuth.js"],
  ["src/utils/useAppTheme.js", "src/hooks/useAppTheme.js"],
  ["src/utils/useDispatcherCall.js", "src/hooks/useDispatcherCall.js"],
  ["src/utils/useImmersiveAndroidNavigation.js", "src/hooks/useImmersiveAndroidNavigation.js"],
  ["src/utils/useSOS.js", "src/hooks/useSOS.js"],
  ["src/theme/useThemedStyles.js", "src/hooks/useThemedStyles.js"],
  // Services
  ["src/utils/api.js", "src/services/api/index.js"],
  ["src/services/agoraVoice.js", "src/services/agora/voice.js"],
  // Utils
  ["src/utils/navigationInsets.js", "src/utils/navigationInsets.js"],
  ["src/utils/configureDevLogBox.ts", "src/utils/configureDevLogBox.ts"],
  // Lib
  ["src/__create/anything-menu.tsx", "src/lib/create/anything-menu.tsx"],
  ["src/__create/fetch.ts", "src/lib/create/fetch.ts"],
  ["src/__create/placeholder.svg", "src/lib/create/placeholder.svg"],
  ["src/__create/polyfills.ts", "src/lib/create/polyfills.ts"],
  // Shared components -> folders
  ["src/components/BackButton.jsx", "src/components/BackButton/index.jsx"],
  ["src/components/CustomBottomNav.jsx", "src/components/CustomBottomNav/index.jsx"],
  ["src/components/CustomButton.jsx", "src/components/CustomButton/index.jsx"],
  ["src/components/ErrorAlert.jsx", "src/components/ErrorAlert/index.jsx"],
  ["src/components/FormInput.jsx", "src/components/FormInput/index.jsx"],
  ["src/components/LoadingScreen.jsx", "src/components/LoadingScreen/index.jsx"],
  ["src/components/SuccessScreen.jsx", "src/components/SuccessScreen/index.jsx"],
  // Emergency feature
  ["src/components/report-emergency/AttachmentPicker.jsx", "src/features/emergency/components/AttachmentPicker.jsx"],
  ["src/components/report-emergency/BottomActionBar.jsx", "src/features/emergency/components/BottomActionBar.jsx"],
  ["src/components/report-emergency/DetailsSection.jsx", "src/features/emergency/components/DetailsSection.jsx"],
  ["src/components/report-emergency/EmergencyTypeSelector.jsx", "src/features/emergency/components/EmergencyTypeSelector.jsx"],
  ["src/components/report-emergency/HeaderStepIndicator.jsx", "src/features/emergency/components/HeaderStepIndicator.jsx"],
  ["src/components/report-emergency/LocationStep.jsx", "src/features/emergency/components/LocationStep.jsx"],
  ["src/components/report-emergency/MiniMapPreview.jsx", "src/features/emergency/components/MiniMapPreview.jsx"],
  ["src/components/report-emergency/ReportProgress.jsx", "src/features/emergency/components/ReportProgress.jsx"],
  ["src/components/report-emergency/ReviewSummary.jsx", "src/features/emergency/components/ReviewSummary.jsx"],
  ["src/components/report-emergency/SubmittingOverlay.jsx", "src/features/emergency/components/SubmittingOverlay.jsx"],
  ["src/components/report-emergency/useReportEmergency.js", "src/features/emergency/hooks/useReportEmergency.js"],
  ["src/components/report-emergency/constants.js", "src/features/emergency/constants/index.js"],
  ["src/components/report-emergency/theme.js", "src/features/emergency/constants/theme.js"],
  ["src/components/emergency-confirmation/IncidentDetailsCard.jsx", "src/features/emergency/components/confirmation/IncidentDetailsCard.jsx"],
  ["src/components/emergency-confirmation/IncidentStatusSection.jsx", "src/features/emergency/components/confirmation/IncidentStatusSection.jsx"],
  ["src/components/emergency-confirmation/LiveIncidentMapCard.jsx", "src/features/emergency/components/confirmation/LiveIncidentMapCard.jsx"],
  ["src/components/emergency-confirmation/VoiceCallSection.jsx", "src/features/emergency/components/confirmation/VoiceCallSection.jsx"],
  ["src/components/emergency-confirmation/incidentStatus.js", "src/features/emergency/utils/incidentStatus.js"],
  // History feature
  ["src/components/history/ActiveIncidentCard.jsx", "src/features/history/components/ActiveIncidentCard.jsx"],
  ["src/components/history/EmptyHistoryState.jsx", "src/features/history/components/EmptyHistoryState.jsx"],
  ["src/components/history/FilterChips.jsx", "src/features/history/components/FilterChips.jsx"],
  ["src/components/history/HistoryHeader.jsx", "src/features/history/components/HistoryHeader.jsx"],
  ["src/components/history/HistorySkeleton.jsx", "src/features/history/components/HistorySkeleton.jsx"],
  ["src/components/history/IncidentHistoryCard.jsx", "src/features/history/components/IncidentHistoryCard.jsx"],
  ["src/components/history/IncidentIconBadge.jsx", "src/features/history/components/IncidentIconBadge.jsx"],
  ["src/components/history/PremiumIncidentCard.jsx", "src/features/history/components/PremiumIncidentCard.jsx"],
  ["src/components/history/SearchBar.jsx", "src/features/history/components/SearchBar.jsx"],
  ["src/components/history/StatusChip.jsx", "src/features/history/components/StatusChip.jsx"],
  ["src/components/history/TimelineSectionHeader.jsx", "src/features/history/components/TimelineSectionHeader.jsx"],
  ["src/components/history/TrackLiveButton.jsx", "src/features/history/components/TrackLiveButton.jsx"],
  ["src/components/history/useHistoryReports.js", "src/features/history/hooks/useHistoryReports.js"],
  ["src/components/history/constants.js", "src/features/history/constants/index.js"],
  ["src/components/history/utils.js", "src/features/history/utils/index.js"],
  ["src/components/history/theme.js", "src/features/history/constants/typography.js"],
  // Incident map feature
  ["src/components/map/MapIncidentSheet.jsx", "src/features/incident-map/components/MapIncidentSheet.jsx"],
  ["src/components/map/MapMarkers.jsx", "src/features/incident-map/components/MapMarkers.jsx"],
  ["src/components/map/MapResourcesSheet.jsx", "src/features/incident-map/components/MapResourcesSheet.jsx"],
  ["src/components/map/MapTopBar.jsx", "src/features/incident-map/components/MapTopBar.jsx"],
  ["src/components/map/useMapScreen.js", "src/features/incident-map/hooks/useMapScreen.js"],
  ["src/components/map/mapUtils.js", "src/features/incident-map/utils/mapUtils.js"],
  ["src/components/map/incidentTimeline.js", "src/features/incident-map/utils/incidentTimeline.js"],
  // Settings feature
  ["src/components/settings/SettingsAboutCard.jsx", "src/features/settings/components/SettingsAboutCard.jsx"],
  ["src/components/settings/SettingsLogoutRow.jsx", "src/features/settings/components/SettingsLogoutRow.jsx"],
  ["src/components/settings/SettingsProfileHeader.jsx", "src/features/settings/components/SettingsProfileHeader.jsx"],
  ["src/components/settings/SettingsRow.jsx", "src/features/settings/components/SettingsRow.jsx"],
  ["src/components/settings/SettingsSection.jsx", "src/features/settings/components/SettingsSection.jsx"],
  ["src/components/settings/SettingsStatsCard.jsx", "src/features/settings/components/SettingsStatsCard.jsx"],
  ["src/components/settings/useSettingsAccountStats.js", "src/features/settings/hooks/useSettingsAccountStats.js"],
  ["src/components/settings/utils.js", "src/features/settings/utils/index.js"],
  ["src/components/settings/theme.js", "src/features/settings/constants/theme.js"],
  // Route screens -> features
  ["src/app/dashboard.jsx", "src/features/dashboard/screens/DashboardScreen.jsx"],
  ["src/app/login.jsx", "src/features/auth/screens/LoginScreen.jsx"],
  ["src/app/register.jsx", "src/features/auth/screens/RegisterScreen.jsx"],
  ["src/app/index.jsx", "src/features/auth/screens/SplashGateScreen.jsx"],
  ["src/app/emergency-form.jsx", "src/features/emergency/screens/EmergencyFormScreen.jsx"],
  ["src/app/emergency-confirmation.jsx", "src/features/emergency/screens/EmergencyConfirmationScreen.jsx"],
  ["src/app/calling.jsx", "src/features/voice-call/screens/CallingScreen.jsx"],
  ["src/app/responder-map.jsx", "src/features/incident-map/screens/ResponderMapScreen.jsx"],
  ["src/app/(tabs)/history.jsx", "src/features/history/screens/HistoryScreen.jsx"],
  ["src/app/(tabs)/profile.jsx", "src/features/profile/screens/ProfileScreen.jsx"],
  ["src/app/appearance.jsx", "src/features/settings/screens/AppearanceScreen.jsx"],
  ["src/app/notifications.jsx", "src/features/settings/screens/NotificationsScreen.jsx"],
  ["src/app/privacy-security.jsx", "src/features/settings/screens/PrivacySecurityScreen.jsx"],
  ["src/app/help-support.jsx", "src/features/settings/screens/HelpSupportScreen.jsx"],
  ["src/app/report-issue.jsx", "src/features/settings/screens/ReportIssueScreen.jsx"],
  ["src/app/faq.jsx", "src/features/settings/screens/FaqScreen.jsx"],
  ["src/app/(tabs)/_layout.jsx", "src/app/(main)/(tabs)/_layout.jsx"],
];

for (const [from, to] of moves) {
  moveFile(from, to);
}

// Remove empty dirs and dead files
const removeIfExists = (rel) => {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`DELETED ${rel}`);
  }
};
removeIfExists("src/utils/googleAuth.js");
removeIfExists("src/utils/auth/index.js");

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const importReplacements = [
  [/from ["']@\/utils\/userStore["']/g, 'from "@/stores/userStore"'],
  [/from ["']\.\.\/utils\/userStore["']/g, 'from "@/stores/userStore"'],
  [/from ["']\.\.\/\.\.\/utils\/userStore["']/g, 'from "@/stores/userStore"'],
  [/from ["']@\/utils\/auth\/useAuth["']/g, 'from "@/hooks/useAuth"'],
  [/from ["']@\/utils\/auth\/store["']/g, 'from "@/stores/authStore"'],
  [/from ["']@\/utils\/auth["']/g, 'from "@/hooks/useAuth"'],
  [/from ["']@\/utils\/api["']/g, 'from "@/services/api"'],
  [/from ["']\.\.\/utils\/api["']/g, 'from "@/services/api"'],
  [/from ["']\.\.\/\.\.\/utils\/api["']/g, 'from "@/services/api"'],
  [/from ["']@\/services\/agoraVoice["']/g, 'from "@/services/agora/voice"'],
  [/from ["']@\/utils\/useSOS["']/g, 'from "@/hooks/useSOS"'],
  [/from ["']\.\.\/utils\/useSOS["']/g, 'from "@/hooks/useSOS"'],
  [/from ["']@\/utils\/useDispatcherCall["']/g, 'from "@/hooks/useDispatcherCall"'],
  [/from ["']\.\.\/utils\/useDispatcherCall["']/g, 'from "@/hooks/useDispatcherCall"'],
  [/from ["']@\/utils\/useAppTheme["']/g, 'from "@/hooks/useAppTheme"'],
  [/from ["']@\/utils\/useImmersiveAndroidNavigation["']/g, 'from "@/hooks/useImmersiveAndroidNavigation"'],
  [/from ["']@\/theme\/useThemedStyles["']/g, 'from "@/hooks/useThemedStyles"'],
  [/from ["']@\/components\/report-emergency\//g, 'from "@/features/emergency/components/'],
  [/from ["']@\/components\/emergency-confirmation\//g, 'from "@/features/emergency/components/confirmation/'],
  [/from ["']@\/components\/history\//g, 'from "@/features/history/components/'],
  [/from ["']@\/components\/map\//g, 'from "@/features/incident-map/components/'],
  [/from ["']@\/components\/settings\//g, 'from "@/features/settings/components/'],
  [/from ["']\.\.\/components\/CustomButton["']/g, 'from "@/components/CustomButton"'],
  [/from ["']\.\.\/components\/LoadingScreen["']/g, 'from "@/components/LoadingScreen"'],
  [/from ["']\.\.\/components\/SuccessScreen["']/g, 'from "@/components/SuccessScreen"'],
  [/from ["']\.\.\/components\/BackButton["']/g, 'from "@/components/BackButton"'],
  [/from ["']\.\.\/components\/FormInput["']/g, 'from "@/components/FormInput"'],
  [/from ["']\.\.\/components\/ErrorAlert["']/g, 'from "@/components/ErrorAlert"'],
  [/from ["']\.\.\/components\/history\/StatusChip["']/g, 'from "@/features/history/components/StatusChip"'],
  [/from ["']\.\.\/components\/history\/constants["']/g, 'from "@/features/history/constants"'],
  [/from ["']@\/components\/history\/constants["']/g, 'from "@/features/history/constants"'],
  [/from ["']@\/components\/history\/utils["']/g, 'from "@/features/history/utils"'],
  [/from ["']@\/components\/history\/useHistoryReports["']/g, 'from "@/features/history/hooks/useHistoryReports"'],
  [/from ["']@\/components\/report-emergency\/useReportEmergency["']/g, 'from "@/features/emergency/hooks/useReportEmergency"'],
  [/from ["']@\/components\/report-emergency\/constants["']/g, 'from "@/features/emergency/constants"'],
  [/from ["']@\/components\/report-emergency\/theme["']/g, 'from "@/features/emergency/constants/theme"'],
  [/from ["']@\/components\/map\/useMapScreen["']/g, 'from "@/features/incident-map/hooks/useMapScreen"'],
  [/from ["']@\/components\/map\/mapUtils["']/g, 'from "@/features/incident-map/utils/mapUtils"'],
  [/from ["']@\/components\/map\/incidentTimeline["']/g, 'from "@/features/incident-map/utils/incidentTimeline"'],
  [/from ["']@\/components\/settings\/theme["']/g, 'from "@/features/settings/constants/theme"'],
  [/from ["']@\/components\/settings\/useSettingsAccountStats["']/g, 'from "@/features/settings/hooks/useSettingsAccountStats"'],
  [/from ["']@\/components\/settings\/utils["']/g, 'from "@/features/settings/utils"'],
  [/from ["']@\/hooks\/useAgoraVoiceCall["']/g, 'from "@/hooks/useAgoraVoiceCall"'],
  [/from ["']\.\/theme["']/g, 'from "@/features/history/constants/typography"'],
  [/from ["']\.\/constants["']/g, 'from "@/features/emergency/constants"'],
  [/from ["']\.\/utils["']/g, 'from "@/features/history/utils"'],
  [/from ["']\.\/incidentTimeline["']/g, 'from "@/features/incident-map/utils/incidentTimeline"'],
  [/from ["']\.\/mapUtils["']/g, 'from "@/features/incident-map/utils/mapUtils"'],
  [/from ["']\.\/incidentStatus["']/g, 'from "@/features/emergency/utils/incidentStatus"'],
  [/from ["']\.\.\/utils\/userStore["']/g, 'from "@/stores/userStore"'],
  [/from ["']\.\/userStore["']/g, 'from "@/stores/userStore"'],
  [/from ["']\.\/api["']/g, 'from "@/services/api"'],
  [/from ["']\.\/store["']/g, 'from "@/stores/authStore"'],
  [/from ["']@\/utils\/navigationInsets["']/g, 'from "@/utils/navigationInsets"'],
  [/from ["']@\/services\/agora\/voice["']/g, 'from "@/services/agora/voice"'],
  [/from ["']@\/stores\/authStore["']/g, 'from "@/stores/authStore"'],
  [/require\(["']\.\/src\/__create\/polyfills["']\)/g, 'require("./src/lib/create/polyfills")'],
  [/from ["']\.\/src\/__create\/polyfills["']/g, 'from "./src/lib/create/polyfills"'],
  [/from ["']\.\/src\/__create\/anything-menu["']/g, 'from "./src/lib/create/anything-menu"'],
  [/from ["']\.\.\/\.\.\/assets\/images\//g, 'from "@/assets/images/'],
];

// Feature-internal relative imports (within moved folders)
const featureRelativeReplacements = [
  [/from ["']\.\/theme["']/g, 'from "@/features/history/constants/typography"'],
];

const allFiles = walk(SRC).concat(walk(path.join(ROOT, "__create"))).concat([
  path.join(ROOT, "index.tsx"),
  path.join(ROOT, "polyfills/shared/expo-image.tsx"),
]);

for (const file of allFiles) {
  let content = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const [pattern, replacement] of importReplacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`UPDATED imports: ${path.relative(ROOT, file)}`);
  }
}

// Fix useAuth import of store
const useAuthPath = path.join(SRC, "hooks/useAuth.js");
if (fs.existsSync(useAuthPath)) {
  let c = fs.readFileSync(useAuthPath, "utf8");
  c = c.replace(/from ['"]\.\/store['"]/, 'from "@/stores/authStore"');
  fs.writeFileSync(useAuthPath, c);
}

// Fix useAppTheme to import from theme
const useAppThemePath = path.join(SRC, "hooks/useAppTheme.js");
if (fs.existsSync(useAppThemePath)) {
  let c = fs.readFileSync(useAppThemePath, "utf8");
  c = c.replace(/from ['"]\.\.\/theme\//, 'from "@/theme/');
  fs.writeFileSync(useAppThemePath, c);
}

// Fix useDispatcherCall and useSOS internal imports
for (const f of ["hooks/useDispatcherCall.js", "hooks/useSOS.js", "features/emergency/hooks/useReportEmergency.js"]) {
  const p = path.join(SRC, f);
  if (!fs.existsSync(p)) continue;
  let c = fs.readFileSync(p, "utf8");
  c = c.replace(/from ["']\.\/userStore["']/g, 'from "@/stores/userStore"');
  c = c.replace(/from ["']\.\/api["']/g, 'from "@/services/api"');
  fs.writeFileSync(p, c);
}

// Fix agora hook
const agoraHook = path.join(SRC, "hooks/useAgoraVoiceCall.js");
if (fs.existsSync(agoraHook)) {
  let c = fs.readFileSync(agoraHook, "utf8");
  c = c.replace(/@\/services\/agoraVoice/g, "@/services/agora/voice");
  fs.writeFileSync(agoraHook, c);
}

// Fix services/agora/voice
const agoraVoice = path.join(SRC, "services/agora/voice.js");
if (fs.existsSync(agoraVoice)) {
  let c = fs.readFileSync(agoraVoice, "utf8");
  c = c.replace(/@\/utils\/api/g, "@/services/api");
  fs.writeFileSync(agoraVoice, c);
}

// Fix useThemedStyles
const themedStyles = path.join(SRC, "hooks/useThemedStyles.js");
if (fs.existsSync(themedStyles)) {
  let c = fs.readFileSync(themedStyles, "utf8");
  c = c.replace(/from ["']\.\/AppThemeProvider["']/g, 'from "@/theme/AppThemeProvider"');
  fs.writeFileSync(themedStyles, c);
}

// Fix history components typography import
const historyComponents = path.join(SRC, "features/history/components");
if (fs.existsSync(historyComponents)) {
  for (const file of walk(historyComponents)) {
    let c = fs.readFileSync(file, "utf8");
    if (c.includes('./theme') || c.includes('"./theme"')) {
      c = c.replace(/from ["']\.\/theme["']/g, 'from "@/features/history/constants/typography"');
      fs.writeFileSync(file, c);
    }
  }
}

// Fix emergency components constants imports
const emergencyDir = path.join(SRC, "features/emergency");
if (fs.existsSync(emergencyDir)) {
  for (const file of walk(emergencyDir)) {
    let c = fs.readFileSync(file, "utf8");
    c = c.replace(/from ["']\.\/constants["']/g, 'from "@/features/emergency/constants"');
    c = c.replace(/from ["']\.\.\/constants["']/g, 'from "@/features/emergency/constants"');
    c = c.replace(/from ["']\.\/theme["']/g, 'from "@/features/emergency/constants/theme"');
    c = c.replace(/from ["']\.\.\/theme["']/g, 'from "@/features/emergency/constants/theme"');
    fs.writeFileSync(file, c);
  }
}

// Fix incident-map internal imports
const mapDir = path.join(SRC, "features/incident-map");
if (fs.existsSync(mapDir)) {
  for (const file of walk(mapDir)) {
    let c = fs.readFileSync(file, "utf8");
    c = c.replace(/from ["']\.\/mapUtils["']/g, 'from "@/features/incident-map/utils/mapUtils"');
    c = c.replace(/from ["']\.\/incidentTimeline["']/g, 'from "@/features/incident-map/utils/incidentTimeline"');
    c = c.replace(/@\/components\/history\//g, "@/features/history/");
    c = c.replace(/@\/features\/history\/components\/constants/g, "@/features/history/constants");
    c = c.replace(/@\/features\/history\/components\/utils/g, "@/features/history/utils");
    fs.writeFileSync(file, c);
  }
}

// Fix settings internal
const settingsDir = path.join(SRC, "features/settings");
if (fs.existsSync(settingsDir)) {
  for (const file of walk(settingsDir)) {
    let c = fs.readFileSync(file, "utf8");
    c = c.replace(/from ["']\.\/utils["']/g, 'from "@/features/settings/utils"');
    c = c.replace(/from ["']\.\/theme["']/g, 'from "@/features/settings/constants/theme"');
    fs.writeFileSync(file, c);
  }
}

// Fix history hooks/utils internal
const historyDir = path.join(SRC, "features/history");
if (fs.existsSync(historyDir)) {
  for (const file of walk(historyDir)) {
    let c = fs.readFileSync(file, "utf8");
    c = c.replace(/from ["']\.\/constants["']/g, 'from "@/features/history/constants"');
    c = c.replace(/from ["']\.\/utils["']/g, 'from "@/features/history/utils"');
    c = c.replace(/from ["']\.\/theme["']/g, 'from "@/features/history/constants/typography"');
    fs.writeFileSync(file, c);
  }
}

// Fix premium incident card factories import
const premiumCard = path.join(SRC, "features/history/components/PremiumIncidentCard.jsx");
if (fs.existsSync(premiumCard)) {
  let c = fs.readFileSync(premiumCard, "utf8");
  c = c.replace(/from ["']\.\/utils["']/g, 'from "@/features/history/utils"');
  c = c.replace(/from ["']\.\/IncidentIconBadge["']/g, 'from "@/features/history/components/IncidentIconBadge"');
  c = c.replace(/from ["']\.\/TrackLiveButton["']/g, 'from "@/features/history/components/TrackLiveButton"');
  fs.writeFileSync(premiumCard, c);
}

console.log("\nDone. Create route re-exports and config next.");
