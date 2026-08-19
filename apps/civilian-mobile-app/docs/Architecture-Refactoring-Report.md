# Architecture Refactoring Report

> **Date:** July 2026  
> **Scope:** `apps/civilian-mobile-app` — structural refactor only (no UI/behavior changes)

---

## Summary

The civilian mobile app was reorganized from a flat `components/` + `utils/` layout into a **feature-based architecture** with clear separation between routing, features, shared UI, hooks, stores, services, and theme.

**Validation:** `npx expo export --platform android` completed successfully after refactoring.

---

## New Top-Level Structure

```text
src/
├── app/                    # Expo Router routes only (thin re-exports)
│   ├── (auth)/
│   ├── (main)/
│   └── (settings)/
├── components/             # Shared UI (BackButton, CustomBottomNav, badges, etc.)
├── config/                 # Runtime config re-exports
├── constants/              # Shared constants (routes)
├── features/               # Feature modules
│   ├── auth/
│   ├── dashboard/
│   ├── emergency/
│   ├── history/
│   ├── incident-map/
│   ├── profile/
│   ├── settings/
│   └── voice-call/
├── hooks/                  # Global hooks
├── lib/create/             # Create platform scaffolding (from src/__create)
├── services/               # API + Agora services
├── stores/                 # Zustand stores
├── theme/                  # Design system
└── utils/                  # Generic utilities (navigationInsets, configureDevLogBox)
```

---

## Folders Created

| Folder | Purpose |
|--------|---------|
| `src/features/auth/` | Login, register, splash gate screens |
| `src/features/dashboard/` | Dashboard screen |
| `src/features/emergency/` | Report wizard, confirmation, components, hooks, constants |
| `src/features/history/` | History screen, list components, hooks, constants |
| `src/features/incident-map/` | Map screen, sheets, markers, hooks, utils |
| `src/features/profile/` | Settings profile hub screen |
| `src/features/settings/` | Settings sub-screens and components |
| `src/features/voice-call/` | Calling screen |
| `src/stores/` | `userStore`, `authStore` |
| `src/services/api/` | REST API client + mock data |
| `src/services/agora/` | Agora token service |
| `src/lib/create/` | Platform dev scaffolding |
| `src/config/` | Config re-exports |
| `src/constants/` | Shared route constants |
| `src/app/(auth)/` | Auth route group |
| `src/app/(main)/` | Main app route group |
| `src/app/(settings)/` | Settings route group |
| `src/components/{Name}/` | Shared component folders with `index.jsx` |

---

## Files Moved (by category)

### Stores (2)
| From | To |
|------|-----|
| `src/utils/userStore.js` | `src/stores/userStore.js` |
| `src/utils/auth/store.js` | `src/stores/authStore.js` |

### Global Hooks (7)
| From | To |
|------|-----|
| `src/utils/auth/useAuth.js` | `src/hooks/useAuth.js` |
| `src/utils/useAppTheme.js` | `src/hooks/useAppTheme.js` |
| `src/utils/useDispatcherCall.js` | `src/hooks/useDispatcherCall.js` |
| `src/utils/useImmersiveAndroidNavigation.js` | `src/hooks/useImmersiveAndroidNavigation.js` |
| `src/utils/useSOS.js` | `src/hooks/useSOS.js` |
| `src/theme/useThemedStyles.js` | `src/hooks/useThemedStyles.js` |
| `src/hooks/useAgoraVoiceCall.js` | *(unchanged location)* |

### Services (2)
| From | To |
|------|-----|
| `src/utils/api.js` | `src/services/api/index.js` |
| `src/services/agoraVoice.js` | `src/services/agora/voice.js` |

### Lib (4)
| From | To |
|------|-----|
| `src/__create/*` | `src/lib/create/*` |

### Shared Components (7 → folder/index pattern)
| From | To |
|------|-----|
| `src/components/BackButton.jsx` | `src/components/BackButton/index.jsx` |
| `src/components/CustomBottomNav.jsx` | `src/components/CustomBottomNav/index.jsx` |
| `src/components/CustomButton.jsx` | `src/components/CustomButton/index.jsx` |
| `src/components/ErrorAlert.jsx` | `src/components/ErrorAlert/index.jsx` |
| `src/components/FormInput.jsx` | `src/components/FormInput/index.jsx` |
| `src/components/LoadingScreen.jsx` | `src/components/LoadingScreen/index.jsx` |
| `src/components/SuccessScreen.jsx` | `src/components/SuccessScreen/index.jsx` |

### Emergency Feature (18 files)
| From | To |
|------|-----|
| `src/components/report-emergency/*` | `src/features/emergency/components/` |
| `src/components/emergency-confirmation/*` | `src/features/emergency/components/confirmation/` |
| `useReportEmergency.js` | `src/features/emergency/hooks/` |
| `constants.js`, `theme.js` | `src/features/emergency/constants/` |
| `incidentStatus.js` | `src/features/emergency/utils/` |
| Route screens | `src/features/emergency/screens/` |

### History Feature (18 files)
| From | To |
|------|-----|
| `src/components/history/*.jsx` | `src/features/history/components/` |
| `useHistoryReports.js` | `src/features/history/hooks/` |
| `constants.js` | `src/features/history/constants/index.js` |
| `utils.js` | `src/features/history/utils/index.js` |
| `theme.js` | `src/features/history/constants/typography.js` |
| `(tabs)/history.jsx` | `src/features/history/screens/HistoryScreen.jsx` |

### Incident Map Feature (9 files)
| From | To |
|------|-----|
| `src/components/map/*.jsx` | `src/features/incident-map/components/` |
| `useMapScreen.js` | `src/features/incident-map/hooks/` |
| `mapUtils.js`, `incidentTimeline.js` | `src/features/incident-map/utils/` |
| `responder-map.jsx` | `src/features/incident-map/screens/ResponderMapScreen.jsx` |

### Settings Feature (11 files)
| From | To |
|------|-----|
| `src/components/settings/*.jsx` | `src/features/settings/components/` |
| `useSettingsAccountStats.js` | `src/features/settings/hooks/` |
| `utils.js` | `src/features/settings/utils/index.js` |
| `theme.js` | `src/features/settings/constants/theme.js` |
| Settings route screens | `src/features/settings/screens/` |

### Other Screens (5)
| From | To |
|------|-----|
| `src/app/dashboard.jsx` | `src/features/dashboard/screens/DashboardScreen.jsx` |
| `src/app/login.jsx` | `src/features/auth/screens/LoginScreen.jsx` |
| `src/app/register.jsx` | `src/features/auth/screens/RegisterScreen.jsx` |
| `src/app/index.jsx` | `src/features/auth/screens/SplashGateScreen.jsx` |
| `src/app/calling.jsx` | `src/features/voice-call/screens/CallingScreen.jsx` |
| `(tabs)/profile.jsx` | `src/features/profile/screens/ProfileScreen.jsx` |

---

## Route Reorganization

Expo Router URLs are **unchanged**. Route files in `src/app/` are now thin re-exports:

| Route URL | App file | Screen implementation |
|-----------|----------|----------------------|
| `/` | `app/index.jsx` | `features/auth/screens/SplashGateScreen` |
| `/login` | `app/(auth)/login.jsx` | `features/auth/screens/LoginScreen` |
| `/register` | `app/(auth)/register.jsx` | `features/auth/screens/RegisterScreen` |
| `/dashboard` | `app/(main)/dashboard.jsx` | `features/dashboard/screens/DashboardScreen` |
| `/emergency-form` | `app/(main)/emergency-form.jsx` | `features/emergency/screens/EmergencyFormScreen` |
| `/emergency-confirmation` | `app/(main)/emergency-confirmation.jsx` | `features/emergency/screens/EmergencyConfirmationScreen` |
| `/calling` | `app/(main)/calling.jsx` | `features/voice-call/screens/CallingScreen` |
| `/responder-map` | `app/(main)/responder-map.jsx` | `features/incident-map/screens/ResponderMapScreen` |
| `/(tabs)/history` | `app/(main)/(tabs)/history.jsx` | `features/history/screens/HistoryScreen` |
| `/(tabs)/profile` | `app/(main)/(tabs)/profile.jsx` | `features/profile/screens/ProfileScreen` |
| `/appearance` etc. | `app/(settings)/*.jsx` | `features/settings/screens/*` |

Added group layouts: `(auth)/_layout.jsx`, `(main)/_layout.jsx`, `(settings)/_layout.jsx`.

---

## Files Deleted

| File | Reason |
|------|--------|
| `src/utils/googleAuth.js` | Empty, zero imports |
| `src/utils/auth/index.js` | Obsolete after auth module split |

## Empty Folders Removed

- `src/components/report-emergency/`
- `src/components/history/`
- `src/components/map/`
- `src/components/settings/`
- `src/components/emergency-confirmation/`
- `src/utils/auth/`
- `src/__create/`
- `src/app/(tabs)/` (legacy location)

---

## Import Path Changes

All imports updated from legacy paths to new architecture:

| Old path | New path |
|----------|----------|
| `@/utils/userStore` | `@/stores/userStore` |
| `@/utils/auth/useAuth` | `@/hooks/useAuth` |
| `@/utils/auth/store` | `@/stores/authStore` |
| `@/utils/api` | `@/services/api` |
| `@/services/agoraVoice` | `@/services/agora/voice` |
| `@/utils/useSOS` | `@/hooks/useSOS` |
| `@/utils/useDispatcherCall` | `@/hooks/useDispatcherCall` |
| `@/utils/useAppTheme` | `@/hooks/useAppTheme` |
| `@/utils/useImmersiveAndroidNavigation` | `@/hooks/useImmersiveAndroidNavigation` |
| `@/theme/useThemedStyles` | `@/hooks/useThemedStyles` |
| `@/components/report-emergency/*` | `@/features/emergency/components/*` |
| `@/components/emergency-confirmation/*` | `@/features/emergency/components/confirmation/*` |
| `@/components/history/*` | `@/features/history/components/*` or `constants/`, `hooks/`, `utils/` |
| `@/components/map/*` | `@/features/incident-map/components/*` or `hooks/`, `utils/` |
| `@/components/settings/*` | `@/features/settings/components/*` or `hooks/`, `constants/` |
| `./src/__create/polyfills` | `./src/lib/create/polyfills` |

Also updated: `index.tsx`, `App.tsx`, `polyfills/shared/expo-image.tsx`.

---

## Barrel Exports Added

| File | Exports |
|------|---------|
| `src/stores/index.js` | `userStore`, `authStore`, `authKey` |
| `src/hooks/index.js` | All global hooks |
| `src/constants/routes.js` | `ROUTES`, `HIDE_NAV_SCREENS` |
| `src/config/api.js` | API config re-exports |

---

## Architectural Improvements

1. **Route-only `app/` folder** — Screens live in `features/*/screens/`; routes are one-line re-exports.
2. **Feature modules** — Emergency, history, map, settings, auth, voice-call grouped with co-located components, hooks, constants, utils.
3. **Centralized state** — Zustand stores in `stores/`.
4. **Service layer** — API and Agora separated under `services/`.
5. **Global hooks** — Cross-cutting hooks in `hooks/` instead of scattered in `utils/`.
6. **Route groups** — `(auth)`, `(main)`, `(settings)` for logical navigation structure without URL changes.
7. **Shared components** — Folder-per-component pattern for shared UI.
8. **Platform code** — Create scaffolding moved to `lib/create/`.

---

## Intentionally Not Changed

| Item | Reason |
|------|--------|
| Route URL paths | Preserved for deep links and bottom nav |
| `assets/` at project root | Expo `app.json` references `./assets/images/*` |
| `theme/factories.js` | Visual tokens unchanged to preserve appearance |
| Dashboard inline `ActiveIncidentCard` | Kept in screen file (future extract candidate) |
| Root `__create/` | Metro error reporting still references root path |
| Duplicate theme constants in feature folders | Preserved to avoid visual regression |

---

## Remaining Recommendations

1. **Extract dashboard sub-components** — `DashboardScreen.jsx` (1,187 lines) could split into `features/dashboard/components/`.
2. **Extract login sub-components** — `LoginScreen.jsx` (961 lines) has inline UI worth extracting to `features/auth/components/`.
3. **Wire `constants/routes.js` into CustomBottomNav** — Replace hardcoded route strings with shared constants.
4. **Move root `assets/` to `src/assets/`** — Update `app.json` paths if desired.
5. **Add feature barrel exports** — e.g. `@/features/emergency` index for cleaner imports.
6. **Add Jest tests** — Config exists but no test files.
7. **Consolidate theme tokens** — Merge feature `constants/theme.js` typography into central `theme/typography.js` when safe.
8. **Update `Civilian-Mobile-App-Structure.md`** — Reflect new architecture.

---

## Validation Checklist

| Check | Status |
|-------|--------|
| Broken imports | None found |
| `npx expo export --platform android` | Passed |
| Route URLs preserved | Yes |
| Firebase `@packages/firebase` imports | Unchanged |
| Zustand persistence | Unchanged (same store logic) |
| CustomBottomNav routes | Unchanged paths |

---

*Generated after architectural refactoring. No UI, business logic, or Firebase behavior was intentionally modified.*
