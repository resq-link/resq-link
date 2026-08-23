# RESQ-LINK Operational Teams Analysis

**Status:** Analysis only — no code or data changes  
**Date:** August 23, 2026  
**Scope:** How responder teams **Zulu, Yankee, X-Ray, and Whiskey** work in the system, including how responder accounts relate to them  

**Related docs:**

- `OPERATIONAL_TEAM_ARCHITECTURE.md`
- `OPERATIONAL_TEAM_IMPLEMENTATION_PLAN.md`

---

## 1. Executive Summary

**Zulu, Yankee, X-Ray, and Whiskey are operational duty / shift teams for the Command Center — not agency units, not geographic zones, and not what decides which mobile responder sees an incident.**

They are:

- Hard-coded defaults in `packages/firebase/src/operationalTeams.ts`
- Idempotently seeded into Firestore `teams`
- Snapshotted onto **incidents** (`assignedTeamId` / `assignedTeamName` / `assignedTeamCode`, plus legacy `teamOnDuty` / `teamName`)
- Used for Command Center filtering, reporting, and “Current Team on Duty”
- Optionally copied onto responder/staff docs as `teamCode` / `teamLabel` (roster metadata)

They are **not** used by the responder mobile app to load incidents. Mobile visibility is:

```text
incidents.where('assignedResourceIds', 'array-contains', loggedInUid)
```

Accounts like `bfp@rescue.ph` are **shared agency responder logins** (one login per agency/unit), stored in `dispatchers` with `designation: 'responder'` and `role` = agency code (`BFP`, `PNP`, …). Seed/create scripts set `teamCode`/`teamLabel` to `null`, which is why Super Admin often shows **—** under Team.

**Verdict on teams:**

| Layer | Classification |
|-------|----------------|
| Incident-level operational team | **Useful (near-required for Command Center ops/reporting)** |
| Responder `teamCode` / `teamLabel` | **Optional / mostly unused for runtime dispatch** |

---

## 2. Current Team Architecture

There are **three parallel “team” concepts** (also documented in `OPERATIONAL_TEAM_ARCHITECTURE.md`):

| Concept | Storage | Purpose |
|--------|---------|---------|
| **Operational duty team** | `teams/{id}`; incident `assignedTeam*` / `teamOnDuty` | Shift/duty label on incidents; filters; reports |
| **Staff roster team** | `dispatchers.teamCode` / `teamLabel` | Super Admin / Command Center Teams page roster |
| **Resource team** | `resources.teamId` / `teamName` | Optional label on vehicles/units; copied into dispatch records |

### Actual relationship discovered

```text
Command Center (command@rescue.ph)
    │
    ├── sets Current Team on Duty → commandCenters/{uid}.currentTeamOnDuty
    │
    ├── creates/elevates Incident
    │      └── snapshot: assignedTeamId/Name/Code (Whiskey|X-ray|Yankee|Zulu)
    │
    └── dispatches Resources
           └── resources bound to responder UIDs
                  └── UIDs + resource IDs → incidents.assignedResourceIds
                         └── responder mobile + Expo push target those UIDs

Responder account (bfp@rescue.ph)
    ├── role = agency code (BFP)
    ├── designation = responder
    └── teamCode/teamLabel = optional roster field (often null)
         └── does NOT drive incident queries or push targeting
```

So the model is **not**:

```text
Agency → Team → Responder → Incident
```

It is closer to:

```text
Incident ← Operational Team (duty/reporting)
Incident ← Resources ← Responder UID(s)
Responder ← Agency (role)
Responder ← Team? (optional metadata only)
```

---

## 3. Zulu / Yankee / X-Ray / Whiskey Findings

### Where defined

Hard-coded defaults in `packages/firebase/src/operationalTeams.ts`:

```ts
{ code: 'whiskey', label: 'Whiskey', description: 'Operational duty team Whiskey', sortOrder: 1 },
{ code: 'x-ray', label: 'X-ray', description: 'Operational duty team X-ray', sortOrder: 2 },
{ code: 'yankee', label: 'Yankee', description: 'Operational duty team Yankee', sortOrder: 3 },
{ code: 'zulu', label: 'Zulu', description: 'Operational duty team Zulu', sortOrder: 4 },
```

Also duplicated as:

- API fallbacks (`app/api/teams/list/route.ts`)
- Seed scripts (`seed-report-incidents.ts`, `seed-test-dedup.ts`)
- UI emoji maps / reporting themes
- Migration scripts (`migrate-assigned-teams.ts`)

Seeded into Firestore via `ensureDefaultOperationalTeams()` / `migrate-assigned-teams.ts`.

### What each team is

| Team | Code | Nature |
|------|------|--------|
| Whiskey | `whiskey` | Operational duty / shift group |
| X-ray | `x-ray` | Same |
| Yankee | `yankee` | Same |
| Zulu | `zulu` | Same |

They are **not** verified as geographic, agency-specific, or one-to-one radio call signs for a person. Naming is NATO phonetic (common for radio/shift ops), but the code treats them as generic operational labels.

### Who belongs to each team

**No fixed mapping in seed/create scripts.** Standard responders are created with:

```ts
teamCode: null,
teamLabel: null,
```

So unless someone assigns them in Super Admin / Command Center Teams / Firestore, **no account “belongs” to Zulu/Yankee/X-Ray/Whiskey by default.**

Seed *incidents* do assign teams for reporting QA (for example INC-SEED-001 → Whiskey … Zulu), not accounts.

### Verified mapping

```text
Whiskey / X-ray / Yankee / Zulu
├── Agency: none (shared across agencies)
├── Accounts: none by default (optional teamCode on dispatchers)
├── Purpose: duty/shift label on incidents + CC filters/reports
└── Assignment behavior: stamped on incident at intake/elevation;
    reassignable via reassignment APIs; NOT used for mobile visibility
```

### Effects

| Concern | Affected by team? |
|---------|-------------------|
| Incident notifications (Expo) | **No** — targets UIDs in `assignedResourceIds` |
| Mobile incident list | **No** |
| Mobile login/access | **No** |
| Which agencies can receive | **No** — via resources / agencies |
| CC intake/history/report filters | **Yes** |
| Super Admin Team column / detail | **Yes** (display only if `teamLabel` set) |

---

## 4. Responder Account Architecture

Accounts such as `bfp@rescue.ph`, `pnp@rescue.ph`, etc.:

| Fact | Evidence |
|------|----------|
| Stored in | Firestore `dispatchers/{uid}` |
| Auth | Firebase Auth email/password |
| `designation` | `'responder'` (migrated from older “dispatcher” agency logins) |
| `role` | Agency code: `BFP`, `PNP`, `MDRRMO`, `AMBULANCE`, `PCG` |
| Claims | `{ role: 'responder', agency: '<code>' }` |
| Team | Optional `teamCode`/`teamLabel`; seeds use `null` |
| Mobile | Responder app signs into these accounts |

### What each account represents (from code)

- **Shared agency / unit login** for the responder mobile app (one account per agency in the standard seed set)
- **Not** an individual named person model in seed data (`fullName: 'BFP Responder'`)
- **Not** a team (Zulu etc.)
- **Not** a Command Center web dispatcher (`commandCenters` / `command@rescue.ph`)

`ems@rescue.ph` and `hospital@rescue.ph` both map to agency `AMBULANCE` in migration scripts — multiple logins can share one agency code.

---

## 5. Agency ↔ Team ↔ Responder Relationships

```text
Responder Account
  ├── agency via dispatchers.role (e.g. BFP)
  └── team via dispatchers.teamCode/teamLabel (optional, often null)

Agency
  └── catalog / agencies collection (BFP, PNP, …)
  └── NOT a parent of Whiskey/Zulu

Team (Whiskey…)
  └── teams collection
  └── stamped on incidents
  └── optionally referenced by staff + resources
  └── NOT required to belong to one agency
```

### When responder team assignment happens

- Super Admin creates responder with Team dropdown (optional → “Unassigned”)
- Super Admin / Command Center edits staff and sets Team
- Manual Firestore edit

### When it does **not** happen

- Standard seed scripts run (always `null`)
- Incident is dispatched (dispatch uses resources → UIDs)
- Based on incident type (incident type → recommended agencies/resources, not Zulu/Yankee)

---

## 6. Incident Dispatch Flow

### Actual workflow

```text
1. Civilian report / manual intake
2. Command Center sets / uses Current Team on Duty
3. Elevate or create incident → assignedTeam* snapshot required
4. Dispatcher selects Resource(s) (must have active bound responder UID)
5. dispatchIncidentResources:
     - merges resource IDs + bound responder UIDs into assignedResourceIds
     - updates agencies from resources
     - copies resource/incident teamId/teamName into dispatch subdocs (label only)
6. Cloud Function onIncidentAssigned → Expo push to newly added UIDs
7. Responder app shows incident because UID ∈ assignedResourceIds
```

### Not the workflow

- Select Team → all responders on that team get it
- Select Agency → all agency accounts get it automatically
- Team determines Agency

Agency involvement is via **resources** (and type rules recommending agencies), not via Zulu/Yankee.

---

## 7. Mobile App Behavior

After login (`signInDispatcher` + `dispatchers/{uid}`):

**Typically loaded into session:**

- `uid`, `email`, `role` (agency code), `active`
- **Does not load or use `teamCode` / `teamLabel`**

**Incidents:**

```text
subscribeToResponderAssignedIncidents(uid)
→ where('assignedResourceIds', 'array-contains', uid)
```

No `where('assignedTeamCode'…)`, no agency filter on the query. Agency on the account is identity/metadata; **assignment list is UID-based**.

---

## 8. Notification Flow

`functions/src/index.ts` → `onIncidentAssigned`:

1. Diff `assignedResourceIds` before/after
2. Alert only newly added IDs
3. `loadResponderTokens(uids)` from `dispatchers/{uid}.pushTokens`
4. Expo push per token

**Targets:** specific responder UIDs / Expo tokens — not teams, not FCM topics, not agencies.

**Zulu / Yankee / X-Ray / Whiskey do not affect notification delivery.**

---

## 9. Firebase Collections and Fields Involved

| Collection / path | Relevant fields |
|-------------------|-----------------|
| `teams` | `code`, `label`, `description`, `isActive`, `sortOrder` |
| `incidents` | `assignedTeamId/Name/Code/At/By`, `teamId`, `teamName`, `teamOnDuty`, `assignedResourceIds`, `assignedAgencies` |
| Incident team reassignment APIs | previous/new team snapshot |
| `emergencies` | may get `assignedTeam*` on elevation |
| `dispatchers` | `role` (agency), `designation`, `teamCode`, `teamLabel`, `pushTokens`, `active` |
| `commandCenters` / shift doc | `currentTeamOnDuty` |
| `resources` | `teamId`, `teamName`, `primaryResponderId`, `assignedResponderIds`, `agency` |
| `incidentDispatches` (or similar) | copies `teamId`/`teamName` from resource/incident |

---

## 10. Data Inconsistencies Found

1. **Three team concepts** not unified (incident / staff / resource).
2. **Legacy aliases** on incidents: `teamOnDuty`, `teamName`, `teamId` vs `assignedTeam*`.
3. **Dispatch subdocs** may copy **resource** team, which can disagree with incident operational team.
4. **Seed responders have no team**; UI shows **—** (`DetailItem` uses `value || '—'`).
5. **Team optional on create**; required on incident create/elevation.
6. **Historical bug** (docs): civilian elevation once hardcoded `"Whiskey"` — current elevate path requires resolved team via `assignedTeamId` / current duty team.
7. **Collection name lag**: responders still live in `dispatchers`.
8. **Mobile never reads staff team** while Super Admin can edit it → roster field with no field effect.
9. **Naming drift** across files (`X-ray` vs `X-Ray`, `assignedResourceIds` holding both resource IDs and responder UIDs).

---

## 11. Legacy / Unused Logic

- Older model treated agency emails as “dispatchers”; migration scripts reclassify them as `designation: 'responder'`.
- `teamOnDuty` enum + `inferTeamOnDuty()` reporting inference = legacy/inconsistency layer.
- Staff `teamCode` appears to be a **roster feature** from the Teams page era, not the mobile assignment model.
- Docs (`OPERATIONAL_TEAM_ARCHITECTURE.md`, implementation plan) describe a deliberate move toward permanent incident `assignedTeam*` — that is the modern meaning of Whiskey/Zulu.

**Classification:** NATO-named teams are **real operational constructs for Command Center**, not leftover test-only strings — but **attaching them to responder accounts is largely leftover/roster UX**, not the dispatch spine.

---

## 12. Whether Teams Are Actually Necessary

| Layer | Classification | Why |
|-------|----------------|-----|
| Incident `assignedTeam*` | **Useful (effectively required for CC)** | Intake requires team; filters; reports; Current Team on Duty |
| Firestore `teams` registry | **Useful** | Dynamic labels; CRUD; seed of 4 defaults |
| Responder `teamCode`/`teamLabel` | **Optional / Redundant for dispatch** | Not used by mobile queries or push |
| Resource `teamId`/`teamName` | **Optional** | Display / dispatch snapshot; not mobile gate |

If responders already = agencies and dispatch is resource→UID, **Team on the responder row is not needed for routing.** Incident-level team still matters for **who was on duty / reporting**.

---

## 13. Risks of Removing Teams

### If you remove incident operational teams

- Intake that requires current team breaks
- Team filters / grouped intake / report-by-team / PDF team summary break
- Historical reports lose duty attribution
- Reassignment audit trail for teams breaks

### If you only remove responder `teamCode`

- Super Admin Team column / Change Team / Create Team dropdown become meaningless
- Command Center Teams member assignment breaks
- Resources UI that groups responders by `teamCode` loses that grouping
- **Mobile login, incident list, and push should keep working**

### If you remove teams but leave orphan `assignedTeamId` on incidents

Resolution helpers may fall back to hard-coded defaults or throw “valid assigned operational team required.”

---

## 14. Recommended Architecture

Keep (verified useful):

```text
Incident
  └── assignedTeam* = duty team on shift (Whiskey…)

Dispatch
  └── Resources → responder UIDs → assignedResourceIds → mobile + push

Responder
  └── agency (role) required
  └── team optional or drop from account model if you want less confusion
```

### Clarify product language

| Term | Meaning |
|------|---------|
| **Team on Duty** | Whiskey / X-ray / Yankee / Zulu (Command Center shift) |
| **Agency** | BFP / PNP / … (who responds) |
| **Responder account** | Shared agency mobile login |

Do **not** imply Super Admin Team = who receives the call.

---

## 15. Account Mapping Table

```text
Account                 Role/type      Agency      Team (default)   Mobile login
--------------------------------------------------------------------------------
command@rescue.ph       command_center —           —                No (web CC)
bfp@rescue.ph           responder      BFP          null / —         Yes
pnp@rescue.ph           responder      PNP          null / —         Yes
mdrrmo@rescue.ph        responder      MDRRMO       null / —         Yes
ambulance@rescue.ph     responder      AMBULANCE    null / —         Yes
pcg@rescue.ph           responder      PCG          null / —         Yes
ems@rescue.ph           responder      AMBULANCE    null / —         Yes
hospital@rescue.ph      responder      AMBULANCE    null / —         Yes
```

Team is only non-null if assigned later in Super Admin / Teams UI / Firestore.

```text
Incident targeting:       assignedResourceIds contains responder UID (via dispatched resources)
Notification targeting:   Expo tokens on dispatchers/{uid} for newly added assignedResourceIds
```

---

## 16. Architecture Diagram (Verified)

```text
Super Admin
    │
    ├── Command Center / Dispatcher
    │      └── command@rescue.ph
    │             ├── Current Team on Duty (Whiskey|X-ray|Yankee|Zulu)
    │             └── Incidents get assignedTeam* snapshot
    │
    └── Responders (dispatchers collection, designation=responder)
           │
           ├── BFP        → bfp@rescue.ph        (team optional / usually —)
           ├── PNP        → pnp@rescue.ph        (team optional / usually —)
           ├── MDRRMO     → mdrrmo@rescue.ph     (team optional / usually —)
           ├── AMBULANCE  → ambulance@ / ems@ / hospital@
           └── PCG        → pcg@rescue.ph        (team optional / usually —)

Dispatch path (runtime):
  Incident → select Resources → bound responder UIDs
           → assignedResourceIds
           → mobile query + Expo push
```

---

## 17. Plain-Language Answers

1. **What is Team Zulu?** An operational Command Center duty/shift label (one of four defaults), stored in `teams` and stamped on incidents.
2. **What is Team Yankee?** Same.
3. **What is Team X-Ray?** Same (`X-ray` / `x-ray` in code).
4. **What is Team Whiskey?** Same; historically the default when civilian elevation was hardcoded.
5. **Who belongs to each team?** No built-in membership. Accounts are usually unassigned; membership is optional roster metadata.
6. **Why does RESQ-LINK need teams?** So Command Center can attribute and filter work by who was on duty, and report by shift — not to route mobile apps.
7. **Does a responder account represent a person, agency, or team?** **Shared agency/unit login** (agency via `role`), not a team, not a named individual in seed data.
8. **How does the dispatcher send an incident?** Create/elevate with duty team → pick resources bound to responder UIDs → those UIDs get the incident.
9. **How does the responder mobile app know which incident to display?** Logged-in UID is in `assignedResourceIds`.
10. **What would break if the Team concept were removed?** Removing **incident** teams breaks CC intake/filters/reports. Removing **account** Team mostly breaks admin roster UI; dispatch/mobile/push can survive.

---

## Bottom Line

Treat Whiskey / X-ray / Yankee / Zulu as **Command Center shift/duty teams on incidents**.

Treat `bfp@rescue.ph`-style accounts as **agency responder logins**.

The Super Admin **Team** field is optional roster data; **—** means unassigned, which is normal and does not block dispatch.

---

## Key Source Files

| Area | Path |
|------|------|
| Default team constants | `packages/firebase/src/operationalTeams.ts` |
| Teams CRUD / seed | `packages/firebase/src/teams.ts` |
| Incident assignment fields | `packages/firebase/src/incidents.ts` |
| Responder subscription | `subscribeToResponderAssignedIncidents` in `incidents.ts` |
| Account create (team optional) | `packages/firebase/src/admin.ts`, `app/api/create-responder/route.ts` |
| Seed responders (team null) | `packages/firebase/scripts/create-standard-dispatchers-admin.ts` |
| Agency→responder migration | `packages/firebase/scripts/migrate-agency-accounts-to-responders.ts` |
| Push notifications | `functions/src/index.ts`, `functions/src/expoPush.ts` |
| Super Admin Team UI | `components/accounts/CreateStaffDialog.tsx`, `StaffEditDrawer.tsx`, `StaffAccountsPage.tsx` |
| Command Center Teams page | `app/(command-center)/command-center/teams/page.tsx` |
| CC current team context | `contexts/OperationalTeamContext.tsx` |
| Mobile auth profile | `apps/responder-mobile-app/src/services/auth/dispatcherAuth.ts` |
| Mobile incident hook | `apps/responder-mobile-app/src/modules/incidents/hooks/useAssignedEmergencies.js` |
