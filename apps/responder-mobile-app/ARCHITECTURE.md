# Responder Mobile App Architecture

## Overview

This document defines the **target folder and module layout** for `apps/responder-mobile-app`—an Expo (SDK 54) + React Native app using **Expo Router** (`expo-router` ~6), **Zustand**, **TanStack React Query**, and the workspace package **`@packages/firebase`**.

Today the app already follows a sensible baseline—**`src/app/`** for file-based routes, **`src/components/`** for shared UI, **`src/theme/`** for tokens and palettes, **`src/context/`** for theme, **`polyfills/`** for web-only behavior (e.g. maps), and **`src/utils/`** for helpers plus some app state and auth-related code. The gap is not “random files,” but **mixed responsibilities**: very large route files (e.g. map and dashboard flows) combine UI, domain rules, and data orchestration; **incident-specific** components sit next to **generic** ones in a flat `components` folder; and **state and auth-related code** live under `utils/`, which blurs naming and discoverability.

### Why restructuring is needed (clean, scalable, maintainable)

- **Onboarding and navigation**: New contributors should infer where auth, incidents, map, and ops/dashboard logic live without scanning thousand-line screens.
- **Change isolation**: Features evolve independently; a flat or screen-centric layout increases merge conflict risk and duplicated patterns.
- **Alignment with the monorepo**: Firebase and shared types live in `packages/firebase`; the mobile app needs a thin, explicit **services** layer so UI does not embed transport and schema details.
- **Production readiness**: Clear boundaries make testing (unit + integration), error boundaries, and performance work (memoization, list virtualization, query keys) easier to apply consistently.

## Goals

- **Clean folder organization**: One obvious home for routing, features, shared UI, and infrastructure.
- **Separation of concerns**: Route files stay thin; screens compose hooks and presentational pieces; data access stays out of JSX where practical.
- **Reusable components**: Generic controls (inputs, buttons, layout, alerts) stay sharable; domain widgets stay near their feature.
- **Scalable architecture for future features**: New domains (e.g. rostering, equipment, dispatch integrations) add a **`features/<domain>/`** slice instead of inflating global folders.
- **Consistent naming and structure**: Predictable file names and barrel exports (where helpful) without ceremony overload.

## Proposed Folder Structure

The project **already uses Expo’s `src` directory**, so the target layout keeps **`src/` as the application source root** (Expo Router continues to resolve routes from `src/app`). Tooling and native/project files remain at the app root as they are today.

```text
apps/
└── responder-mobile-app/
    ├── app.config.js           # Expo config (env → extra.firebase, etc.)
    ├── app.json
    ├── index.tsx               # Entry (Expo / Router bootstrap)
    ├── App.tsx                 # Optional root wrapper if retained
    ├── assets/                 # App icons, splash, static images
    ├── polyfills/              # Platform-specific shims (e.g. web maps)
    ├── patches/                # patch-package (dependency fixes)
    ├── openspec/               # Change proposals / specs (optional, process-related)
    │
    └── src/
        ├── app/                # Expo Router: navigation + route entry files only (thin)
        │
        ├── components/         # Cross-feature, reusable UI (presentational when possible)
        │
        ├── features/           # Feature slices (recommended primary organization)
        │   ├── auth/
        │   │   ├── screens/
        │   │   ├── components/
        │   │   ├── hooks/
        │   │   └── index.ts    # Optional public API for the feature
        │   ├── incidents/      # Cases: list, detail, status, priority, cards, etc.
        │   ├── map/            # Map UI, annotations, offline/location UX (split from mega-routes)
        │   ├── ops/            # Dashboard / operational views (aggregations, widgets)
        │   ├── notifications/
        │   └── settings/       # Settings, about, help (or split help if it grows)
        │
        ├── services/           # Firebase / REST / Uploadcare wrappers; maps SDK glue
        │   └── firebase/       # Thin adapters over `@packages/firebase` + app-specific types
        │
        ├── store/              # Zustand stores (domain-split: auth, session, UI shell, etc.)
        ├── query/              # TanStack Query: queryClient, keys, shared fetchers (optional but useful)
        │
        ├── hooks/              # Cross-feature hooks (useAppState, useDebouncedValue, etc.)
        ├── utils/              # Pure helpers only (formatting, parsing, guards)
        ├── constants/          # Static values, route names, storage keys, feature flags
        ├── types/              # Shared TypeScript types (re-export from packages where needed)
        │
        ├── config/             # Typed access to expo-constants `extra`, env validation
        ├── styles/             # Global styles; re-exports cohesive theme surfaces
        └── theme/              # Design tokens, palettes (or fold into styles/—pick one root)
```

**Monorepo note:** Shared persistence, rules, and low-level Firebase access remain in **`packages/firebase`**. The app’s **`src/services/`** layer should expose **use-case-shaped** functions (e.g. “subscribe to my assigned incidents”) and keep Firestore path strings and serialization out of screens.

## Folder Responsibilities

### `src/app/`

- **Handles navigation and routing** via Expo Router (layouts, nested stacks, tabs, redirects).
- **Entry point of screens**: Route files should import **feature screens** from `src/features/.../screens` and wire params only.
- Avoid embedding large domain logic here; keep **route files thin** so deep links and layout changes stay simple.

### `src/components/`

- **Shared and reusable UI** used in multiple features: buttons, inputs, loading states, generic badges, navigation chrome where it is truly global.
- **Prefer dumb/presentational** components; data fetching and Firebase belong in hooks/services.
- **Domain-heavy widgets** (e.g. incident-specific cards) migrate to `src/features/incidents/...` unless reused broadly.

### `src/features/`

- **Primary home for product behavior**, grouped by domain.
- Each feature typically contains:
  - **`screens/`**: Full-screen compositions for that domain.
  - **`components/`**: Feature-specific UI not reused elsewhere.
  - **`hooks/`**: Feature hooks (`useIncidentFeed`, `useMapAnnotations`, …).
  - **`services/`** (optional): Only when calls are **scoped** to that feature and should not pollute global services.
- This structure directly addresses current **screen file bloat** by moving map logic, incident subscriptions, and dashboard aggregation into cohesive modules.

### `src/services/`

- **Centralized Firebase and API logic** (including third-party SDKs such as maps or uploads when they are service-oriented).
- **No UI logic**; return data and errors for hooks/stores to interpret.
- Wraps **`@packages/firebase`** so the app can evolve (caching strategy, retries, telemetry) without touching every screen.

### `src/store/`

- **Zustand (and similar) global state**, split by domain (e.g. `authStore`, `sessionStore`, `uiStore`).
- **Migration note:** Stores or state modules currently living under `src/utils/` (e.g. user/session concerns) belong here to match their role and avoid the misleading “utils” label.

### `src/hooks/`

- **Reusable logic** across features: subscriptions to app lifecycle, debouncing, keyboard, permissions, formatted selectors, etc.
- Feature-specific hooks stay under `src/features/<name>/hooks/`.

### `src/utils/`

- **Pure helper functions**: string/date formatting, small pure transforms, guards.
- **Not** for side-effecting API clients, authentication flows, or global stores.

### `src/constants/`

- **Static values**: enums, defaults, async storage keys, query key segments, animation timings, map defaults.
- Keeps magic strings out of services and UI.

### `src/types/`

- **Shared interfaces and types** for the app layer; prefer importing canonical types from `packages/firebase` when exported, and add **view models** here when UI shape differs from persistence shape.

### `assets/`

- **Images, icons, fonts** referenced by Metro; keep large binaries and generated build output (e.g. local `dist-test/` bundles) **out of source-controlled “architecture”—artifacts belong in `.gitignore` or CI outputs.**

### `src/config/`

- **Runtime configuration**: validated access to `expo-constants` `extra`, environment-driven toggles, and typed Firebase settings already injected via `app.config.js`.

### `src/styles/` and `src/theme/`

- **Global styles / theme setup**: unify tokens (today spread across multiple palette/theme files) behind a **single documented surface**—either nest theme under `styles/` **or** keep `theme/` as the token engine and use `styles/` for cross-cutting StyleSheet primitives. Pick one top-level convention to avoid duplication.

### `polyfills/` (app root)

- **Platform shims** that must load before certain modules on web or native (as with maps-related polyfills today). Keeps **`src/` free of environment bootstrap noise**.

## Architecture Principles

- **Feature-based structure over flat structure**: Reduces unrelated coupling and makes ownership obvious (incidents vs map vs ops).
- **Separation of concerns**: UI renders; hooks coordinate; services fetch/mutate; stores hold client state; queries handle server-state caching (TanStack Query already in dependencies).
- **Reusability and modularity**: Extract once patterns appear twice; prefer small modules over oversized route files.
- **Single responsibility per file**: Especially for navigation, data, and presentation.
- **Consistent naming conventions**: File names reflect their role (see below).

## Naming Conventions

- **Components**: `PascalCase` files (e.g. `IncidentCard.tsx` / `IncidentCard.jsx` during incremental migration).
- **Hooks**: `camelCase` with `use` prefix (e.g. `useAuth.ts`, `useIncidentDetail.ts`).
- **Services**: `camelCase` typically suffixed with role (e.g. `incidentService.ts`, `presenceService.ts`)—choose `*Service.ts` or `*.ts` under `services/` consistently.
- **Stores**: `camelCase` with `*Store` suffix (e.g. `authStore.ts`).
- **Files and folders**: **kebab-case** for folders (`incident-detail/`) or **camelCase** for single files—pick one folder convention project-wide; **route files** follow Expo Router rules (often `map.jsx`, `case-detail.jsx`).

## Notes

- This structure is a **target architecture** for a **future refactor**, not a snapshot of every file today.
- **Existing functionality must be preserved during migration**: prefer **incremental moves** (one feature at a time), **thin re-exports** from old paths during transition, and **parity testing** on critical flows (login, incident list/detail, map, notifications).
- **TanStack Query**: Introduce `src/query/` (client, keys, shared patterns) if not already centralized—pairs naturally with `services/` and keeps cache policy consistent.
- **Documentation and process**: Folders like `openspec/` can remain for proposals; they are orthogonal to runtime architecture.
- **TypeScript migration**: The app mixes `.jsx` and some `.tsx`; over time, **types/** and feature modules benefit from gradual TS adoption starting at `services/` and `store/`.

This document is the **single source of truth** for how the responder mobile app **should** be organized as the codebase grows.
