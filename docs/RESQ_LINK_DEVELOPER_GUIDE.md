# RESQ-LINK Developer Guide

A practical guide for someone who inherited this repository and needs to become productive without accidentally breaking emergency operations.

Companion documents:

- Full audit: `docs/RESQ_LINK_FULL_PROJECT_ANALYSIS.md`
- Super Admin plan (no implementation): `docs/SUPER_ADMIN_IMPLEMENTATION_PLAN.md`

---

## What is RESQ-LINK?

RESQ-LINK is an emergency-response platform for Tuguegarao. Civilians report incidents from a phone. A command-center dispatcher triages and assigns resources. Field responders update status on scene. Super administrators provision accounts and review civilian identity documents.

The repo name in `package.json` is `tuguegarao-rescue-system`. People also call it RESQ-Link.

There is **no separate Node/Express backend**. Apps talk to **Firebase** (Auth, Firestore, Storage, Realtime Database) through a shared TypeScript package: `@packages/firebase`.

---

## What applications are inside this repository?

Three apps, one shared package:

| App | Folder | Who uses it | How to run |
| --- | ------ | ----------- | ---------- |
| RESQ-LINK Web | `apps/resq-link-web-app` | Command-center staff and Super Admins | `npm run dev` or `npm run dev:web` → http://localhost:3000 |
| Civilian mobile | `apps/civilian-mobile-app` | Citizens | `npx expo start` |
| Responder mobile | `apps/responder-mobile-app` | Field responders | `npx expo start` |
| Shared Firebase SDK | `packages/firebase` | All of the above | `npm run build` (required first) |

The web app has **one login** at `/login` and two protected workspaces:

- `/command-center/*` — emergency operations
- `/admin/*` — platform administration

Do not run a second Next.js server on port 3001.

---

## How do the applications communicate?

They do not call each other. They all read and write the **same Firebase project**.

```text
Civilian app  ──┐
RESQ-LINK Web ──┼── @packages/firebase ── Firebase Auth / Firestore / Storage / RTDB
Responder     ──┘         │
                          ├── Next.js API routes in apps/resq-link-web-app (Admin SDK, Agora, Gemini, OTP)
                          └── Cloud Functions (SMS gateway)
```

If a civilian submits a report, a Firestore document appears in `emergencies`. The dispatcher app is already listening with `onSnapshot`, so the intake queue updates without a custom WebSocket server.

---

## Where is the frontend?

| Surface | Path |
| ------- | ---- |
| Command Center pages | `apps/resq-link-web-app/app/(command-center)/command-center/` |
| Super Admin pages | `apps/resq-link-web-app/app/(super-admin)/admin/` |
| Shared login | `apps/resq-link-web-app/app/login/` |
| Web UI components | `apps/resq-link-web-app/components/` |
| Web providers | `apps/resq-link-web-app/contexts/` |
| Civilian screens | `apps/civilian-mobile-app/src/app/` and `src/features/` |
| Responder screens | `apps/responder-mobile-app/src/app/` and `src/modules/` |

Web apps use the Next.js **App Router**. Mobile apps use **Expo Router**.

---

## Where is the backend?

Three places, not one server:

1. **Client SDK functions** in `packages/firebase/src/` — most incident logic (`createIncident`, `submitEmergencyReport`, assignments).
2. **Next.js Route Handlers** — privileged or secret-bearing operations in `apps/resq-link-web-app/app/api/` (Admin SDK, Agora, Gemini, email OTP, password recovery).
3. **Firebase Cloud Functions** — SMS: `packages/firebase/functions/src/index.ts`

Authorization for client writes is primarily **`packages/firebase/firestore.rules`**, not Express middleware.

---

## Where is the database configuration?

| What | Where |
| ---- | ----- |
| Collections and field shapes | TypeScript interfaces in `packages/firebase/src/*.ts` (especially `emergencies.ts`, `incidents.ts`, `auth.ts`) |
| Access control | `packages/firebase/firestore.rules` |
| Storage access | `packages/firebase/storage.rules` |
| Presence rules | `packages/firebase/database.rules.json` |
| Indexes | `packages/firebase/firestore.indexes.json` |
| Firebase project wiring | `packages/firebase/firebase.json` |
| Client config (API keys, project id) | Each app’s `.env` / `.env.local` (not committed) |
| Admin SDK | `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON` |

There is no Prisma schema and no SQL database.

---

## How does authentication work?

1. User submits email + password in the relevant app.
2. Firebase Auth creates a session and ID token.
3. The app looks up a **profile document** whose ID equals the Auth UID:
   - Super Admin → `admins/{uid}`
   - Command center → `commandCenters/{uid}` (intended; the sign-in helper currently only signs in)
   - Dispatcher / responder → `dispatchers/{uid}` (`designation` distinguishes them)
   - Civilian → `users/{uid}` plus `status` (`pending_email_verification`, `pending_kyc_review`, `active`, `rejected`)
4. Web authorization is **not** “signed in = allowed”. After Firebase Auth, `/api/auth/session` resolves the UID to `super_admin`, `command_center`, or `unauthorized`. Middleware plus workspace guards enforce `/admin/*` vs `/command-center/*`.
5. Sensitive Super Admin APIs call `requireSuperAdmin()` (`verifyIdToken` then `isAdmin(uid)`). Privileged Command Center APIs call `requireCommandCenter()`.
6. Civilian OTP and forgot-password calls go to the unified web origin (port **3000**), not a separate Super Admin server.

Key files:

- `packages/firebase/src/auth.ts`
- `packages/firebase/src/admin.ts`
- `apps/resq-link-web-app/contexts/AuthContext.tsx`
- `apps/resq-link-web-app/lib/server/resolveWebWorkspace.ts`
- `apps/resq-link-web-app/middleware.ts`
- `apps/responder-mobile-app/src/services/auth/dispatcherAuth.ts`

---

## What user roles exist?

Only these are real in code:

| Role | Stored as |
| ---- | --------- |
| Super Admin | document in `admins` with `role: super_admin` |
| Command Center | document in `commandCenters` |
| Dispatcher | `dispatchers` with `designation: dispatcher` and `role` = agency (`BFP`, `PNP`, `MDRRMO`, `AMBULANCE`, `PCG`) |
| Responder | same `dispatchers` collection, `designation` contains `"responder"` |
| Civilian | `users.role = civilian` |

Important trap: the field named `role` on dispatchers means **agency**, not “dispatcher vs admin”.

There is no permission table and no separate “Administrator” role besides Super Admin.

---

## How is an incident created?

Two different documents exist. Do not mix them up.

**Civilian report** → collection `emergencies`

- Written by `submitEmergencyReport` from the civilian app (`useReportEmergency.js`, `useSOS.js`).
- Starts as `status: pending`.

**Command-center incident** → collection `incidents`

- Manual / call / SMS / walk-in: dispatcher Intake calls `createIncident`.
- From a civilian report: dispatcher calls `elevateEmergencyToIncident`, which copies fields and sets `source: civilian_app`.

SMS does **not** auto-create an `incidents` document. The SMS page can deep-link to Intake with the phone number and message; a human still creates the incident.

---

## How does Dispatcher receive an incident?

After login, `DispatcherDataProvider` (in the **Command Center layout only**) attaches Firestore listeners, including `subscribeToEmergencyReports` and `subscribeToIncidents`. Super Admin routes do not mount these listeners.

The **Incident Intake** page (`/command-center/intake`) is the triage workspace. Overview, map, and active incidents consume the same shared context rather than each fetching independently.

---

## How are responders assigned?

Typical path:

1. Dispatcher assigns a responder and/or resources on Intake (`assignResponderToEmergency`, `dispatchIncidentResources`).
2. Firestore fields such as `assignedResponderId`, `assignedAgency`, `assignedResourceIds` update.
3. Responder app hook `useAssignedEmergencies` listens for assigned records.
4. Responder accepts, marks touchdown, submits a post-incident report.

Responders are created either in Super Admin (`/admin/responders`) or from the Command Center Teams page (`/api/create-team-member`). Both write `dispatchers/{uid}`.

---

## How are realtime updates handled?

Firestore `onSnapshot` everywhere that must feel live (queues, maps, SMS, chat, calls).

Responder “online” uses Firebase **Realtime Database** path `presence/responders/{uid}` so the node disappears on disconnect.

There is no Socket.IO server.

---

## Where should I look when debugging?

| Symptom | First places to look |
| ------- | -------------------- |
| Permission denied in console | `packages/firebase/firestore.rules` and whether the signed-in UID has the expected profile document |
| Dispatcher login works but data empty | `commandCenters/{uid}` missing; rules require command center for some writes |
| Civilian cannot use the app after signup | `users.status` still pending; Super Admin `/admin/kyc`; email OTP APIs on the unified web host |
| Responder login rejected | `dispatcherAuth.ts`: missing `dispatchers/{uid}` or `active === false` |
| Responder sees no cases | `designation` must include `responder`; assignment uses `assignedResourceIds` on the incident |
| SMS not arriving | Cloud Functions logs; `NEXT_PUBLIC_SMS_FUNCTIONS_BASE_URL`; webhook secret |
| Super Admin “Access denied” | No `admins/{uid}` document — run `create-first-admin.ts` only in a controlled way |
| Map blank | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (Map page currently requires Mapbox) |
| Slow dispatcher page switches | `DispatcherDataContext` listeners + large client pages (`app/intake/page.tsx`) |
| “Cannot find module @packages/firebase” | Build the package: `cd packages/firebase && npm run build` |

---

## Important folders I should know

```text
apps/resq-link-web-app/app/(command-center)/command-center/   Command Center routes
apps/resq-link-web-app/app/(super-admin)/admin/               Super Admin routes
apps/resq-link-web-app/app/api/                               Privileged + public API routes
apps/resq-link-web-app/contexts/                              Shared auth + Command Center live data
packages/firebase/src/                                       Almost all domain logic
packages/firebase/firestore.rules                            Real authorization
packages/firebase/functions/                                 SMS
packages/firebase/scripts/                                   Seed and bootstrap (dangerous)
```

---

## Important files I should NOT casually modify

Changing these can lock operators out or leak emergency data:

- `packages/firebase/firestore.rules`
- `packages/firebase/storage.rules`
- `packages/firebase/src/admin.ts`
- `packages/firebase/src/auth.ts`
- Super Admin `app/api/create-*/route.ts` and KYC routes
- Incident status helpers: `incidentLifecycle.ts`, status unions in `incidents.ts` / `emergencies.ts`
- `create-first-admin.ts` (creates a global super user)

Do not commit `.env`, `.env.local`, or `*firebase-adminsdk*.json`.

---

## How Super Admin fits into the unified web app

Super Admin is a **workspace** inside `apps/resq-link-web-app` at `/admin/*`. It creates accounts and reviews KYC. It is not a second command center and does not mount operational Firestore listeners.

Command Center `/command-center/teams` already creates staff accounts for a command center. Super Admin is the **platform-wide** version of that, plus KYC.

---

## What should I understand before changing Super Admin?

1. Read `docs/RESQ_LINK_FULL_PROJECT_ANALYSIS.md` for historical context; folder names `dispatcher-web-app` and `super-admin-web-app` in older sections refer to the pre-consolidation apps.
2. Understand that `dispatchers.role` is an **agency code**.
3. Understand `emergencies` vs `incidents`.
4. Know that Firestore rules currently allow **any authenticated user** to read all emergencies and incidents — a Super Admin that “just lists incidents” would widen an already-broad hole.
5. Prefer **Admin SDK API routes** for role/active changes. Do not let the browser `setDoc` a user’s role.
6. Keep Dispatcher realtime providers out of the `/admin` layout.
