# RESQ-Link Dispatcher: Team-Based Operations — Architecture Analysis

**Status:** Historical analysis (paths below may still say `dispatcher-web-app`; the live app is `apps/resq-link-web-app`)  
**Date:** July 3, 2026  
**Scope:** Command Center — operational team assignment (Whiskey, X-ray, Yankee, Zulu)  
**Constraint:** Single dispatcher account; no separate logins per team

---

## Executive Summary

The Dispatcher Web App captures **Team on Duty** during manual Incident Intake, but team assignment is **not integrated** across Active Incidents, History, or reliable reporting. Civilian app elevations **hardcode Whiskey**. Three parallel “team” concepts exist in the codebase without a unified model.

**Recommendation:** Make operational team a **permanent, immutable snapshot** on every incident (and on emergencies after elevation), backed by the Firestore `teams` collection, with optional **session-level team filter** for the single dispatcher UI — not separate user accounts.

---

## 1. Current System Analysis

### 1.1 Three Disconnected “Team” Concepts

| Concept | Where it lives | Purpose today |
|--------|----------------|---------------|
| **Operational team (shift)** | `incidents.teamOnDuty` enum (`Whiskey`, `X-ray`, `Yankee`, `Zulu`) | Intake form, reporting inference |
| **Firestore `teams` collection** | `teams/{id}` with `code`, `label` | Admin Teams page, resource defaults |
| **Dispatcher staff team** | `dispatchers.teamCode` / `teamLabel` | Roster on Teams page — **not** tied to incidents |

There is **no foreign key** from an incident to `teams/{id}`. `incidents.teamId` exists in the type but is always `null` on manual intake.

### 1.2 Database Structure (Relevant Fields)

#### `incidents` collection (`packages/firebase/src/incidents.ts`)

| Field | Set on manual create? | Set on app elevation? | Used in reports? |
|-------|----------------------|----------------------|------------------|
| `teamOnDuty` | ✅ Required | ✅ But hardcoded `"Whiskey"` | ✅ Primary filter via `inferTeamOnDuty()` |
| `teamName` | ✅ Mirrored from `teamOnDuty` | ❌ Often missing | ⚠️ Fallback inference |
| `teamId` | ❌ Always `null` | ❌ | ❌ |
| `incidentDate`, `scheduleOfDuty` | ✅ | ❌ Incomplete on elevation | Date filters |

#### `emergencies` collection

**No team fields.** Civilian reports only get team context after elevation to `incidents`, and even then assignment is wrong (hardcoded Whiskey).

#### `incidentDispatches` sub-collection

Copies `teamId`/`teamName` from **resources**, not from the incident’s operational team. This can **contradict** `teamOnDuty`.

#### `teams` collection

Proper CRUD exists (`packages/firebase/src/teams.ts`) but intake/reporting **do not read from it**; they use a hardcoded enum in multiple files.

### 1.3 How Incidents Are Created Today

```
Manual Intake Form
  → createIncident() → teamOnDuty + teamName saved ✅

Civilian App Report → Respond
  → elevateEmergencyToIncident() → teamOnDuty hardcoded "Whiskey" ❌

Dispatch Resources
  → dispatchIncidentResources() → does NOT update incident team ❌
```

**Manual intake** (`app/intake/page.tsx`): Team on Duty is required and saved correctly to `teamOnDuty` / `teamName`.

**Civilian app elevation** (`elevateEmergencyToIncident`): Always passes `teamOnDuty: "Whiskey"` — no picker, no link to intake form selection.

**Dispatch resources** (`dispatchIncidentResources`): Updates agencies/resources but **never** writes operational team back to the incident.

**No update API** exists to change `teamOnDuty` after creation (e.g. wrong team selected).

### 1.4 How “Team on Duty” Is Used Per Screen

| Screen | Team behavior |
|--------|---------------|
| **Incident Intake** | Captured on manual form only; not used to filter queue |
| **Active Incidents** | Display label only; **no team filter** |
| **Incident History** | Display only; **no team filter** |
| **Reports / Export** | `selectedTeam` filter via `inferTeamOnDuty()` — client-side only |
| **Team Summary cards** | Count all 4 teams; intentionally ignores team filter |
| **Navigation badges** | Not team-scoped |

Reporting relies on `inferTeamOnDuty()` (`lib/reporting/normalizeReportIncident.ts`), which:

1. Uses `teamOnDuty` if valid enum
2. Falls back to `teamName`
3. Falls back to fuzzy string match
4. Else → `"Unassigned (Needs Fix)"` in exports

That inference layer exists **because data is inconsistent**, not because it’s good design.

### 1.5 Root Cause

> Team on Duty is only meaningful at intake submit time for **manual** incidents, and is **not a first-class, permanent, queryable property** across the lifecycle.

Specific gaps:

1. App-originated incidents default to Whiskey
2. `emergencies` never store team
3. `teamId` is never populated → no link to `teams` collection
4. Intake queue is not filtered/grouped by team
5. Active Incidents / History ignore team entirely
6. Reports filter client-side over incomplete data
7. Enum is duplicated in 4+ files — adding a 5th team requires many edits
8. Single dispatcher account is fine, but there’s no **session-level “working team”** or **persistent incident team** model

### 1.6 Key File Index

| Area | Path |
|------|------|
| Types & CRUD | `packages/firebase/src/incidents.ts` |
| Emergencies | `packages/firebase/src/emergencies.ts` |
| Teams collection | `packages/firebase/src/teams.ts` |
| Intake form | `apps/dispatcher-web-app/app/intake/page.tsx` |
| Active incidents | `apps/dispatcher-web-app/app/incidents/page.tsx` |
| History | `apps/dispatcher-web-app/app/history/page.tsx` |
| Report analytics | `apps/dispatcher-web-app/app/report/page.tsx` |
| Report export | `apps/dispatcher-web-app/app/report/incidents/page.tsx` |
| Filter/inference | `apps/dispatcher-web-app/lib/reporting/incidents.ts`, `normalizeReportIncident.ts` |
| Team enum constant | `apps/dispatcher-web-app/lib/reporting/constants.ts` |
| Teams admin UI | `apps/dispatcher-web-app/app/teams/page.tsx` |

---

## 2. Should Team Assignment Be Permanent on Each Incident?

**Yes — unconditionally.**

| Question | Recommendation |
|----------|----------------|
| Should every incident store its assigned operational team? | **Yes**, at creation (or elevation), immutable by default |
| Should it survive resolution? | **Yes** — historical reporting depends on it |
| Should it be the team on duty at intake, not “current” team? | **Yes** — snapshot at assignment time |
| Should `teamName` be denormalized? | **Yes** — store `teamCode` + `teamLabel` (+ optional `teamId`) for stable exports even if `teams` doc is renamed |
| Should emergencies store team before elevation? | **Yes** — set when dispatcher accepts/elevates |

### Pros of Permanent Assignment

- Accurate Whiskey-only / X-ray-only reports without inference
- Reliable team KPIs and response-time comparisons
- Works with **one login** — filter by team, not by user
- Scales to N teams via `teams` collection
- Audit trail: “who handled this” = team at time of assignment

### Cons / Mitigations

| Concern | Mitigation |
|---------|------------|
| Wrong team selected at intake | Allow **supervisor override** with `teamReassignedAt` / `teamReassignedBy` audit fields |
| Team renamed in admin | Keep snapshot `teamLabel` on incident; `teamId` is reference only |
| Legacy data missing team | One-time migration + `inferTeamOnDuty()` fallback for old rows only |

---

## 3. Implementation Approaches (Pros & Cons)

### Option A — Keep Hardcoded Enum, Fix Write Paths Only

- Fix `elevateEmergencyToIncident`, add filters to Active/History
- **Pros:** Fast, low risk
- **Cons:** Doesn’t scale; 5th team needs code changes everywhere; `teams` collection stays orphaned

### Option B — Enum + Populate `teamId` from `teams` Lookup (Recommended Baseline)

- `teams` collection is source of truth; incidents store `teamId`, `teamCode`, `teamOnDuty` (label)
- UI loads teams dynamically
- **Pros:** Scalable, single dispatcher account, minimal auth changes
- **Cons:** Requires migration + shared team registry module

### Option C — Separate Logins Per Team

- **Rejected** — violates single-account constraint

### Option D — Session “Active Team” Only (No Permanent Field)

- Dispatcher picks Whiskey in nav; filters views
- **Rejected alone** — reports/history would lose accuracy if filter not applied or team changes mid-shift

### Recommended: Option B + Session Context (Hybrid)

- **Permanent** `operationalTeam*` fields on every incident (and emergency after elevation)
- **Optional** session `activeTeamFilter` in UI (sessionStorage / React context) for convenience — pre-fills intake, filters lists
- **No** separate logins

---

## 4. Recommended Architecture

### 4.1 Canonical Team Model

```
teams/{teamId}
  code: "whiskey"        // stable machine key (lowercase, slug)
  label: "Whiskey"      // display
  sortOrder: 1
  isActive: true
```

**Incident snapshot (written once at assignment, updated only via explicit reassignment):**

```
incidents/{id}
  operationalTeamId: string | null      // FK → teams/{id}
  operationalTeamCode: string             // e.g. "whiskey"
  operationalTeamLabel: string            // e.g. "Whiskey"
  teamOnDuty: TeamOnDuty                  // KEEP for backward compat (= label)
  teamName: string                        // KEEP (= label, deprecated alias)
  teamAssignedAt: Timestamp
  teamAssignedBy: string                    // dispatcher uid or display name
```

Keep existing `teamOnDuty` / `teamName` populated from the same snapshot so **current report code keeps working** during migration.

### 4.2 Shared Modules (Single Source of Truth)

**Firebase package:**

```
packages/firebase/src/operationalTeams.ts   // OR extend teams.ts
  - resolveOperationalTeam(teamId | code | label) → snapshot
  - subscribeToActiveOperationalTeams()
  - normalizeTeamCode()
  - TEAM_CODES constant fallback if Firestore empty
```

**Dispatcher app:**

```
apps/dispatcher-web-app/contexts/OperationalTeamContext.tsx
  - activeTeamFilter: TeamCode | 'all'  // session only, not auth
  - setActiveTeamFilter()
  - persisted in sessionStorage
```

### 4.3 Per-Screen Behavior

| Screen | Behavior |
|--------|----------|
| **Intake** | Required team picker from `teams`; queue filter/tab by team; URL `?team=whiskey` |
| **Active Incidents** | Team filter chips (All / Whiskey / …); default from session filter |
| **History** | Same team filter |
| **Reports** | `selectedTeam` filters by `operationalTeamCode` (not inference) |
| **Team Summary** | Count where `operationalTeamCode === team.code` AND resolved in date range |
| **PDF/Excel** | Rows include Assigned Team; export filtered set; optional per-team sheets later |
| **Map / Overview** | Optional team color coding |

### 4.4 Query Strategy

**Phase 1 (now):** Client-side filter on subscribed incidents (matches today, but on **canonical** `operationalTeamCode`).

**Phase 2 (scale):** Firestore composite indexes:

```json
{
  "collectionGroup": "incidents",
  "fields": [
    { "fieldPath": "operationalTeamCode", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "resolvedAt", "order": "DESCENDING" }
  ]
}
```

Server-side queries when incident volume grows.

---

## 5. End-to-End Workflow (Redesigned)

1. **Optional:** Dispatcher sets Active Team filter = X-ray (session only)
2. **Manual intake:** Dispatcher selects Team on Duty → `createIncident()` writes full operational team snapshot
3. **Civilian report:** Dispatcher accepts with team picker → `elevateEmergencyToIncident()` writes team on incident **and** emergency
4. **Active Incidents:** List filtered by `operationalTeamCode` (optional)
5. **Dispatch resources:** Team on incident **unchanged**
6. **Resolve:** Team fields **immutable**
7. **History / Reports:** Filter by `operationalTeamCode` + date range
8. **Team Summary / PDF / Excel:** Statistics and rows from stored team, not inference

### Rules

1. Team is chosen at **intake or elevation** — not inferred later
2. Team is **immutable** through dispatch and resolution
3. Reassignment is an **explicit admin action** with audit trail
4. Reports use **stored** `operationalTeamCode`, not `responder` string matching

---

## 6. Edge Cases

| Edge case | Handling |
|-----------|----------|
| Dispatcher forgets to pick team | Block submit (manual); same validation on app elevation |
| Wrong team selected | `reassignOperationalTeam(incidentId, newTeam, reason)` — audit log |
| Team deactivated in admin | Existing incidents keep snapshot; picker hides inactive teams |
| New team added (e.g. Echo) | Add doc in `teams`; UI picks it up automatically |
| Legacy incidents missing team | Migration script + report fallback `inferTeamOnDuty()` flagged as “Legacy” |
| Civilian report never elevated | Stays in `emergencies` without team — correct (not yet assigned) |
| Merged/linked reports | Team lives on master `incident` |
| Export “All teams” | `selectedTeam === 'all'` |
| Export single team | Filter `operationalTeamCode`; summary cards can show all teams for comparison |
| Single account, multiple teams same day | Each incident has its own snapshot — no conflict |

---

## 7. Database Modifications Required

| Change | Priority | Notes |
|--------|----------|-------|
| Add `operationalTeamId`, `operationalTeamCode`, `operationalTeamLabel`, `teamAssignedAt`, `teamAssignedBy` to `incidents` | P0 | Denormalized snapshot |
| Add same fields to `emergencies` on elevation | P1 | Pre-incident traceability |
| Populate `teamId` from `teams` lookup | P0 | Stop leaving null |
| `reassignOperationalTeam()` API | P2 | Supervisor override |
| Firestore indexes for team + status + date | P2 | When volume warrants |
| Migration script for existing incidents | P1 | Map `teamOnDuty` → `operationalTeamCode` |
| Seed `teams` with Whiskey/X-ray/Yankee/Zulu if empty | P0 | Idempotent seed |

**No new collections required** — extend `incidents`, `emergencies`, use existing `teams`.

---

## 8. Step-by-Step Implementation Plan

### Phase 1 — Data Layer (Foundation)

1. Add `OperationalTeamSnapshot` type and `resolveOperationalTeam()` in `@packages/firebase`
2. Update `createIncident()` to resolve team from selection → full snapshot
3. Update `elevateEmergencyToIncident()` — require `teamOnDuty`, set `teamName`, duty fields, emergency team fields
4. Remove hardcoded `"Whiskey"` in intake respond flow; use form/session team
5. Seed / verify `teams` collection matches four operational teams
6. Migration script for legacy `incidents`

### Phase 2 — Dispatcher UI

7. `OperationalTeamContext` — session filter + intake prefill
8. Intake: load teams from Firestore; team filter on queue
9. Active Incidents + History: team filter chips
10. Wire `TeamQuickButtons` (already built, unused)

### Phase 3 — Reporting

11. Replace `inferTeamOnDuty()` primary path with `operationalTeamCode` (keep fallback for legacy)
12. Team Summary: count by `operationalTeamCode`
13. PDF/Excel/print: use canonical team label
14. Add “Unassigned / Legacy” bucket in exports for unmigrated rows

### Phase 4 — Hardening

15. `reassignOperationalTeam()` + UI on incident detail
16. Firestore indexes + optional server-side queries
17. Validation rules: `operationalTeamCode` required on create
18. E2E tests: intake → active → resolve → export per team

---

## 9. Recommendation Summary

| Decision | Answer |
|----------|--------|
| Permanent team on incident? | **Yes** — snapshot at assignment |
| Multiple logins? | **No** — single dispatcher + session filter |
| Source of truth for team list? | **`teams` Firestore collection** |
| Filter Active/History/Reports? | **By `operationalTeamCode`** |
| Team Summary statistics? | **Count resolved incidents per `operationalTeamCode` in date range** |
| PDF/Excel separation? | **Filter rows by selected team; optional future multi-sheet export** |
| Scalable to more teams? | **Yes** — dynamic `teams` + stable `code` field |

---

## 10. Current vs. Target Data Flow

### Current (problematic)

```
Intake (manual) ──teamOnDuty──► incidents
App elevation ──hardcoded Whiskey──► incidents
teams collection ◄── not wired ──► incidents
incidents ──inferTeamOnDuty()──► Reports (unreliable)
Active Incidents / History ── no team filter
```

### Target

```
teams collection ──resolveOperationalTeam()──► incident snapshot (permanent)
Intake + App elevation ──required team pick──► incidents + emergencies
Session activeTeamFilter ──► UI list filters (optional convenience)
incidents.operationalTeamCode ──► Reports / Export / Team Summary (reliable)
```

---

## Related Documentation

- `apps/dispatcher-web-app/openspec/changes/add-incident-management-intake/` — intake spec
- `packages/firebase/scripts/seed-report-incidents.ts` — sample team-tagged seed data
- `apps/dispatcher-web-app/lib/reporting/constants.ts` — current `TEAMS_ON_DUTY` enum
