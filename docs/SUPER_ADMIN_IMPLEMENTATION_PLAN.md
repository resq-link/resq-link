# RESQ-LINK Super Admin Implementation Plan

> **Updated 21 August 2026:** Super Admin now lives inside `apps/resq-link-web-app` at `/admin/*`. This plan remains useful for product scope, but folder names `apps/super-admin-web-app` and port 3001 are obsolete.
>
> **Status:** Historical plan. Implementation now lives in the unified web app.  
> **Depends on:** `docs/RESQ_LINK_FULL_PROJECT_ANALYSIS.md`

This plan originally assumed Super Admin existed at `apps/super-admin-web-app`. That app has been consolidated into `apps/resq-link-web-app`.

---

## Objective

Give a small set of platform operators a dedicated, auditable console to:

- provision and disable accounts across civilian, dispatcher, responder, and command-center roles
- review civilian KYC
- see account-level health (counts, pending reviews)

without granting a silent “god mode” over live incidents, footage, or security rules.

---

## Why Super Admin Is Needed

Command-center staff already run operations in `dispatcher-web-app` (including a Teams page that can create dispatcher accounts). That is **city operations**, not **platform administration**.

Super Admin is needed to:

- bootstrap and recover access without sharing command-center credentials
- review government IDs before civilians go live
- create command-center tenants
- disable compromised accounts quickly
- produce an audit trail of high-privilege actions

Without a dedicated boundary, those actions either live in unsafe scripts (`packages/firebase/scripts/`) or get bolted onto the dispatcher shell (wrong threat model, worse performance).

---

## Existing Architecture Relevant to Super Admin

| Piece | Location | Relevance |
| ----- | -------- | --------- |
| Super Admin Next.js app | `apps/super-admin-web-app` | Target codebase |
| `admins` collection | Firestore | Super Admin identity |
| `isAdmin` / `verifyIdToken` / `create*AccountAdmin` | `packages/firebase/src/admin.ts` | Server helpers to extend |
| Firestore `isSuperAdmin()` | `packages/firebase/firestore.rules` | Must be tightened, not widened |
| Dispatcher Teams + `/api/create-team-member` | dispatcher-web-app | Parallel account-creation path |
| Civilian KYC statuses | `packages/firebase/src/auth.ts` | Already wired to SA KYC APIs |
| Vercel project | CI mentions `spup/resq-super-admin` | Keep separate deploy |

---

## Existing Admin Features

Already in Super Admin:

- Login + client `ProtectedRoute` requiring `admins/{uid}` **exists** (`isAdmin()` does not read `role: super_admin`)
- Dashboard cards
- KYC queue (pending / approved / rejected) with ID preview
- Create + list dispatchers, responders, civilians, command centers
- Server-side `isAdmin` checks on create/KYC APIs
- Resend emails (OTP, KYC approved)
- Forgot-password OTP APIs (civilian)

Already in Dispatcher (operational admin, not Super Admin):

- Teams CRUD
- Create team members (command-center token)
- Incident type rules
- Resources
- Reports / export

Missing today: deactivate, edit, pagination, audit log UI, middleware, custom claims, stats, incident isolation in rules.

---

## Proposed Super Admin Scope

### In scope

- Account lifecycle (create, list, search, disable/enable, limited profile edit)
- KYC review (keep)
- Command-center record create/update (soft-disable rather than delete)
- Read-only admin audit log
- Account-centric dashboard
- Server-side session/claim enforcement

### Out of scope

- Live incident map / intake / SMS / Agora
- Closing, editing, or deleting incidents
- Viewing post-incident photos or emergency PII by default
- Editing Firestore/storage rules from the UI
- SMS gateway secret management
- A new RBAC designer that can mint arbitrary claims

---

## Features

| Feature | Priority | Notes |
| ------- | -------- | ----- |
| Keep existing create flows | P0 | Do not regress |
| Next.js middleware + shared `requireSuperAdmin` | P0 | Client guard is insufficient |
| Disable/enable Auth user + profile `active`/`status` | P0 | |
| Search/filter/pagination for each account type | P0 | Stop full `getDocs` scans |
| Audit log writer + read-only UI | P0 | |
| Custom claims on create and backfill | P0 | Align rules |
| Dashboard counts (accounts, pending KYC) | P1 | No incident feed |
| Edit designation, agency, team on staff | P1 | Audited |
| Force password reset for staff | P1 | Audited |
| Invite email for new staff | P2 | Resend already present |
| Second Super Admin creation | P2 | Dual-control; not self-service |
| Agency catalog entity | P3 | Only if enum is insufficient |

---

## Role & Permission Model

**Current:** collection membership (`admins`, `commandCenters`, `dispatchers`, `users`) plus agency enum on `dispatchers.role`.

**Proposed:** keep collections as profiles; add Firebase Auth **custom claims**:

```text
role: super_admin | command_center | dispatcher | responder | civilian
agency?: BFP | PNP | MDRRMO | AMBULANCE | PCG   // staff only
```

Claims are set **only** by Admin SDK (Super Admin APIs or a one-time backfill script). Clients must never write `admins/{uid}` for themselves.

Do not introduce a free-form permission matrix in v1. Five roles are enough if rules use claims.

Dispatcher `role` field remains the **agency** for operational routing. Document that naming trap in UI copy (“Agency”, not “Role”) to reduce mistakes.

---

## Security Boundary

Allow Super Admin to:

- create and disable accounts
- change staff agency/designation/team
- approve/reject KYC and view KYC images
- read audit logs
- view aggregated account statistics

Do not allow Super Admin to:

- view or edit live incident details in this app
- delete incidents, emergencies, or footage
- update `callSessions` or chat
- disable the last remaining super admin
- grant `super_admin` without a dedicated, audited flow
- download bulk emergency photos

**Rules change (prerequisite):** Super Admin should lose incident update/delete privileges that currently exist in `firestore.rules`. Platform admin ≠ incident commander.

---

## Proposed Routes

Keep and extend the current Next.js routes:

| Route | Purpose |
| ----- | ------- |
| `/login` | Super Admin sign-in |
| `/dashboard` | Counts + shortcuts |
| `/kyc` | KYC queue (existing) |
| `/dispatchers` | List/create/edit/disable command-side dispatchers |
| `/responders` | List/create/edit/disable field responders |
| `/civilians` | List/create (use sparingly)/disable; link to KYC |
| `/command-centers` | List/create/edit/soft-disable |
| `/audit` | **New** read-only audit log |
| `/admins` | **New, restricted** list super admins (no random create button in v1) |

Do not add `/incidents`, `/map`, `/sms`, or `/footage`.

---

## Proposed Navigation

Extend `apps/super-admin-web-app/components/Navigation.tsx`:

```text
Dashboard
KYC
Dispatchers
Responders
Civilians
Command Centers
Audit log
```

Keep the existing dark Tailwind header. Optional later: match dispatcher typography, still a separate shell (no dispatcher sidebar).

---

## Proposed Database Changes

| Change | Type | Purpose |
| ------ | ---- | ------- |
| Auth custom claims | Auth | Fast, server-verifiable role |
| `auditLogs/{id}` | New collection | Append-only admin actions |
| `dispatchers.active` already exists | Use it | Disable staff |
| `users.status` already exists | Use `rejected` / new `disabled` if needed | Civilian lockout |
| `commandCenters.disabled` | New field | Soft-disable tenant |
| **No** incident schema change | — | Out of scope |

`auditLogs` suggested fields: `actorUid`, `action`, `targetUid`, `targetCollection`, `metadata`, `createdAt`. Write only via Admin SDK. Rules: `allow write: if false`; `allow read: if isSuperAdmin()`.

---

## Proposed APIs

Keep existing POSTs. Add (all `verifyIdToken` + `isAdmin` or claim):

| Endpoint | Method | Purpose |
| -------- | ------ | ------- |
| `/api/accounts/disable` | POST | Auth `disabled: true` + profile flag |
| `/api/accounts/enable` | POST | Reverse |
| `/api/accounts/update-staff` | POST | designation, agency, team |
| `/api/accounts/list` | GET | Paginated Admin SDK list/query |
| `/api/audit` | GET | Paginated logs |
| `/api/stats/overview` | GET | Counts |

Every mutating API writes an `auditLogs` document.

Do **not** add `/api/incidents/*` for Super Admin.

---

## Existing Components to Reuse

From Super Admin app: `AdminAuthProvider`, `ProtectedRoute`, `Navigation`, KYC table, create forms, Resend helpers.

From `@packages/firebase/admin`: `createDispatcherAccountAdmin`, `createCivilianAccountAdmin`, `createCommandCenterAccountAdmin`, `isAdmin`, `verifyIdToken`, `getAdminFirestore`.

From dispatcher: visual language (slate/primary Tailwind, lucide icons) **copied or later extracted** — do not import dispatcher components into Super Admin (no shared UI package; keeps deploy isolation).

---

## New Components Required

- Paginated data table (search, status filter)
- Confirm dialog for disable/enable
- Audit log table
- Dashboard stat cards with real numbers
- Optional staff edit drawer

No map, no Leaflet, no Agora.

---

## Audit Logging Requirements

Log at least:

- account create (type, uid, actor)
- disable/enable
- staff field changes (before/after)
- KYC approve/reject (already has `kycReviewedBy`; still write audit log)
- failed authorization attempts on SA APIs `[LIKELY]` useful; confirm PII policy
- new super admin grants (if ever allowed)

Logs are immutable in-app. Retention policy is an owner decision.

---

## Security Requirements

Phase 0 before feature work:

1. Rotate credentials called out in the full analysis (hard-coded API key, default admin password, service-account hygiene).
2. Deploy tighter Firestore/storage rules (authenticated-wide incident reads; public post-report photos; Super Admin incident mutate).
3. OTP routes: bind to the signed-in civilian or add rate limiting / App Check.
4. Set custom claims on all create paths (Super Admin **and** dispatcher `create-team-member`).
5. Add Super Admin `middleware.ts` checking session cookie or verifying token — client `ProtectedRoute` stays as UX only.

Create-account APIs already check `isAdmin` — keep that pattern; do not regress.

---

## Testing Requirements

No real E2E suite exists today. Minimum for this work:

- API: missing token → 401; civilian token → 403; admin token → 200
- Rules emulator: civilian cannot read another user’s emergencies after the rule fix
- Rules: user cannot `set` `admins/{ownUid}`
- Disable: Auth login fails or app rejects
- KYC approve writes audit log
- Middleware blocks `/dashboard` when not admin

Add Firebase emulator tests under `packages/firebase` if the team agrees; otherwise start with API integration tests.

---

## Implementation Phases

Aligned with the full analysis roadmap:

0. Secrets + rules + claims design (blocker)
1. Shared `requireSuperAdmin`, middleware, no new product UI
2. Claims backfill script; create APIs set claims
3. Dashboard counts
4. List/search/disable/edit APIs + UI
5. Command-center soft-disable
6. Freeze role model (no permission matrix unless requested)
7. Audit UI
8. Settings only if a concrete need exists
9. Account reports
10. Security regression tests

Do not skip Phase 0.

---

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Building a second command center by accident | Explicit route deny-list; no incident SDK in SA pages |
| Dispatcher Teams page and SA create inconsistent claims | Same Admin helper for both create paths |
| Tightening rules breaks responder/dispatcher in production | Emulator tests + staged rules deploy |
| Super Admin reads all `users` including KYC photos in the client | Move list/preview to Admin SDK with least fields |
| Last admin locked out | Bootstrap script remains break-glass; disable-guard |
| Performance copy-paste of dispatcher providers | Never mount `DispatcherDataProvider` in SA |

---

## Questions Requiring Project Owner Confirmation

1. Should Super Admin **ever** see incident metadata (even read-only, audited break-glass)?
2. Is one Super Admin role enough, or do you need a weaker “KYC-only” operator?
3. Should dispatcher Teams page keep creating accounts, or should all staff provisioning move to Super Admin?
4. What is the official civilian disable state: `rejected`, `disabled`, or Auth-only disable?
5. Confirm production Firestore rules match the repo file before tightening.
6. Confirm whether `TEST_ACCOUNTS.md` and seed passwords are still valid and whether they may be committed.
7. Who is allowed to run `create-first-admin.ts` in production?
8. Should Super Admin operate **multiple cities/command centers** as tenants, or is Tuguegarao a single-tenant system?

Until these are answered, implement only Phase 0 planning — not product UI.

---

**STOP HERE. Do not implement Super Admin until the analysis and proposed architecture have been reviewed and approved.**
