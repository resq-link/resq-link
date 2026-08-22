# ResQ Link — Test Accounts

Seed credentials from `packages/firebase/scripts/`. Use these to log into each app.

> Accounts must already exist in Firebase (run the seed scripts below if login fails).

---

## Civilian Mobile App

**App:** `apps/civilian-mobile-app`  
**Auth:** Email + password (`signInCivilian`)  
**Seed:** `npx ts-node scripts/create-civilian-users.ts` (from `packages/firebase`)

| Email | Password | Name |
|-------|----------|------|
| `civilian@rescue.ph` | `Civilian2024!` | Test Civilian |
| `maria.santos@rescue.ph` | `Civilian2024!` | Maria Santos |
| `juan.delacruz@rescue.ph` | `Civilian2024!` | Juan Dela Cruz |

**Quick login:** `civilian@rescue.ph` / `Civilian2024!`

---

## Responder Mobile App

**App:** `apps/responder-mobile-app`  
**Auth:** Email + password (`signInDispatcher`) — documents live in `dispatchers/{uid}`  
**Seed:** `npx ts-node scripts/create-standard-dispatchers-admin.ts` (or `create-dispatcher-accounts.ts`)

| Email | Password | Role |
|-------|----------|------|
| `bfp@rescue.ph` | `BFP2024!` | BFP |
| `pnp@rescue.ph` | `PNP2024!` | PNP |
| `mdrrmo@rescue.ph` | `MDRRMO2024!` | MDRRMO |
| `ambulance@rescue.ph` | `AMBULANCE2024!` | AMBULANCE |
| `pcg@rescue.ph` | `PCG2024!` | PCG |

**Quick login:** `bfp@rescue.ph` / `BFP2024!`

---

## Dispatcher / Command Center Web App

**App:** `apps/resq-link-web-app`  
**URL:** http://localhost:3000/login → `/command-center/overview`  
**Auth:** Email + password — documents live in `commandCenters/{uid}`  
**Seed:** `npx ts-node scripts/create-command-center.ts` and/or `create-command-rescue-admin.ts`

| Email | Password | Name |
|-------|----------|------|
| `command@rescue.ph` | `command123` | Command Center (Tuguegarao) |
| `manila@commandcenter.ph` | `Manila2024!` | Manila Command Center |
| `quezon@commandcenter.ph` | `Quezon2024!` | Quezon City Command Center |
| `makati@commandcenter.ph` | `Makati2024!` | Makati Command Center |

**Quick login:** `command@rescue.ph` / `command123`

---

## Super Admin Web

**App:** `apps/resq-link-web-app`  
**URL:** http://localhost:3000/login → `/admin/dashboard`  
**Auth:** Email + password — documents live in `admins/{uid}`  
**Seed:** `npx ts-node scripts/create-first-admin.ts` (from `packages/firebase`; uses `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

Default seed email (override with env): `superadmin@rescue.ph`

---

## Seed all accounts

From `packages/firebase` (requires Admin credentials in `.env`):

```bash
npx ts-node scripts/create-civilian-users.ts
npx ts-node scripts/create-standard-dispatchers-admin.ts
npx ts-node scripts/create-command-center.ts
npx ts-node scripts/create-command-rescue-admin.ts
```
