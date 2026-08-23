# Google Play Store — next steps (civilian app)

Plan: start with **Internal testing** (fastest “share a link → install from Play”), then move to closed/open testing or production when ready.

Parallel track: iOS uses **TestFlight**; Android uses **Play Internal testing**.

---

## App identity

| Field | Value |
|-------|--------|
| App name | RESQ-Link |
| Package name | `com.tuguegarao.resqlink` |
| Privacy policy | https://www.resq-link.com/privacy-policy |
| Demo account | `civilian@rescue.com` / `Test123` (status must be `active` in Super Admin KYC) |

---

## Phase 0 — One-time Play Console setup

Do this before the first upload.

1. Open [Google Play Console](https://play.google.com/console).
2. Create app → **RESQ-Link** (or select existing).
3. Confirm package name is exactly `com.tuguegarao.resqlink` (cannot change later).
4. Complete required dashboard items (even for Internal testing):
   - [ ] Privacy policy URL
   - [ ] App access (login required → provide demo credentials)
   - [ ] Ads declaration (likely **No**)
   - [ ] Content rating questionnaire
   - [ ] Target audience / age
   - [ ] News app / COVID / Data safety forms
   - [ ] Store listing draft (title, short description, icon, feature graphic, screenshots)

### Data safety (align with App Store privacy)

Declare collection of at least:

- Name, email, phone, address, user ID  
- Precise location  
- Photos / videos (KYC + incident attachments)  
- Other user content (reports)  
- Crash / diagnostics if Firebase Crashlytics is used  

Mark as **collected** and **linked to user** where applicable. Do **not** declare microphone (removed) or contacts use.

---

## Phase 1 — Build Android AAB (EAS)

From `apps/civilian-mobile-app`:

```bash
eas login
# Ensure Firebase / Maps secrets exist for production (same as iOS)
# ./scripts/sync-eas-firebase-env.sh   # if needed

eas build --platform android --profile production
```

- Output: **AAB** (Android App Bundle) — required by Play.
- Profile `production` uses `autoIncrement` for versionCode.

Download the AAB from the Expo build page when finished.

---

## Phase 2 — Internal testing (deadline onboard)

1. Play Console → **Testing → Internal testing**.
2. Create a new release → upload the AAB.
3. Release notes (example): `Initial internal build for pilot users.`
4. Save → review → **Roll out to Internal testing**.
5. **Testers** tab → create email list → add pilot users (up to ~100).
6. Copy the **opt-in / join link** and send to testers.

### Tester flow

1. Open the invite link on their Android phone.  
2. Accept to become a tester.  
3. Install **RESQ-Link** from the Play Store listing for the internal track.  
4. Sign in with their account (or demo account for reviewers).

Internal testing usually has **little or no full review delay** compared to closed/open/production — but Play Console setup forms must be complete first.

---

## Phase 3 — Optional: EAS Submit to Play

After Play app exists and a [Google Play service account](https://docs.expo.dev/submit/android/) is linked to EAS:

```bash
eas submit --platform android --latest --profile production
```

Add under `eas.json` → `submit.production.android` when ready (service account JSON path / EAS secret). Until then, manual AAB upload in Play Console is fine.

---

## Phase 4 — Later tracks (after Internal)

| Track | When to use | Review |
|-------|-------------|--------|
| **Internal** | Staff / pilot (now) | Usually fast / minimal |
| **Closed testing** | Larger invite-only beta | Yes — hours to days |
| **Open testing** | Public beta link | Yes |
| **Production** | Public launch | Yes — often 1–7+ days |

Promote a good Internal build → Closed or Production when ready; you do not need to rebuild unless you want a new versionCode.

---

## Checklist — before inviting testers

- [ ] Play app created with package `com.tuguegarao.resqlink`
- [ ] Privacy policy live
- [ ] Data safety + content rating completed
- [ ] Store listing has icon + screenshots (required fields satisfied)
- [ ] Production AAB built on EAS
- [ ] AAB uploaded to Internal testing and rolled out
- [ ] Tester emails added
- [ ] Opt-in link shared
- [ ] Demo / pilot accounts approved in Super Admin KYC if they must use the app fully

---

## Parallel with iOS

| Platform | Channel | Status goal |
|----------|---------|-------------|
| iOS | TestFlight | Civilian + Responder |
| Android | Play Internal testing | Civilian first; Responder package `com.tuguegarao.resqlink.responder` later |

Responder Android: same phases with package `com.tuguegarao.resqlink.responder` and a separate Play Console app listing.

---

## Useful links

- Play Console: https://play.google.com/console  
- EAS Build (Android): https://docs.expo.dev/build/setup/  
- EAS Submit (Android): https://docs.expo.dev/submit/android/  
- iOS privacy / review notes: `docs/APP_STORE_PRIVACY.md`  
- iOS release script: `scripts/release-ios.sh`

---

## Owner notes

- Prefer **Internal testing** for the Tuesday-style deadline; do not wait on Closed/Open review.  
- Keep versionName `1.0.0` (or current) and let EAS bump versionCode.  
- If install fails: confirm tester accepted the opt-in link while signed into the **same Google account** added to the tester list.
