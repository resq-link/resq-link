# Civilian Mobile App — Project Structure

> **RESQ-Link Civilian Mobile App** (`apps/civilian-mobile-app`)  
> Last documented from source: July 2026  
> Expo SDK 54 · React Native 0.81 · Expo Router 6

---

## 1. Project Overview

### Purpose

The civilian mobile app is the **public-facing emergency reporting client** for RESQ-Link. It allows civilians to authenticate, report emergencies, track active incidents, view responder locations on a map, contact the command center, and manage account settings.

### Main Features

| Feature | Description |
|---------|-------------|
| Authentication | Firebase email/password login and phone registration |
| Dashboard / Home | Active incidents, quick actions, emergency shortcuts |
| Emergency reporting | Multi-step form with location, photos, and incident details |
| SOS | One-tap emergency submission with GPS from bottom nav |
| Incident tracking | Real-time status updates and confirmation screen |
| Responder map | Live map with incident markers and resource sheets |
| Voice calls | Agora RTC voice sessions with dispatch (native dev builds) |
| History | Past and active incident timeline with search/filter |
| Settings | Profile, appearance, notifications, privacy, help, FAQ |

### Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo ~54, React Native 0.81, React 19 |
| Routing | Expo Router 6 (file-based, `src/app/`) |
| State | Zustand (`userStore`, auth store), React Query |
| Backend data | `@packages/firebase` (monorepo shared package) |
| REST API | Optional backend at port 4000 (`src/utils/api.js`) |
| Maps | `react-native-maps` (native), `@teovilla/react-native-web-maps` (web polyfill) |
| Voice | Agora RTC via `react-native-agora` + backend token endpoint |
| Styling | React Native StyleSheet, theme factories, Inter font |
| Icons | `lucide-react-native`, `@expo/vector-icons` |

---

## 2. Project Folder Structure

```text
apps/
└── civilian-mobile-app/
    ├── __create/                    # Create.com / sandbox platform scaffolding
    ├── __tests__/                   # Jest placeholder (README only)
    ├── android/                     # Native Android project (EAS / run:android)
    ├── assets/
    │   └── images/                  # App icons, splash, logo
    ├── dist/                        # Web export output (generated)
    ├── docs/
    │   └── Civilian-Mobile-App-Structure.md
    ├── polyfills/                   # Web/native Metro aliases
    │   ├── native/
    │   ├── shared/
    │   └── web/
    ├── public/                      # Static web assets (canvaskit.wasm)
    ├── src/
    │   ├── __create/                # In-app Create platform helpers
    │   ├── app/                     # Expo Router screens (routes)
    │   │   └── (tabs)/              # Tab group (history, profile)
    │   ├── components/              # UI components by feature
    │   │   ├── badges/
    │   │   ├── emergency-confirmation/
    │   │   ├── history/
    │   │   ├── map/
    │   │   ├── report-emergency/
    │   │   └── settings/
    │   ├── hooks/
    │   ├── services/
    │   ├── theme/
    │   └── utils/
    │       └── auth/
    ├── App.tsx                      # Web shell entry
    ├── index.tsx                    # Native entry
    ├── index.web.tsx                # Web bootstrap (Skia, fonts)
    ├── app.config.js                # Dynamic Expo config + env
    ├── app.json                     # Static Expo config
    ├── babel.config.js
    ├── eas.json                     # EAS Build profiles
    ├── metro.config.js              # Monorepo + polyfill resolution
    ├── package.json
    ├── tsconfig.json
    ├── global.css                   # Web global styles
    └── global.d.ts                  # TypeScript declarations
```

**Note:** There is no top-level `app/` folder. Expo Router routes live under `src/app/`. Firebase logic lives in the monorepo package `packages/firebase`, linked as `@packages/firebase`.

---

## 3. Folder Descriptions

| Folder | Purpose | Interactions |
|--------|---------|--------------|
| `src/app/` | File-based routes (screens). Each file is a route. | Consumes components, hooks, utils, Firebase package |
| `src/components/` | Presentational and feature UI. Grouped by domain. | Used by route screens; some contain co-located hooks/constants |
| `src/hooks/` | Cross-cutting React hooks (Agora voice). | Used by screens and feature components |
| `src/services/` | Non-React service modules (Agora token fetch). | Called by hooks and screens |
| `src/theme/` | Global theming: colors, factories, provider, styled hook. | Wraps app in `_layout.jsx`; consumed via `useAppTheme` |
| `src/utils/` | API config, stores, navigation helpers, feature hooks. | Shared across routes and components |
| `src/utils/auth/` | JWT SecureStore bootstrap for splash gating. | Used by root `_layout.jsx` |
| `src/__create/` | Create platform polyfills, dev menu, fetch wrapper. | Wired from `index.tsx` |
| `__create/` | Error boundaries, Metro error reporting, web CSS reset. | Wired from entry points and Metro |
| `polyfills/` | Platform-specific module replacements for web/native. | Aliased in `metro.config.js` |
| `assets/images/` | Static images referenced by routes and `app.json`. | Bundled by Metro |
| `android/` | Prebuild native Android project. | Generated/maintained for `expo run:android` |
| `packages/firebase` (monorepo) | Shared Firebase Auth, Firestore, Storage, call sessions. | Imported as `@packages/firebase` |

---

## 4. File Structure

### 4.1 Entry Points & Root

| File | Path | Exports / Role |
|------|------|----------------|
| `index.tsx` | `./index.tsx` | Native entry: polyfills, Create menu wrapper, registers Expo Router `App` |
| `index.web.tsx` | `./index.web.tsx` | Web entry: loads Skia WASM, inlines fonts, renders `App.tsx` |
| `App.tsx` | `./App.tsx` | Web shell: SafeArea, Toaster, AlertModal, sandbox iframe messaging |
| `global.css` | `./global.css` | Web global CSS imported by `App.tsx` |
| `global.d.ts` | `./global.d.ts` | Ambient TypeScript declarations |

### 4.2 Expo Router — `src/app/`

| File | Route | Purpose |
|------|-------|---------|
| `_layout.jsx` | — | Root layout: fonts, splash, QueryClient, theme, stack, `CustomBottomNav` |
| `index.jsx` | `/` | Splash / auth gate; redirects to dashboard or login |
| `login.jsx` | `/login` | Email/password login via Firebase `signInCivilian` |
| `register.jsx` | `/register` | Phone registration with Firebase phone auth |
| `dashboard.jsx` | `/dashboard` | Home screen: active incidents, SOS shortcuts, status cards |
| `(tabs)/_layout.jsx` | `/(tabs)` | Tab layout with hidden default tab bar |
| `(tabs)/history.jsx` | `/(tabs)/history` | Incident history with search and filters |
| `(tabs)/profile.jsx` | `/(tabs)/profile` | Settings hub and profile |
| `emergency-form.jsx` | `/emergency-form` | Multi-step emergency report wizard |
| `emergency-confirmation.jsx` | `/emergency-confirmation` | Post-submit tracking, map preview, voice call |
| `calling.jsx` | `/calling` | Full-screen voice call UI |
| `responder-map.jsx` | `/responder-map` | Map with bottom sheets for incident and resources |
| `appearance.jsx` | `/appearance` | Light/dark/system theme preference |
| `notifications.jsx` | `/notifications` | Notification preferences (AsyncStorage) |
| `privacy-security.jsx` | `/privacy-security` | Privacy settings screen |
| `help-support.jsx` | `/help-support` | Help and support links |
| `report-issue.jsx` | `/report-issue` | In-app issue reporting form |
| `faq.jsx` | `/faq` | FAQ content |
| `+not-found.tsx` | — | 404 screen with route list; fallback to `/dashboard` |

### 4.3 Shared Components — `src/components/`

| File | Purpose |
|------|---------|
| `BackButton.jsx` | Styled back navigation button |
| `CustomButton.jsx` | Primary/secondary themed button |
| `CustomBottomNav.jsx` | Floating bottom nav: Home, Map, Call, SOS, History, Settings |
| `ErrorAlert.jsx` | Inline error alert box |
| `FormInput.jsx` | Themed text input for forms |
| `LoadingScreen.jsx` | Full-screen loading indicator |
| `SuccessScreen.jsx` | Success confirmation screen |

#### `badges/`

| File | Purpose |
|------|---------|
| `IncidentStatusIndicator.jsx` | Status pill with colors from Firebase visual helpers |
| `StatusBadge.jsx` | Re-export of `IncidentStatusIndicator` |

#### `emergency-confirmation/`

| File | Purpose |
|------|---------|
| `IncidentDetailsCard.jsx` | Displays submitted incident fields |
| `IncidentStatusSection.jsx` | Status header with live badge |
| `LiveIncidentMapCard.jsx` | Map preview card linking to responder map |
| `VoiceCallSection.jsx` | Start/join/end voice call controls |
| `incidentStatus.js` | Timestamp formatting and status helpers |

#### `history/`

| File | Purpose |
|------|---------|
| `ActiveIncidentCard.jsx` | Featured card for in-progress reports |
| `IncidentHistoryCard.jsx` | Wrapper for archived/history reports |
| `PremiumIncidentCard.jsx` | Rich incident card with icon, time, track button |
| `IncidentIconBadge.jsx` | Incident type icon badge |
| `TrackLiveButton.jsx` | Animated CTA to track live incident |
| `FilterChips.jsx` | Status filter chips |
| `SearchBar.jsx` | History search input |
| `StatusChip.jsx` | Compact status label |
| `HistoryHeader.jsx` | History screen header with back |
| `HistorySkeleton.jsx` | Loading skeleton for history list |
| `EmptyHistoryState.jsx` | Empty state with report CTA |
| `TimelineSectionHeader.jsx` | Section divider (Active / Past) |
| `constants.js` | Status filters, active report detection |
| `theme.js` | Typography scale (`historyTypography`) |
| `utils.js` | Report normalization, time formatting |
| `useHistoryReports.js` | Fetches/subscribes to user reports from Firebase |

#### `map/`

| File | Purpose |
|------|---------|
| `MapTopBar.jsx` | Map screen header and controls |
| `MapMarkers.jsx` | Incident and responder map markers |
| `MapIncidentSheet.jsx` | Bottom sheet: incident details and timeline |
| `MapResourcesSheet.jsx` | Bottom sheet: nearby resources list |
| `mapUtils.js` | Responder merging, resource categorization, badge styles |
| `incidentTimeline.js` | Timeline steps from operational status |
| `useMapScreen.js` | Map state: location, subscriptions, API/mock resources |

#### `report-emergency/`

| File | Purpose |
|------|---------|
| `AttachmentPicker.jsx` | Photo attachment via `expo-image-picker` |
| `BottomActionBar.jsx` | Step navigation (Back / Next / Submit) |
| `DetailsSection.jsx` | Description and advanced fields |
| `EmergencyTypeSelector.jsx` | Incident type and profile picker |
| `HeaderStepIndicator.jsx` | Step progress header |
| `LocationStep.jsx` | GPS + manual map pin location step |
| `MiniMapPreview.jsx` | Small map preview on location step |
| `ReportProgress.jsx` | Step progress bar |
| `ReviewSummary.jsx` | Final review before submit |
| `SubmittingOverlay.jsx` | Submit progress overlay |
| `constants.js` | Steps, map defaults, field builders |
| `theme.js` | Report-specific typography tokens |
| `useReportEmergency.js` | Full wizard state machine and Firebase submit |

#### `settings/`

| File | Purpose |
|------|---------|
| `SettingsProfileHeader.jsx` | Avatar, name, phone display |
| `SettingsStatsCard.jsx` | Account stats (report counts) |
| `SettingsAboutCard.jsx` | App version and about info |
| `SettingsSection.jsx` | Grouped settings section wrapper |
| `SettingsRow.jsx` | Navigable settings row |
| `SettingsLogoutRow.jsx` | Logout action row |
| `theme.js` | Settings screen style tokens |
| `utils.js` | Display name, initials, masked phone |
| `useSettingsAccountStats.js` | Loads report stats from Firebase |

### 4.4 Hooks — `src/hooks/`

| File | Exports | Purpose |
|------|---------|---------|
| `useAgoraVoiceCall.js` | `useAgoraVoiceCall` | Agora engine lifecycle: join, mute, speaker, cleanup |

### 4.5 Services — `src/services/`

| File | Exports | Purpose |
|------|---------|---------|
| `agoraVoice.js` | `getAgoraAppId`, `fetchAgoraRtcToken` | Reads Agora config; fetches RTC token from backend API |

### 4.6 Theme — `src/theme/`

| File | Purpose |
|------|---------|
| `AppThemeProvider.jsx` | Context provider: light/dark/system, feature themes |
| `colors.js` | Base color palette factory |
| `factories.js` | Theme factories for auth, dashboard, history, map, nav, report, calling |
| `useThemedStyles.js` | Hook for memoized themed StyleSheet callbacks |

### 4.7 Utils — `src/utils/`

| File | Purpose |
|------|---------|
| `api.js` | API base URL resolution, `UI_MODE`, `mockData`, `getApiUrl` |
| `userStore.js` | Zustand store: user persisted in AsyncStorage |
| `useAppTheme.js` | Hook to consume `AppThemeContext` |
| `useSOS.js` | SOS button handler: GPS + `submitEmergencyReport` |
| `useDispatcherCall.js` | Command center call: haptics + `startIncidentCallSession` |
| `useImmersiveAndroidNavigation.js` | Hides Android navigation bar |
| `navigationInsets.js` | Bottom nav safe-area inset helper |
| `configureDevLogBox.ts` | Dev-only LogBox configuration |
| `googleAuth.js` | **Empty file — unused placeholder** |

#### `src/utils/auth/`

| File | Purpose |
|------|---------|
| `useAuth.js` | Bootstraps JWT from SecureStore; gates splash screen |
| `store.js` | Zustand auth store with SecureStore persistence |
| `index.js` | Re-exports `useAuth` |

### 4.8 Platform Scaffolding

#### `__create/` (root)

| File | Purpose |
|------|---------|
| `consoleToParent.ts` | Forwards console to parent iframe (web sandbox) |
| `DeviceErrorBoundary.tsx` | Native dev error boundary |
| `SharedErrorBoundary.tsx` | Shared error boundary with serialization |
| `report-error-to-remote.js` | Metro remote error reporter |
| `handle-resolve-request-error.js` | Virtual module resolver for Metro |
| `reset.css` | Web CSS reset |

#### `src/__create/`

| File | Purpose |
|------|---------|
| `anything-menu.tsx` | Dev overlay menu (Create platform) |
| `fetch.ts` | Fetch polyfill/wrapper |
| `polyfills.ts` | Additional runtime polyfills |
| `placeholder.svg` | Fallback image for `expo-image` polyfill |

#### `polyfills/`

| Path | Replaces |
|------|----------|
| `web/secureStore.web.ts` | `expo-secure-store` on web |
| `web/maps.web.jsx` | `react-native-maps` on web |
| `web/location.web.ts` | `expo-location` on web |
| `web/notifications.web.tsx` | `expo-notifications` on web (toast) |
| `web/alerts.web.tsx` | RN Alert on web |
| `web/contacts.web.ts` | `expo-contacts` on web |
| `web/haptics.web.ts` | `expo-haptics` on web |
| `web/tabbar.web.jsx` | Expo Router Tabs layout on web |
| `web/safeAreaContext.web.jsx` | Safe area on web |
| `web/SafeAreaView.web.jsx` | SafeAreaView on web |
| `web/scrollview.web.jsx` | ScrollView on web |
| `web/refreshControl.web.tsx` | Pull-to-refresh on web |
| `web/statusBar.web.tsx` | Status bar on web |
| `web/webview.web.tsx` | WebView on web |
| `shared/expo-image.tsx` | `expo-image` with Buffer polyfill |
| `native/texinput.native.jsx` | RN TextInput native override |

---

## 5. Architecture Overview

### Overall Pattern

The app follows a **feature-sliced** layout:

1. **Routes** (`src/app/`) — thin screen containers that compose components and wire navigation.
2. **Feature components** (`src/components/<feature>/`) — UI + co-located hooks/constants for a domain.
3. **Shared components** (`src/components/*.jsx`) — cross-feature UI primitives.
4. **Utils / hooks / services** — state, API, and side-effect logic.
5. **Theme layer** — centralized light/dark theming via context and factories.
6. **Firebase package** — all Firestore/Auth/Storage operations live in `@packages/firebase`.

### Separation of Concerns

| Concern | Location |
|---------|----------|
| Navigation / routing | Expo Router file routes + `CustomBottomNav` |
| User session (profile) | `userStore.js` + AsyncStorage |
| Auth bootstrap (JWT) | `useAuth` + SecureStore (splash only) |
| Firebase operations | `@packages/firebase` |
| REST fallback / mock | `api.js` when `UI_MODE` or responder API |
| Theming | `AppThemeProvider` + `useAppTheme` |
| Server cache | React Query in `_layout.jsx` (available app-wide) |

### Reusable Components

Shared primitives (`CustomButton`, `FormInput`, `LoadingScreen`, `ErrorAlert`, `BackButton`) are used across auth and form flows. Feature components are reused within their domain (e.g. `PremiumIncidentCard` used by both history cards).

---

## 6. Navigation Structure

### Entry Flow

```text
index.tsx / index.web.tsx
        │
        ▼
src/app/_layout.jsx  (Stack + providers + CustomBottomNav)
        │
        ▼
src/app/index.jsx  (auth gate)
        ├── user + Firebase session → /dashboard
        └── no session → /login
```

### Stack Routes (registered in `_layout.jsx`)

All routes use `headerShown: false`. The custom bottom nav overlays most authenticated screens.

### Tab Group `(tabs)`

| Tab route | Visible in bottom nav | Notes |
|-----------|----------------------|-------|
| `history` | Yes → `/(tabs)/history` | Default Expo tab bar hidden |
| `profile` | Yes → `/(tabs)/profile` | Labeled "Settings" in nav |

Home is **`/dashboard`** (stack route), not a tab index route.

### Custom Bottom Nav (`CustomBottomNav.jsx`)

| Nav item | Route | Hidden on |
|----------|-------|-----------|
| Home | `/dashboard` | login, register, emergency flows, settings sub-screens |
| Map | `/responder-map` | same |
| Call | (action) | Dispatches `useDispatcherCall` |
| SOS | (action) | Dispatches `useSOS` |
| History | `/(tabs)/history` | same |
| Settings | `/(tabs)/profile` | same |

### Navigation Diagram

```mermaid
flowchart TD
    Start[index.jsx Auth Gate] --> Dashboard[/dashboard]
    Start --> Login[/login]
    Login --> Register[/register]
    Login --> Dashboard
    Register --> Dashboard

    Dashboard --> EmergencyForm[/emergency-form]
    EmergencyForm --> Confirmation[/emergency-confirmation]
    Confirmation --> Calling[/calling]
    Confirmation --> ResponderMap[/responder-map]

    Dashboard --> ResponderMap
    Dashboard --> History[/(tabs)/history]
    Dashboard --> Profile[/(tabs)/profile]

    Profile --> Appearance[/appearance]
    Profile --> Notifications[/notifications]
    Profile --> Privacy[/privacy-security]
    Profile --> Help[/help-support]
    Profile --> ReportIssue[/report-issue]
    Profile --> FAQ[/faq]
```

---

## 7. Data Flow

### Authentication Flow

1. User submits credentials on `login.jsx` or phone on `register.jsx`.
2. Firebase functions from `@packages/firebase` authenticate (`signInCivilian`, phone auth).
3. Profile is written to `userStore` → persisted in **AsyncStorage**.
4. `index.jsx` listens to `onAuthStateChanged`; stale AsyncStorage is cleared if Firebase session is missing.

### Emergency Report Flow

1. User opens `/emergency-form` → `useReportEmergency` manages wizard state.
2. Location from `expo-location`; photos from `expo-image-picker`.
3. On submit: images uploaded via `uploadImageToStorage`, report via `submitEmergencyReport` (Firebase).
4. In **UI_MODE**: mock data from `api.js` bypasses network.
5. Router navigates to `/emergency-confirmation?reportId=...`.
6. Confirmation screen subscribes to `subscribeToEmergencyReport` for live updates.

### SOS Flow

1. User taps SOS in `CustomBottomNav` → `useSOS`.
2. Confirmation alert → GPS fetch → `submitEmergencyReport` with minimal payload.
3. Navigates to confirmation screen.

### Map / Resources Flow

1. `useMapScreen` loads user reports from Firebase.
2. Subscribes to active report and resources via Firebase listeners.
3. Optionally fetches responder locations from REST API (`/api/responders/locations`) when not in UI_MODE.
4. Map sheets display normalized data from `mapUtils.js`.

### State Management Summary

| State | Mechanism | Persistence |
|-------|-----------|-------------|
| User profile | Zustand `userStore` | AsyncStorage |
| Auth ready flag | Zustand `useAuthStore` | SecureStore (JWT) |
| Theme preference | React context | AsyncStorage |
| Notification prefs | Screen-local + AsyncStorage | AsyncStorage |
| Feature wizard state | Component hooks | In-memory |
| Server data | Firebase listeners + React Query | Firebase / cache |

---

## 8. Firebase Integration

Firebase is **not configured inside the mobile app source**. Configuration is injected via:

- `app.config.js` → reads `.env` / `EXPO_PUBLIC_*` → `extra.firebase`
- Shared package: `packages/firebase` imported as `@packages/firebase`

### Services Used by This App

| Service | Usage in app |
|---------|--------------|
| **Authentication** | `signInCivilian`, phone auth, `getFirebaseAuth`, `onAuthStateChanged`, ID tokens for Agora |
| **Firestore** | Emergency reports CRUD, subscriptions, call sessions, resources, operational status |
| **Storage** | `uploadImageToStorage` for emergency photo attachments |
| **Call sessions** | `startIncidentCallSession`, `subscribeToIncidentCallSessions`, connect/end/fail helpers |

### Key Firebase Functions Consumed

| Function | Used in |
|----------|---------|
| `submitEmergencyReport` | SOS, report wizard |
| `getUserEmergencyReports` | Dashboard, history, map, settings stats |
| `subscribeToEmergencyReport` | Confirmation, map |
| `subscribeToResources` | Map resources sheet |
| `uploadImageToStorage` | Report attachments |
| `normalizeOperationalStatus` | Status badges, history, map timeline |
| `startIncidentCallSession` / `endIncidentCallSession` | Dispatcher call, voice sections |
| `signInCivilian` / phone auth helpers | Login, register |

### Notifications

`expo-notifications` is listed as a dependency and polyfilled on web (toast via `sonner-native`). The `notifications.jsx` screen manages **local preferences** in AsyncStorage. Push notification registration logic is not prominently implemented in the analyzed route files — **assumption:** push may be planned or handled elsewhere.

---

## 9. Component Organization

### Hierarchy (simplified)

```text
RootLayout (_layout.jsx)
├── Stack screens (routes)
└── CustomBottomNav
    ├── NavTab × 4
    ├── CallActionButton → useDispatcherCall
    └── SOSActionButton → useSOS

dashboard.jsx
├── Inline ActiveIncidentCard (dashboard-specific)
├── StatusChip, constants from history/
└── useSOS, useDispatcherCall

emergency-form.jsx
└── report-emergency/* components
    └── useReportEmergency (hook)

emergency-confirmation.jsx
└── emergency-confirmation/* + useAgoraVoiceCall

responder-map.jsx
└── map/* + @gorhom/bottom-sheet

(tabs)/history.jsx
└── history/* + useHistoryReports

(tabs)/profile.jsx
└── settings/* + useSettingsAccountStats
```

### Reusability

- **High reuse:** `PremiumIncidentCard`, `StatusBadge`, `CustomButton`, theme hooks.
- **Feature-bound:** Report wizard components, map sheets, settings cards.
- **Screen-specific:** Dashboard has its own `ActiveIncidentCard` implementation separate from `history/ActiveIncidentCard.jsx`.

---

## 10. Hooks and Utilities

### Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAgoraVoiceCall` | `src/hooks/useAgoraVoiceCall.js` | Agora RTC channel join/leave, mute, speaker |
| `useReportEmergency` | `src/components/report-emergency/useReportEmergency.js` | Emergency form wizard state and submit |
| `useHistoryReports` | `src/components/history/useHistoryReports.js` | Load/filter user incident history |
| `useMapScreen` | `src/components/map/useMapScreen.js` | Map data, location, subscriptions |
| `useSettingsAccountStats` | `src/components/settings/useSettingsAccountStats.js` | Account report statistics |
| `useSOS` | `src/utils/useSOS.js` | SOS emergency submission |
| `useDispatcherCall` | `src/utils/useDispatcherCall.js` | Initiate command center call session |
| `useAppTheme` | `src/utils/useAppTheme.js` | Access theme context |
| `useThemedStyles` | `src/theme/useThemedStyles.js` | Memoized themed styles |
| `useAuth` | `src/utils/auth/useAuth.js` | Auth bootstrap for splash |
| `useImmersiveAndroidNavigation` | `src/utils/useImmersiveAndroidNavigation.js` | Android immersive nav bar |

### Utility Modules

| Module | Purpose |
|--------|---------|
| `api.js` | API URL, UI_MODE, mock data, endpoint helpers |
| `userStore.js` | Global user Zustand store |
| `navigationInsets.js` | Safe area inset for bottom nav |
| `configureDevLogBox.ts` | Dev LogBox filters |
| `history/utils.js` | Report normalization helpers |
| `history/constants.js` | Status labels and active detection |
| `map/mapUtils.js` | Map marker/resource helpers |
| `settings/utils.js` | User display formatting |
| `incidentStatus.js` / `incidentTimeline.js` | Status and timeline helpers |

---

## 11. Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, npm scripts (`start`, `android`, `ios`, `doctor`), Jest preset |
| `app.json` | Static Expo config: name, icons, permissions, plugins, `extra.apiUrl`, `extra.uiMode` |
| `app.config.js` | Merges `app.json` with `.env` Firebase and Agora keys into `extra` |
| `tsconfig.json` | Strict TS, `@/*` → `./src/*` path alias |
| `babel.config.js` | `babel-preset-expo` with `unstable_transformImportMeta` |
| `metro.config.js` | Monorepo watch folders, Firebase resolution, web/native polyfill aliases, error reporting |
| `eas.json` | EAS Build profiles: development, preview, production |
| `.env` | Local secrets (gitignored): `EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_AGORA_APP_ID` |
| `.gitignore` | Ignores node_modules, `.expo/`, export artifacts, `.metro-virtual/` |
| `.easignore` | Files excluded from EAS uploads |

### Environment Variables (via `app.config.js`)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase client config |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `EXPO_PUBLIC_AGORA_APP_ID` | Agora RTC app ID |
| `EXPO_PUBLIC_API_URL` | Optional REST API override |

---

## 12. External Dependencies

### Core

| Package | Why |
|---------|-----|
| `expo` / `expo-router` | App framework and file-based routing |
| `react-native` / `react-native-web` | Native and web UI |
| `@packages/firebase` | Monorepo Firebase abstraction |
| `zustand` | Lightweight global state |
| `@tanstack/react-query` | Server state caching (root provider) |

### UI & UX

| Package | Why |
|---------|-----|
| `@expo-google-fonts/inter` | Inter font family |
| `lucide-react-native` | Icon set |
| `react-native-reanimated` | Animations (nav, cards, dashboard) |
| `react-native-gesture-handler` | Gestures (root wrapper) |
| `@gorhom/bottom-sheet` | Map incident/resource sheets |
| `expo-linear-gradient` / `expo-blur` | Visual effects on auth/dashboard |
| `expo-haptics` | Tactile feedback on SOS/call |
| `moti` | Create dev menu animations |

### Device & Media

| Package | Why |
|---------|-----|
| `expo-location` | GPS for emergencies and map |
| `expo-image-picker` / `expo-camera` | Photo attachments |
| `react-native-maps` | Native map view |
| `@teovilla/react-native-web-maps` | Web map polyfill |
| `react-native-agora` | Voice calls (native builds) |
| `expo-secure-store` / `@react-native-async-storage/async-storage` | Secure and persistent storage |

### Platform / Tooling

| Package | Why |
|---------|-----|
| `@shopify/react-native-skia` | Web Skia rendering (`index.web.tsx`) |
| `sonner-native` | Toast notifications (web polyfill) |
| `serialize-error` / `html-to-image` | Error reporting and web font inlining |
| `lodash` | Used in web tab bar polyfill (`merge`) |
| `buffer` | Polyfill for expo-image shared module |

---

## 13. Project Flow

### Launch → Authenticated Home

1. App starts via `index.tsx` (native) or `index.web.tsx` (web).
2. Root layout loads fonts, auth bootstrap, user from AsyncStorage.
3. Splash hides when ready.
4. `index.jsx` checks user + Firebase auth → `/dashboard` or `/login`.

### Emergency Reporting

1. User taps report from dashboard or history empty state → `/emergency-form`.
2. Four-step wizard: type → location → details/photos → review.
3. Submit uploads images and creates Firestore report.
4. Redirect to `/emergency-confirmation` with live status subscription.
5. Optional voice call via Agora on native dev builds.

### Quick SOS

1. SOS button in bottom nav (any main screen).
2. Confirms → captures GPS → submits minimal emergency report.
3. Navigates to confirmation screen.

### Map & Tracking

1. Bottom nav "Map" → `/responder-map`.
2. Shows user location, active incident marker, responder/resource markers.
3. Bottom sheets show incident timeline and nearby resources.

### Settings

1. Bottom nav "Settings" → `/(tabs)/profile`.
2. Sub-screens for appearance, notifications, privacy, help, FAQ, report issue.
3. Logout clears AsyncStorage user and Firebase session.

---

## 14. Development Notes

### Architectural Strengths

- Clear **feature-based component folders** aligned with user flows.
- **Shared Firebase package** avoids duplicating Firestore logic across apps.
- **Theme factories** provide consistent light/dark styling per feature.
- **UI_MODE** enables full UI development without backend/Firebase.
- **Metro polyfills** allow web preview of a native-heavy app.
- **Custom bottom nav** centralizes primary navigation and emergency actions.

### Areas for Improvement

| Area | Notes |
|------|-------|
| Dual home routes | Home is `/dashboard` (stack) while tabs group has no index; could consolidate |
| Dual auth paths | Firebase + `userStore` vs JWT `useAuth` SecureStore bootstrap |
| Duplicate cards | Dashboard defines its own `ActiveIncidentCard` vs `history/ActiveIncidentCard` |
| Empty files | `googleAuth.js`, root `README.md` are empty |
| Tests | Jest configured but only `__tests__/README.md` exists — no test files |
| TypeScript mix | Mostly `.jsx`/`.js`; only some `.tsx`/`.ts` files |
| Create scaffolding | `__create/` folders add complexity if not using Create platform |

### Potential Refactoring Opportunities

- Extract dashboard `ActiveIncidentCard` to shared history component or a `shared/` folder.
- Simplify auth to a single source of truth (Firebase session + profile store).
- Move feature hooks from `components/*/use*.js` to `src/hooks/` for consistency.
- Add barrel exports (`index.js`) per feature folder for cleaner imports.
- Replace empty `googleAuth.js` or implement Google Sign-In if planned.

### Detected Unused / Low-Value Code (not deleted)

| Item | Status |
|------|--------|
| `src/utils/googleAuth.js` | Empty, zero imports |
| Root `README.md` | Empty |
| `__tests__/README.md` | Documentation only, no tests |
| JWT auth store | Used only for splash gating; sign-in modal stack was removed in prior cleanup |

### Build Artifacts (gitignored)

Generated folders that should not be committed:

- `.expo/`, `.expo-export-*/`, `.metro-virtual/`, `dist/`, `caches/`

---

## Related Documentation

| Document | Location |
|----------|----------|
| Firebase integration notes | `apps/civilian-mobile-app/FIREBASE_INTEGRATION.md` |
| Firebase storage steps | `apps/civilian-mobile-app/FIREBASE_STORAGE_NEXT_STEPS.md` |
| Shared Firebase package | `packages/firebase/README.md` |
| Responder app structure (reference) | `apps/responder-mobile-app/docs/RESPONDER-APP-STRUCTURE-GUIDE.md` |

---

*This document reflects the codebase as analyzed. Assumptions are labeled where runtime behavior could not be fully determined from static analysis alone.*
