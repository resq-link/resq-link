# Responder Mobile App — Structure Guide

**Audience:** Engineers working on `apps/responder-mobile-app`  
**Stack:** Expo SDK 54, Expo Router ~6, React 19 / RN 0.81, Zustand, TanStack React Query, `@packages/firebase`  

**Related:** [docs/architecture.md](./architecture.md) (canonical structural reference)

---

## 1. Current layout overview

Application source lives under **`src/`**. Expo Router resolves URLs from **`src/app/`**. Feature UI and hooks live under **`src/modules/<domain>/`** (no `screens/` folders inside modules—**route files** are only under `app/`).

### 1.1 Route map (`src/app/`)

| URL path | Route file | Notes |
|----------|------------|--------|
| `/` | `index.jsx` | Redirect gate (logged in → `/dashboard`, else `/login`) |
| `/login` | `(auth)/login.jsx` | Route group `(auth)` hidden from URL |
| `/dashboard` | `(tabs)/dashboard.jsx` | Primary tab |
| `/map` | `(tabs)/map.jsx` | Primary tab |
| `/notifications` | `(tabs)/notifications.jsx` | Primary tab |
| `/settings` | `(tabs)/settings.jsx` | Primary tab |
| `/incident/:id` | `incident/[id].jsx` | Case detail — **not** a tab |
| `/support/about` | `support/about.jsx` | Secondary |
| `/support/help-support` | `support/help-support.jsx` | Secondary |
| `/support/location` | `support/location.jsx` | Secondary |
| *(no match)* | `+not-found.tsx` | Fallback UI |

**Layouts**

- **`app/_layout.jsx`** — Root providers (React Query, theme, fonts, gesture root) + root **`Stack`**.
- **`app/(tabs)/_layout.jsx`** — **`Tabs`** navigator with custom **`MainTabBar`** (`src/components/layout/MainTabBar.jsx`) — **only** Dashboard, Map, Notifications, Settings.

### 1.2 Source tree (conceptual)

```text
apps/responder-mobile-app/
├── app.config.js, app.json, index.tsx, metro.config.js, tsconfig.json
├── assets/, polyfills/, patches/
│
└── src/
    ├── app/                      # Expo Router (see §1.1)
    │   ├── _layout.jsx
    │   ├── index.jsx
    │   ├── +not-found.tsx
    │   ├── (auth)/login.jsx
    │   ├── (tabs)/
    │   │   ├── _layout.jsx
    │   │   ├── dashboard.jsx
    │   │   ├── map.jsx
    │   │   ├── notifications.jsx
    │   │   └── settings.jsx
    │   ├── incident/[id].jsx
    │   └── support/
    │       ├── about.jsx
    │       ├── help-support.jsx
    │       └── location.jsx
    │
    ├── modules/                  # Feature support (components, hooks)
    │   ├── auth/
    │   ├── dashboard/
    │   ├── incidents/
    │   ├── map/
    │   ├── notifications/
    │   └── settings/
    │
    ├── components/               # Shared only: ui/, feedback/, layout/
    │   ├── ui/                   # FormInput, CustomButton, LoadingScreen
    │   ├── feedback/             # ErrorAlert
    │   └── layout/               # MainTabBar
    ├── context/ResqThemeContext.jsx
    ├── theme/                    # Public: index.ts; tokens/, palettes/, themes/
    │
    ├── services/                 # incidentService, responderService, auth/dispatcherAuth, …
    ├── store/userStore.ts
    ├── query/queryClient.ts, queryKeys.ts
    ├── utils/                    # e.g. formatResponderIdentity, mapIncidentHelpers
    └── constants/
```

**Monorepo:** Firebase primitives and shared types live in **`packages/firebase`**; **`src/services/`** is the app-side adapter layer.

---

## 2. Design rules (quick reference)

| Layer | Responsibility |
|--------|----------------|
| **`src/app/*.jsx`** | Thin route entries: import module **views** and render. Params from URL only. |
| **`src/modules/**`** | Feature components, hooks, optional feature-scoped services. **No** `screens/` or `pages/` folders. |
| **`src/services/**`** | I/O, Firebase, REST — no JSX. |
| **`src/store/**`** | Zustand client/session state. |
| **`src/query/**`** | TanStack Query client and **stable query keys**. |
| **`src/utils/**`** | Pure helpers — not stores or Firebase. |

---

## 3. Navigation conventions

- **Primary app surface:** always the four **`(tabs)`** routes; tab UI is **`MainTabBar`** (not login, support, or incident detail).
- **Incident detail:** navigate with `router.push(\`/incident/${id}\`)`. The screen reads param **`id`** (legacy **`caseId`** still accepted in `CaseDetailView` params for compatibility).
- **Support:** `router.push("/support/about")`, `/support/help-support`, `/support/location` from Settings and similar.
- **Auth:** `router.replace("/login")` / `router.replace("/dashboard")` as today.

---

## 4. Historical / migration notes

Earlier iterations used a flat **`src/app`** (many sibling `.jsx` files) and a **`features/`** folder with `screens/` subfolders. That has been **replaced** by:

- **Grouped routes** under `app/` (`(auth)`, `(tabs)`, `incident`, `support`).
- **`src/modules/`** instead of **`src/features/`**, without duplicating page folders inside modules.

If you see docs or branches mentioning `case-detail.jsx` or flat `about.jsx`, update mentally to **`incident/[id]`** and **`support/*`**.

---

## 5. Best practices

- **Feature-first modules** under **`src/modules/`** keep dashboard/map/incident code discoverable without thousand-line route files.
- **Split** module files when a single component grows past roughly 250–400 lines of mixed concerns (extract styles or subcomponents in the same feature folder).
- **Query keys** stay centralized in **`src/query/queryKeys.ts`** for cache + realtime alignment.
- **Theme:** Prefer importing from **`@/theme`** (barrel) for tokens used across screens.

---

## Summary

The responder app separates **URL structure** (`src/app/`) from **feature code** (`src/modules/`), uses **four tab routes** only in the main shell, and keeps **incident** and **support** flows on secondary stack routes. For the full architectural contract, see **[docs/architecture.md](./architecture.md)**.
