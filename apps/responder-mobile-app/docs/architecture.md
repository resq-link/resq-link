# Responder Mobile App — Architecture

**Single source of truth** for folder layout, routing, and boundaries in `apps/responder-mobile-app`.

**Companion:** [RESPONDER-APP-STRUCTURE-GUIDE.md](./RESPONDER-APP-STRUCTURE-GUIDE.md) — concise route map and conventions.

---

## Overview

Expo (SDK 54) + React Native, **Expo Router** (~6), **Zustand**, **TanStack React Query**, **`@packages/firebase`**.

| Layer | Role |
|-------|------|
| **`src/app/`** | Expo Router routes only — thin composition; no heavy logic. |
| **`src/modules/`** | Feature support: components, hooks. **No** `screens/` or `pages/` here. |
| **`src/components/`** | Shared generic UI only: **`ui/`**, **`feedback/`**, **`layout/`**. Domain widgets live in **`modules/`**. |
| **`src/services/`** | App-wide Firebase/API adapters. |
| **`src/store/`**, **`src/query/`**, **`src/utils/`**, **`src/theme/`**, **`src/context/`** | As named — see below. |

**Monorepo:** Low-level Firebase lives in **`packages/firebase`**; **`src/services/`** wraps it for app-shaped use cases.

**Environment:** **`.env` stays at the app root** (`apps/responder-mobile-app/.env`). Do not move it — tooling and `app.config.js` load env from there.

---

## Expo Router (`src/app/`)

Parentheses **`(auth)`**, **`(tabs)`** are route groups — they **do not** appear in URLs.

| Path | Files | Purpose |
|------|-------|---------|
| `/` | `index.jsx` | Redirect: `/login` vs `/dashboard` |
| `/login` | `(auth)/login.jsx` | Auth |
| `/dashboard`, `/map`, `/notifications`, `/settings` | `(tabs)/*.jsx` | **Four primary tabs** — `(tabs)/_layout.jsx` + **`MainTabBar`** |
| `/incident/:id` | `incident/[id].jsx` | Case detail (stack, not a tab) |
| `/support/about`, `/support/help-support`, `/support/location` | `support/*.jsx` | Secondary |
| *(unmatched)* | `+not-found.tsx` | Fallback |

**Special files:** `_layout.jsx` (layout shell), `+not-found.tsx` (unmatched routes).

---

## `src/components/` (shared only)

```
components/
├── ui/           # FormInput, CustomButton, LoadingScreen
├── feedback/     # ErrorAlert
└── layout/       # MainTabBar (primary tab chrome)
```

**Incident** UI (`CaseCard`, `CaseInfoCard`, badges, etc.) lives under **`src/modules/incidents/components/`** — import from there, not from `components/`.

---

## `src/theme/`

Public API: **`src/theme/index.ts`** (`@/theme`).

```
theme/
├── index.ts          # Barrel: export everything consumers need
├── tokens/
│   └── resqTokens.js
├── palettes/
│   ├── colors.js
│   ├── dashboardPalette.js
└── themes/
    ├── dashboardTheme.js
    └── mapTheme.js
```

Prefer **`import { … } from "@/theme"`** instead of deep file paths. **`ResqThemeContext`** imports tokens from **`@/theme/tokens/resqTokens`** to avoid circular imports with the barrel.

---

## `src/modules/`

Features: **auth**, **dashboard**, **incidents**, **map**, **notifications**, **settings**.

- **`components/`** — feature UI (e.g. `DashboardView`, `ResponderMapExplorer`, `CaseDetailView`).
- **`hooks/`** — feature hooks (e.g. `useAssignedEmergencies`).

Route **pages** remain **`src/app/**`** files that import these views.

---

## `src/services/` / `src/store/` / `src/query/` / `src/utils/`

- **`services/`** — Firebase/API; no JSX.
- **`store/`** — Zustand only (e.g. `userStore.ts`).
- **`query/`** — `queryClient`, `queryKeys`.
- **`utils/`** — Pure helpers (`formatResponderIdentity`, `mapIncidentHelpers`). No stores or Firebase clients here.

---

## `src/constants/`

Cross-cutting keys and defaults (e.g. **`LOCATION_PAUSED_KEY`** used by dashboard, settings, and location flows). Feature-only constants can live beside that feature in **`modules/`** when appropriate.

---

## Generated / local folders (not source)

Treat as generated or install output — **not** part of the architectural source tree:

- `.expo/`
- `node_modules/`
- `dist-test/`, `dist-export-test/` (ignored in `.gitignore` when present)

---

## Naming

- **Components:** `PascalCase`
- **Hooks:** `useSomething`
- **Services:** `*Service.ts` / clear service module names
- **Stores:** `*Store.ts`
- **Route files:** Expo Router conventions (`[id].jsx`, kebab-case where used)
- **Module views:** `*View.jsx` for main feature surfaces (`DashboardView`, `LoginView`, …) — consistent and intentional

---

## TypeScript

Gradual adoption: prioritize **`services/`**, **`store/`**, **`query/`**, then shared UI and hooks. No big-bang rewrite required.

---

## Documentation map

| File | Role |
|------|------|
| **`README.md`** (app root) | Quick overview and pointer to docs |
| **`docs/architecture.md`** (this file) | Structural source of truth |
| **`docs/RESPONDER-APP-STRUCTURE-GUIDE.md`** | Routes, rules, onboarding |

Keep docs aligned when the tree changes.
