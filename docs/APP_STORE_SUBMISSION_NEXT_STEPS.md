# App Store submission — next steps

**Updated:** 2026-08-23  
**Goal:** Get **RESQ-Link** (civilian) and **RESQ Responder** into App Review / public listing after TestFlight validation.

Related checklists:

- Civilian privacy / review notes → [`apps/civilian-mobile-app/docs/APP_STORE_PRIVACY.md`](../apps/civilian-mobile-app/docs/APP_STORE_PRIVACY.md)
- Responder privacy / review notes → [`apps/responder-mobile-app/docs/APP_STORE_PRIVACY.md`](../apps/responder-mobile-app/docs/APP_STORE_PRIVACY.md)

---

## App identities

| App | Display name | Bundle ID | ASC App ID | EAS project |
|-----|--------------|-----------|------------|-------------|
| Civilian | RESQ-Link | `com.tuguegarao.resqlink` | [6804236040](https://appstoreconnect.apple.com/apps/6804236040) | `@grymarkers-team/resq-link` |
| Responder | RESQ Responder | `com.tuguegarao.resqlink.responder` | [6804334951](https://appstoreconnect.apple.com/apps/6804334951) | `@grymarkers-team/resq-link-responder` |

Privacy policy (both): confirm the live URL you paste in App Store Connect matches the deployed web legal pages (see each app’s `APP_STORE_PRIVACY.md`).

---

## Where we are now

### Done

- [x] Both ASC apps created; EAS submit configs point at the correct `ascAppId`s
- [x] Civilian iOS production builds reaching TestFlight (crash fixes shipped)
- [x] Responder iOS production builds reaching TestFlight (session restore + branding in Build 7+)
- [x] App Privacy / review note drafts written per app (see links above)
- [x] Legal pages targeted for App Store (privacy / data privacy / terms on the web app)

### Blocked / in progress (do these before “Submit for Review”)

1. **Responder maps blank on device** — no `GOOGLE_MAPS_API_KEY` in EAS; app was forcing Google Maps. Fix is in the working tree (Apple Maps fallback when no key + `useFrameworks: static`). **Needs commit + new EAS iOS production build + submit** before treating maps as verified.
2. **Civilian maps** — same missing Google key; Apple Maps fallback aligned in working tree. Rebuild only if you want that parity on the next civilian build; current TestFlight may already look fine via Apple Maps.
3. **Demo accounts must be active** before any App Review (see privacy docs).
4. **Store listing assets** incomplete (screenshots, description, age rating, etc.).

---

## Immediate next steps (ordered)

### 1. Ship the maps fix (responder first)

```bash
# After committing the maps changes on main:
cd apps/responder-mobile-app
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform ios --profile production
eas submit --platform ios --latest
```

Then in [TestFlight → Responder](https://appstoreconnect.apple.com/apps/6804334951/testflight/ios):

- [ ] Install the new build on a real device
- [ ] Confirm Map tab shows tiles (Apple Maps is OK)
- [ ] Confirm case detail map preview shows tiles
- [ ] Confirm login persists after force-quit / reopen (Build 7+ session fix)

Optional (Google tiles later): add `GOOGLE_MAPS_API_KEY` to EAS production for each app, then rebuild. Not required for Apple Maps.

### 2. Re-verify civilian TestFlight

In [TestFlight → Civilian](https://appstoreconnect.apple.com/apps/6804236040/testflight/ios):

- [ ] App launches on device (no instant crash)
- [ ] Demo login works with **approved KYC**
- [ ] SOS / report flow + mini map / incident map usable
- [ ] Location / camera permission strings look correct

Rebuild civilian only if you need the latest maps-provider alignment or other uncommitted fixes.

### 3. Prepare App Store Connect listing (both apps)

For each app in ASC → **App Store** tab (version 1.0.0 or current):

| Item | Notes |
|------|--------|
| Name / subtitle | Civilian: RESQ-Link · Responder: RESQ Responder |
| Privacy Policy URL | Live URL (must load, not placeholder) |
| Category | Likely **Medical** or **Utilities** — pick one and stay consistent |
| Age rating | Complete questionnaire (location, emergencies → expect 12+/17+ as applicable) |
| Screenshots | iPhone 6.7" required (and others as prompted). Capture from TestFlight / Simulator Release |
| Description | Short “what it does” + who it’s for; mention it does **not** replace calling emergency services |
| Keywords | Keep short; no competitor trademark stuffing |
| Support URL | e.g. contact page on the public site |
| Marketing URL | Optional |
| Copyright | City / org legal name + year |
| App Review contact | Real phone + email you will answer |
| App Review notes | Paste from each app’s `APP_STORE_PRIVACY.md` |
| Demo account | Must work **before** you click Submit |

### 4. App Privacy questionnaire (both)

Use the tables in each `APP_STORE_PRIVACY.md`. Submit the nutrition labels **before** or with the first version.

### 5. Submit for App Review

Only after TestFlight smoke tests pass:

1. Select the processed build in the version page  
2. Paste review notes + demo credentials  
3. Answer export compliance (`ITSAppUsesNonExemptEncryption` already false in app config)  
4. **Submit for Review**

Order suggestion: **civilian first** (broader review surface / KYC), then **responder** (admin-provisioned accounts — call that out clearly in notes).

---

## Demo accounts (must work on review day)

Confirm in Firebase / Super Admin **before** submission. Prefer the values already pasted in each privacy doc if they differ from older notes.

| App | Purpose | Action |
|-----|---------|--------|
| Civilian | Reviewer login past KYC gate | Approve KYC in Super Admin; status `active` |
| Responder | Dispatcher / field login | User exists under dispatchers (or equivalent) and is active |

If Apple rejects for “could not sign in,” fix the demo user and reply in Resolution Center — do not rebuild unless they also need a binary fix.

---

## Build / submit commands (reference)

```bash
# Civilian
cd apps/civilian-mobile-app
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform ios --profile production
eas submit --platform ios --latest

# Responder
cd apps/responder-mobile-app
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform ios --profile production
eas submit --platform ios --latest
```

`EAS_SKIP_AUTO_FINGERPRINT=1` avoids the known fingerprint / `brace_expansion` failure on these projects (also set in responder `eas.json` production env).

---

## After approval

- [ ] Release manually or automatic as chosen in ASC  
- [ ] Smoke-test production App Store installs  
- [ ] Monitor Crashlytics / user reports for first 48h  
- [ ] Keep legal URLs and support contact monitored  

---

## Open decisions (resolve before submit if possible)

1. **Google Maps vs Apple Maps** — ship Apple Maps now; add `GOOGLE_MAPS_API_KEY` later if product requires Google tiles / styling.  
2. **Public vs unlisted** — responder may fit better as limited distribution if only city staff use it; confirm with stakeholders.  
3. **Screenshot set** — assign who captures 6.7" (and any required iPad) shots for each app.  

---

## Do not block submission on

- Perfect Google Maps styling  
- Android store listing (separate track)  
- Non-critical UI polish unrelated to review blockers  
