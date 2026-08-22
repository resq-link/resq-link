# RESQ-Link Operational Team Assignment — Implementation Plan

**Status:** Historical plan (live code is in `apps/resq-link-web-app`; older paths may still say `dispatcher-web-app`)  
**Date:** July 3, 2026  
**Authors:** Architecture review for full-stack implementation  
**Related:** [OPERATIONAL_TEAM_ARCHITECTURE.md](./OPERATIONAL_TEAM_ARCHITECTURE.md)

---

## 0. Executive Summary

RESQ-Link already has partial team support (`teamOnDuty` on manual incidents) but it is **not a permanent, system-wide assigned team model**. The critical bug is `elevateEmergencyToIncident()` hardcoding `"Whiskey"`. Reporting uses fragile `inferTeamOnDuty()` inference. The `teams` Firestore collection exists but is disconnected from intake and exports.

**Recommended approach:** Introduce canonical `assignedTeamId` + `assignedTeamName` (with backward-compatible aliases) sourced from the `teams` collection, dynamic team registry, migration for legacy data, UI filters across dispatcher surfaces, and optional team reassignment audit trail — **without** separate user accounts.

**Cloud Functions:** None exist in this repository; no CF changes required.

---

## 1. Project Scope Analysis

### 1.1 Applications in Monorepo

| App | Role | Team exposure |
|-----|------|---------------|
| `apps/dispatcher-web-app` | Command center | **Primary** — all changes |
| `apps/civilian-mobile-app` | Citizen emergencies | **None** — internal only |
| `apps/responder-mobile-app` | Field responder | **Read-only display** optional |
| `apps/super-admin-web-app` | Admin | No team workflow today |
| `packages/firebase` | Shared SDK | **Primary** — types, CRUD, migration |

### 1.2 Infrastructure

| System | Status | Team impact |
|--------|--------|-------------|
| Firestore | Active | `incidents`, `emergencies`, `teams` collections |
| Firebase Auth | Active | Single command-center login unchanged |
| Firebase Storage | Active | No team fields on uploads |
| Cloud Functions | **Not present** | N/A |
| Real-time listeners | Active | `onSnapshot` on incidents/emergencies |
| Push notifications | Local/haptic only | No FCM server; haptics in apps |

### 1.3 Current End-to-End Workflow

```
Civilian Mobile App
  └─ submitEmergencyReport() → emergencies/{id}  (no team)

Dispatcher Web App — Intake
  └─ Manual: createIncident(teamOnDuty) → incidents/{id}  ✅
  └─ App: elevateEmergencyToIncident(teamOnDuty: "Whiskey")  ❌ hardcoded
  └─ dispatchIncidentResources() → assignedResourceIds  (responder UID, not team)

Dispatcher — Active Incidents / History
  └─ subscribeToIncidents() + subscribeToEmergencyReports()
  └─ Display teamOnDuty label only; no team filter

Responder Mobile App
  └─ subscribeToResponderAssignedIncidents(responderId)
  └─ Filters by assignedResourceIds array-contains UID  (NOT by team)

Reports / Export
  └─ filterIncidents() + inferTeamOnDuty()  (client-side, unreliable)
  └─ Team Summary from TEAMS_ON_DUTY hardcoded enum
```

---

## 2. Current Data Model

### 2.1 `incidents` Collection

**Existing team-related fields:**

| Field | Purpose | Reliability |
|-------|---------|-------------|
| `teamOnDuty` | Enum label (`Whiskey`, etc.) | Manual create only |
| `teamName` | Mirror of teamOnDuty on create | Can diverge |
| `teamId` | FK to teams | Always `null` on create |

**Missing (required):**

| Field | Purpose |
|-------|---------|
| `assignedTeamId` | Permanent FK → `teams/{id}` |
| `assignedTeamName` | Denormalized display label at assignment time |
| `assignedTeamCode` | Stable machine key for filters/exports |
| `assignedTeamAt` | Timestamp of assignment |
| `assignedTeamBy` | Dispatcher UID or display name |

**Reassignment audit (sub-collection or embedded array):**

```
incidents/{id}/teamAssignmentHistory/{entryId}
  previousTeamId, previousTeamName
  newTeamId, newTeamName
  reassignedBy, reassignedAt, reason
```

### 2.2 `emergencies` Collection

No team fields today. On elevation, write same assignment snapshot to linked emergency for traceability (internal only).

### 2.3 `teams` Collection

```typescript
TeamRecord { id, code, label, description?, isActive, createdAt, updatedAt }
```

Admin CRUD exists (`packages/firebase/src/teams.ts`). Must become **source of truth** for all team pickers.

### 2.4 Responder Assignment Model (unchanged)

Responders receive incidents via `assignedResourceIds` (responder Firebase UID). **Team assignment is orthogonal** — an incident has both:
- **Operational team** (Whiskey/X-ray/…) — for reporting
- **Assigned responder** (UID) — for field ops

No change to responder subscription query required for core functionality.

---

## 3. Hardcoded Team References (Must Replace)

| File | Issue |
|------|-------|
| `packages/firebase/src/incidents.ts` | `TeamOnDuty` union type; `normalizeTeamOnDuty` hardcoded 4 values |
| `apps/dispatcher-web-app/app/intake/page.tsx:142` | `teamOnDutyOptions` hardcoded array |
| `apps/dispatcher-web-app/app/intake/page.tsx:1037` | **`teamOnDuty: "Whiskey"` on app elevation** |
| `apps/dispatcher-web-app/lib/reporting/constants.ts` | `TEAMS_ON_DUTY` hardcoded |
| `apps/dispatcher-web-app/lib/reporting/teamSummaryTheme.ts` | `TEAM_CARD_THEMES` keyed by hardcoded union |
| `apps/dispatcher-web-app/app/resources/page.tsx:62-66` | Default team seeds hardcoded |
| `packages/firebase/scripts/seed-report-incidents.ts` | Hardcoded teams |
| `packages/firebase/scripts/seed-test-dedup.ts` | Hardcoded Whiskey |

**Not hardcoded (OK):** `teams/page.tsx` placeholders only.

---

## 4. Affected Files — Complete Inventory

### 4.1 Phase 1 — Firebase / Shared Package (Foundation)

| File | Change |
|------|--------|
| `packages/firebase/src/operationalTeams.ts` | **NEW** — team registry, resolve, normalize |
| `packages/firebase/src/incidents.ts` | Types, createIncident, elevateEmergencyToIncident, reassign, read normalization |
| `packages/firebase/src/emergencies.ts` | Optional team fields on elevation propagate |
| `packages/firebase/src/teams.ts` | `ensureDefaultOperationalTeams()`, sortOrder |
| `packages/firebase/src/index.ts` | Export new APIs |
| `packages/firebase/firestore.rules` | Optional validation comments (no breaking rule changes) |
| `packages/firebase/firestore.indexes.json` | Add `assignedTeamCode` + status + resolvedAt index |
| `packages/firebase/scripts/migrate-assigned-teams.ts` | **NEW** — backfill legacy incidents |
| `packages/firebase/scripts/seed-operational-teams.ts` | **NEW** — idempotent Whiskey/X-ray/Yankee/Zulu seed |

### 4.2 Phase 2 — Dispatcher Web App (UI)

| File | Change |
|------|--------|
| `contexts/OperationalTeamContext.tsx` | **NEW** — session team filter (not auth) |
| `contexts/PriorityAlertContext.tsx` | No team logic change |
| `app/intake/page.tsx` | Team picker from Firestore; team filter; fix elevation; reassignment UI |
| `app/incidents/page.tsx` | Team filter chips; display assigned team |
| `app/history/page.tsx` | Team filter; display assigned team |
| `app/map/page.tsx` | Optional team filter + badge |
| `app/overview/page.tsx` | Optional team-scoped KPIs |
| `app/report/page.tsx` | Use assignedTeam fields |
| `app/report/incidents/page.tsx` | Export filter by assigned team |
| `components/IntakeListItem.tsx` | Show `assignedTeamName` |
| `components/IntakeDetailView.tsx` | Team display + reassign action |
| `components/reporting/TeamQuickButtons.tsx` | Wire into intake/incidents/history |
| `components/reporting/ReportDateFilters.tsx` | Load teams dynamically |
| `components/reporting/TeamSummaryCards.tsx` | Dynamic team list from data |
| `components/Navigation.tsx` | Optional session team indicator |
| `lib/reporting/constants.ts` | Remove hardcoded enum; re-export from firebase |
| `lib/reporting/normalizeReportIncident.ts` | Primary: assignedTeamCode; fallback infer |
| `lib/reporting/incidents.ts` | filterIncidents by assignedTeamCode |
| `lib/reporting/analytics.ts` | Team summary from assignedTeamCode |
| `lib/reporting/types.ts` | Update filter types |
| `lib/reporting/export.ts` | Column: Assigned Team |
| `lib/reporting/reportDocument.ts` | PDF assigned team |
| `lib/reporting/buildPrintHtml.ts` | Print filter banner |
| `lib/reporting/teamSummaryTheme.ts` | Dynamic theme fallback |
| `lib/reporting/filters.ts` | Unchanged pattern |
| `lib/reporting/useReportIncidents.ts` | No structural change |
| `app/resources/page.tsx` | Load teams from Firestore not hardcoded |
| `app/layout.tsx` | Wrap OperationalTeamProvider |

### 4.3 Phase 3 — Responder Mobile App (Minimal)

| File | Change |
|------|--------|
| `src/modules/incidents/components/CaseCard.jsx` | Optional: display assigned team badge |
| `src/modules/incidents/components/DetailHeader.jsx` | Optional: assigned team label |
| `src/services/incidentService.ts` | No query change |

### 4.4 Phase 4 — Civilian Mobile App (Verification Only)

| File | Change |
|------|--------|
| No changes expected | Team is internal; verify submit/listen unchanged |

### 4.5 Phase 5 — Scripts / Seeds

| File | Change |
|------|--------|
| `packages/firebase/scripts/seed-report-incidents.ts` | Use assignedTeam fields |
| `packages/firebase/scripts/seed-test-dedup.ts` | Use assignedTeam fields |

### 4.6 Cloud Functions

**None** — repository contains no `functions/` directory.

### 4.7 Notifications

| Surface | Impact |
|---------|--------|
| Dispatcher priority alerts | No team filter needed |
| Responder haptics (`PriorityAlertProvider.jsx`) | Unchanged — keyed on assigned incidents |
| Civilian push | No team in payload |
| Operational chat (`messaging.ts`) | No change |

---

## 5. Recommended Schema Changes

### 5.1 Add to `IncidentRecord`

```typescript
assignedTeamId: string | null       // teams/{id}
assignedTeamName: string | null    // snapshot label e.g. "Whiskey"
assignedTeamCode: string | null     // snapshot code e.g. "whiskey"
assignedTeamAt?: Timestamp | null
assignedTeamBy?: string | null

// Backward compatibility (keep populated in sync):
teamOnDuty?: TeamOnDuty | null      // = assignedTeamName when valid enum
teamName?: string | null            // = assignedTeamName
teamId?: string | null              // = assignedTeamId
```

### 5.2 Add to `EmergencyReport` (on elevation only)

```typescript
assignedTeamId?: string | null
assignedTeamName?: string | null
assignedTeamCode?: string | null
```

### 5.3 Extend `TeamRecord`

```typescript
sortOrder?: number    // for consistent UI ordering
type?: 'operational'  // future: admin vs operational
```

### 5.4 Migration Strategy

1. **Seed** `teams` with Whiskey, X-ray, Yankee, Zulu if missing (match by `code`).
2. **Backfill** each `incidents` doc:
   - If `teamOnDuty` valid → lookup team by label/code → set `assignedTeam*`
   - Else → `assignedTeamName: null`, flag for manual review
3. **Never delete** legacy fields during migration.
4. **Idempotent** script with dry-run mode.
5. **No data loss** — only additive writes.

---

## 6. Architecture Decisions

### 6.1 Single Dispatcher Account (Required)

- **Session filter** (`OperationalTeamContext`): optional UI convenience, stored in `sessionStorage`.
- **Permanent assignment** on incident document: source of truth for reports.
- Session filter does NOT change incident ownership.

### 6.2 Dynamic Teams (Future Scalability)

```
Admin creates team in Firestore (teams collection)
  → subscribeToTeams() updates all pickers
  → No code deploy for 5th team
```

Remove `TeamOnDuty` union type over time; replace with `string` code validated against active teams.

### 6.3 Team Reassignment

```typescript
reassignIncidentTeam(incidentId, newTeamId, { reason, dispatcherId })
  → write teamAssignmentHistory entry
  → update assignedTeam* snapshot
  → sync teamOnDuty/teamName aliases
  → do NOT modify resolvedAt or historical metrics attribution beyond team field
```

Restrict to non-archived incidents or supervisor role (future).

### 6.4 Reporting Canonical Field

**Primary filter key:** `assignedTeamCode`  
**Display:** `assignedTeamName`  
**Fallback (legacy only):** `inferTeamOnDuty()` with "Legacy/Unassigned" bucket

---

## 7. Redesigned Workflow

### 7.1 Civilian Emergency → Incident

1. Citizen submits emergency (no team knowledge).
2. Dispatcher sees report in Intake (App tab).
3. Dispatcher clicks Respond/Elevate.
4. **Modal: Select Assigned Team** (required) — Whiskey/X-ray/Yankee/Zulu from Firestore.
5. `elevateEmergencyToIncident(reportId, { assignedTeamId, ... })` writes permanent snapshot.
6. Incident appears in Active Incidents with assigned team.
7. Responder assigned via existing `assignedResourceIds` flow (unchanged).

### 7.2 Manual Intake

1. Dispatcher selects Team on Duty (renamed UI: **Assigned Team**).
2. `createIncident()` resolves team from `teams` collection → full snapshot.
3. Queue item shows team badge.
4. Team filter on intake list (client-side).

### 7.3 Active → Resolved → History

1. Team fields **immutable** through status transitions.
2. `acceptIncident`, `markIncidentTouchdown`, `resolve` — no team mutation.
3. History retains original assigned team.

### 7.4 Reports / Export

1. Filter: Date + Type + **Assigned Team**.
2. `filterIncidents()` uses `assignedTeamCode`.
3. Team Summary cards: count per team from resolved incidents in date range.
4. PDF/Excel/Print: only rows matching selected team.

---

## 8. Implementation Phases

### Phase 1 — Data Layer (2–3 days)

- [ ] Create `operationalTeams.ts` with `resolveTeamById`, `resolveTeamByCode`, `resolveTeamByLabel`
- [ ] Extend `IncidentRecord` / `CreateIncidentInput` / elevation input types
- [ ] Update `createIncident()` to populate `assignedTeam*`
- [ ] Update `elevateEmergencyToIncident()` — require team, remove Whiskey hardcode
- [ ] Add `reassignIncidentTeam()` + history sub-collection
- [ ] Seed script for default teams
- [ ] Migration script with dry-run
- [ ] Build & export from `@packages/firebase`
- [ ] Add Firestore index for team queries

### Phase 2 — Dispatcher UI (2–3 days)

- [ ] `OperationalTeamContext` + provider in layout
- [ ] Shared `TeamFilterBar` component (All + dynamic teams)
- [ ] Intake: dynamic team picker, team filter, elevation team modal
- [ ] Active Incidents + History: filter + display
- [ ] Wire `TeamQuickButtons`
- [ ] IntakeDetailView: reassignment UI

### Phase 3 — Reporting (1–2 days)

- [ ] Update `normalizeReportIncident`, `filterIncidents`, `analytics`
- [ ] Dynamic `TeamSummaryCards` + `teamSummaryTheme` fallback
- [ ] Export PDF/Excel/print columns and filters
- [ ] Rename UI labels: "Team on Duty" → "Assigned Team" where appropriate

### Phase 4 — Responder + Regression (1 day)

- [ ] Optional team badge on CaseCard/DetailHeader
- [ ] Full E2E test scenarios (see §9)
- [ ] Verify civilian app unchanged

### Phase 5 — Cleanup (optional)

- [ ] Deprecate `TeamOnDuty` union → `string`
- [ ] Remove `inferTeamOnDuty` after migration complete
- [ ] Server-side Firestore queries by team

---

## 9. End-to-End Test Plan

| # | Scenario | Pass criteria |
|---|----------|---------------|
| 1 | Citizen → Dispatcher assigns Whiskey | `assignedTeamName=Whiskey` in Firestore; responder receives; resolve; history; report; PDF; Excel; dashboard Whiskey count |
| 2 | Repeat X-ray | Same for X-ray |
| 3 | Repeat Yankee | Same |
| 4 | Repeat Zulu | Same |
| 5 | Intake filters | All/Whiskey/X-ray/Yankee/Zulu show correct subsets |
| 6 | Active Incidents filter | Realtime updates; filter works |
| 7 | Report export filters | Each team exports only its incidents |
| 8 | Dashboard Team Summary | Stats match Firestore per team |
| 9 | Regression | Civilian, dispatcher, responder, maps, chat, uploads, auth, rules |

### Regression Checklist (Scenario 9)

- [ ] Civilian: submit, SOS, status, history, no team in UI
- [ ] Dispatcher: intake, alerts, acknowledge, dispatch resources, map, overview
- [ ] Responder: login, assigned list, accept, navigate, touchdown, post report, resolve
- [ ] Notifications: dispatcher audio alerts, responder haptics
- [ ] Messaging: operational chat widget
- [ ] Uploads: post-incident photos
- [ ] Auth: command center login unchanged
- [ ] Firestore rules: read/write still authorized

---

## 10. Edge Cases

| Case | Handling |
|------|----------|
| Team deleted from admin | Incidents keep snapshot; picker hides inactive |
| Legacy incident no team | Migration backfill; export shows "Unassigned (Legacy)" |
| Wrong team at intake | `reassignIncidentTeam()` with audit |
| App report before elevation | No team on emergency (correct) |
| Multiple teams same day | Each incident has own snapshot |
| civilian app | Zero team exposure |
| Responder not on team | Still receives via UID assignment |
| `teams` collection empty | Seed on app init or migration |

---

## 11. Risks & Technical Debt

| Risk | Mitigation |
|------|------------|
| Legacy data without team | Migration + infer fallback |
| `TeamOnDuty` TypeScript union limits new teams | Phase out union; use dynamic string |
| Client-side filtering at scale | Add Firestore indexes + server queries later |
| `teamSummaryTheme` hardcoded colors | Generate from team index or default palette |
| `elevateEmergencyToIncident` missing duty fields | Set incidentDate/Time on elevation |
| Report merge from emergencies | `convertEmergencyReportToIncident` must copy assigned team from linked incident |

---

## 12. Files NOT Changed

- `apps/civilian-mobile-app/**` (verify only)
- `apps/super-admin-web-app/**`
- Cloud Functions (none exist)
- Firebase Storage rules
- Responder assignment query (`assignedResourceIds`)

---

## 13. Approval Gate

**Do not begin coding until:**

1. Stakeholder confirms field naming: `assignedTeamId` + `assignedTeamName` vs alternatives.
2. Stakeholder confirms reassignment is allowed for active incidents only.
3. Migration dry-run reviewed on staging/dev Firestore.

**After approval:** Implement Phase 1 → Phase 3 → Phase 4 in order.

---

## 14. Estimated Modified File Count

| Category | New | Modified |
|----------|-----|----------|
| `packages/firebase` | 3 | 5 |
| `dispatcher-web-app` | 3 | ~25 |
| `responder-mobile-app` | 0 | 2 (optional) |
| `civilian-mobile-app` | 0 | 0 |
| **Total** | **~6** | **~32** |
