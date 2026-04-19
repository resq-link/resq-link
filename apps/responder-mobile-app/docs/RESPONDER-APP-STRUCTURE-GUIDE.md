# Responder Mobile App — Structure Analysis & Refactor Guide

**Audience:** Mobile engineers improving maintainability of `apps/responder-mobile-app`  
**Stack (observed):** Expo SDK 54, Expo Router ~6, React 19 / RN 0.81, Zustand, TanStack React Query, `@packages/firebase`  
**Scope:** Analysis and recommendations only — no automatic code changes.

---

## 1. Analysis

### 1.1 Current structure overview

Application source lives under **`src/`**, with Expo Router resolving routes from **`src/app/`**. Supporting layers are **`src/components/`**, **`src/theme/`**, **`src/context/`**, and **`src/utils/`**. Root-level tooling and bootstrap sit next to `src/` (Metro, `app.config.js`, `index.tsx`, etc.).

**High-level layout (conceptual tree):**

```text
apps/responder-mobile-app/
├── App.tsx                      # Root wrapper (SafeArea, web error hooks, sonner, global.css)
├── index.tsx                    # Entry: polyfills → expo-router/entry
├── app.config.js / app.json     # Expo config
├── global.css
├── global.d.ts
├── metro.config.js
├── tsconfig.json
├── assets/
│   └── images/                  # e.g. resq-link-logo.png
├── patches/                     # patch-package
├── polyfills/
│   └── web/                     # e.g. maps.web.jsx (web shims)
├── openspec/                    # change proposals / specs (process, not runtime)
├── dist-test/                   # Local build/export output (many hashed assets — should not drive “source” mental model)
│
└── src/
    ├── app/                     # Expo Router: all route screens + _layout
    │   ├── _layout.jsx
    │   ├── index.jsx
    │   ├── login.jsx
    │   ├── dashboard.jsx        # ~767 lines (large)
    │   ├── map.jsx              # ~1007 lines (very large)
    │   ├── case-detail.jsx
    │   ├── location.jsx
    │   ├── notifications.jsx
    │   ├── settings.jsx
    │   ├── about.jsx
    │   ├── help-support.jsx
    │   └── +not-found.tsx       # lone TSX route vs mostly .jsx
    │
    ├── components/              # Flat list; mix of generic + incident-specific
    ├── context/
    │   └── ResqThemeContext.jsx
    ├── theme/                   # Multiple palettes + tokens (colors, map, login, dashboard, ops…)
    └── utils/
        ├── userStore.js         # Zustand store (not a “util”)
        └── auth/
            └── dispatcherAuth.js
```

**Monorepo integration:** Firebase access and shared types are intended to live in **`packages/firebase`**. The mobile app should stay a thin client with adapters in a dedicated layer (see §2–3).

**Related doc:** [`ARCHITECTURE.md`](../ARCHITECTURE.md) already describes a **target** folder layout and principles. This guide complements it with an **evidence-based current-state review** and a practical migration checklist.

---

### 1.2 Key issues and problems

| Area | Observation | Risk |
|------|-------------|------|
| **Route file size** | `src/app/map.jsx` and `src/app/dashboard.jsx` are very large (on the order of 1000 and 770 lines). | Hard to test, review, and reuse; high merge-conflict and regression risk. |
| **`components/` flat folder** | Incident-domain UI (`CaseCard`, `CaseInfoCard`, `CaseStatusBadge`, `PriorityBadge`) sits beside generic UI (`FormInput`, `CustomButton`, `LoadingScreen`). | Unclear boundaries; “global” components folder grows without ownership by feature. |
| **`utils/` naming vs contents** | `userStore.js` is a Zustand store with AsyncStorage side effects; `auth/` holds auth-related logic. | New contributors look in `store/` or `services/` and miss state/auth code under “utils.” |
| **JS vs TS split** | Most screens are `.jsx`; entry/auxiliary files include `.tsx` / `.ts`. | Inconsistent typing strategy; harder to share types with `packages/firebase`. |
| **Theme surface area** | Multiple palette/theme files (`loginPalette`, `dashboardPalette`, `opsDashboardTheme`, `mapTheme`, `resqTokens`, etc.) under `src/theme/`. | Manageable today but needs a **single public theme API** to avoid import sprawl. |
| **Build artifacts** | `dist-test/` contains bundled JS and hashed assets; not listed in app `.gitignore` in the reviewed file. | Repo noise if committed; clarify ignore policy and CI artifact storage. |
| **`openspec/`** | Process/specs alongside app code. | Fine if intentional; document that it is not shipped with the app. |
| **Duplication of “architecture” narrative** | `ARCHITECTURE.md` + this guide. | Keep one **canonical** target structure (see recommendation: point README to `ARCHITECTURE.md` + this analysis). |

---

## 2. Recommended improvements

### 2.1 Folder restructuring (incremental)

1. **Introduce `src/features/<domain>/`**  
   Domains suggested from current routes and components: **auth**, **incidents**, **map**, **ops** (dashboard), **notifications**, **settings** (settings / about / help can start shared or split as they grow).

2. **Move Zustand and auth-adjacent code out of `utils/`**  
   - Stores → `src/store/` (e.g. `userStore` → `store/userStore.ts` or `store/sessionStore.ts`).  
   - Auth helpers → `src/services/auth/` or `features/auth/services/`.

3. **Thin Expo Router files**  
   Each `src/app/*.jsx` should ideally: import one screen from `features/.../screens`, pass route params, and render. Logic moves to **hooks** + **services**.

4. **Centralize server/async state (TanStack Query)**  
   Add `src/query/` for `queryClient`, **query keys**, and patterns that pair with `services/` (already in dependencies).

5. **Optional `src/config/`**  
   Typed reading of `expo-constants` `extra` (from `app.config.js`) — single place for env and Firebase config mapping.

6. **Clarify `theme/` vs future `styles/`**  
   Either keep `theme/` as the design-token root and document a **barrel** (`theme/index.js` exporting the public surface), or nest under `styles/` — pick **one** root to avoid duplicate entry points.

### 2.2 Code organization improvements

- **Screens:** `features/<x>/screens/*Screen.tsx` — full compositions; minimal business logic in JSX.
- **Hooks:** `features/<x>/hooks/*` for data subscriptions, navigation helpers, map state; `src/hooks/` only for truly cross-cutting hooks.
- **Services:** Wrappers around `@packages/firebase` (and Uploadcare, maps APIs) returning plain data/errors — no React imports.
- **Components:**  
  - `src/components/` — only **reused, domain-agnostic** UI.  
  - `features/<x>/components/` — widgets specific to that feature (e.g. incident cards).

### 2.3 Naming convention fixes

| Item | Recommendation |
|------|------------------|
| Route files | Keep Expo Router filenames (`map.jsx`, `case-detail.jsx`); only the **internals** move to `features/`. |
| Components | `PascalCase` file names matching the default export. |
| Hooks | `useSomething.ts` / `useSomething.js` with `use` prefix. |
| Stores | `*Store.ts` in `src/store/`. |
| Services | `incidentService.ts`, `presenceService.ts`, or a single `api/` with grouped modules — **be consistent** project-wide. |

Align naming with **`dispatcher_user`** persistence key vs “responder” product naming where possible (avoid mental mismatch between store keys and app role).

### 2.4 Separation of concerns (checklist)

- [ ] **Routes (`src/app/`)** — layout, redirects, param wiring only.  
- [ ] **Features** — user journeys and domain UI.  
- [ ] **Services** — I/O, Firebase, REST, third-party SDKs.  
- [ ] **Store / Query** — client state vs server cache.  
- [ ] **Theme / styles** — tokens and shared StyleSheet primitives.  
- [ ] **Utils** — pure functions (formatting, guards) **without** stores or network calls.

---

## 3. Proposed folder structure

Below is a **clean target** aligned with Expo Router and scalable growth. It matches the intent of [`ARCHITECTURE.md`](../ARCHITECTURE.md) and standard feature-sliced design.

```text
apps/responder-mobile-app/
├── app.config.js
├── app.json
├── index.tsx
├── App.tsx
├── assets/
├── polyfills/
├── patches/
├── global.css
│
└── src/
    ├── app/                          # Expo Router — thin route files only
    │   ├── _layout.jsx
    │   ├── index.jsx
    │   ├── (auth)/                   # optional: route groups as you adopt them
    │   ├── (main)/
    │   └── ...
    │
    ├── features/
    │   ├── auth/
    │   │   ├── screens/
    │   │   ├── components/
    │   │   ├── hooks/
    │   │   └── services/             # optional if auth stays minimal
    │   ├── incidents/
    │   ├── map/
    │   ├── ops/                      # dashboard / operational views
    │   ├── notifications/
    │   └── settings/
    │
    ├── components/                   # Shared, generic UI only
    ├── hooks/                        # Cross-feature hooks
    ├── services/                     # Firebase & API adapters (@packages/firebase)
    ├── store/                        # Zustand (moved from utils/)
    ├── query/                        # TanStack Query client + keys
    ├── utils/                        # Pure helpers only
    ├── constants/                    # Keys, defaults, enums
    ├── types/                        # App-level types / view models
    ├── config/                       # expo-constants / env typing
    ├── context/                      # Theme, etc. (or fold theme into providers/)
    └── theme/                        # Design tokens & palettes (single barrel export)
```

**Migration tip:** Use **temporary re-exports** from old paths during moves so PRs stay reviewable feature-by-feature.

---

## 4. Best practices

### 4.1 Mobile / React Native architecture

- **Feature-first** slices scale better than a growing flat `components/` + giant `app/*.jsx` files.  
- **Expo Router** owns URL and navigation; **features** own product behavior — do not duplicate navigation logic across features.  
- **Platform splits:** Keep `polyfills/` and `.web.tsx` alternatives at clear boundaries (e.g. maps) so native and web stay understandable.

### 4.2 State management

- **Zustand:** Use for **session, UI shell, and ephemeral client state** (e.g. drawer open, map UI mode). Keep stores small and domain-named.  
- **TanStack Query:** Prefer for **server-backed data** (incidents, presence, profile) with stable **query keys** in `src/query/keys.ts`.  
- Avoid duplicating the same entity in both Zustand and Query without a documented rule (e.g. Query = source of truth for server lists; Zustand = “selected incident id” for UI).

### 4.3 Scalability and maintainability

- **Split files** when a screen exceeds ~250–400 lines or mixes unrelated concerns (map rendering + incident pipeline + permissions).  
- **Barrel exports** (`index.ts`) sparingly at feature boundaries to keep imports tidy.  
- **Testing:** After extraction, prioritize unit tests for `services/` and hooks; smoke tests for critical flows (login, incident detail, map).  
- **`.gitignore`:** Ensure build output directories (`dist-test/`, `dist/`, `web-build/`) are ignored in this app (or monorepo root) if not meant to be versioned.  
- **Gradual TypeScript:** Start with `services/`, `store/`, and `types/`, then migrate screens.

### 4.4 Documentation hygiene

- Maintain **one** canonical “target structure” in [`ARCHITECTURE.md`](../ARCHITECTURE.md).  
- Use **this guide** for onboarding and refactor planning (current pain points + checklist).  
- Link both from `README.md` in one short paragraph to reduce duplication drift.

---

## Summary

The responder app already separates **`src/app`**, **`components`**, **`theme`**, and **`context`**, which is a solid baseline. The largest wins are **splitting oversized routes** (`map`, `dashboard`), **feature-slicing** incident and map code, **relocating stores and auth** out of `utils/`, and **centralizing** TanStack Query and Firebase access in **`services/`** + **`query/`**. Apply changes **incrementally** with thin route files and re-exports to protect production flows.
