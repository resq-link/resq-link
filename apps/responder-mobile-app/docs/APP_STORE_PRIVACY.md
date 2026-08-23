# App Store privacy & review checklist (responder app)

Use for **App Store Connect → App Privacy** and **TestFlight / App Review** notes.

## Privacy Policy URL (required)

```
https://www.resq-link.com/privacy-policy
```

In-app: **Settings → Security** or **Settings → About → Privacy & Security**

## Identity

| Field | Value |
|-------|--------|
| App name | RESQ-Link Responder |
| Bundle ID | `com.tuguegarao.resqlink.responder` |
| ASC App ID | `6804334951` |
| EAS project | `12355ad0-d170-4727-9799-dba31b6d403b` |

## App Privacy nutrition labels (recommended)

| Data type | Collected | Linked | Tracking | Purposes |
|-----------|-----------|--------|----------|----------|
| Email address | Yes | Yes | No | App functionality |
| User ID | Yes | Yes | No | App functionality |
| Precise location | Yes (when live share on) | Yes | No | App functionality |
| Photos or videos | Yes | Yes | No | App functionality (post-report) |
| Other user content | Yes | Yes | No | App functionality (chat, reports) |
| Crash / performance data | Yes | Yes* | No | Analytics, app functionality |

**Do not declare microphone** — voice calling was removed. Alarm playback uses bundled audio, not the microphone.

## App Review / TestFlight Information (paste into Notes)

```
RESPONDER APP — ADMIN-PROVISIONED ACCOUNTS ONLY
There is no public registration. Accounts are created by Super Admin / command center.

DEMO ACCOUNT:
  Email: bfp@rescue.ph
  Password: BFP2024!
  Must exist in Firebase dispatchers/{uid} with status active.
  Seed: packages/firebase scripts (create-standard-dispatchers-admin.ts)

PERMISSIONS:
  - Location: live GPS share with dispatch when enabled; map navigation to incidents
  - Camera / Photo library: optional post-incident scene photos
  - Notifications: incident assignment / priority alerts

Privacy policy: https://www.resq-link.com/privacy-policy

No in-app voice calling. Priority alerts use bundled alarm audio (playback only).
```

## TestFlight path (before public App Store)

1. Create the App Store Connect app for `com.tuguegarao.resqlink.responder` (if missing).
2. Sync EAS secrets: `./scripts/sync-eas-firebase-env.sh`
3. Build + submit: `./scripts/release-ios.sh`
4. Wait for build processing in **TestFlight**.
5. Add **Internal Testers** (fastest — no Beta App Review).
6. Optional: External TestFlight group → Beta App Review (uses notes above).

## Before full App Store submission

1. Confirm web privacy policy is live.
2. Confirm demo dispatcher account is active.
3. Complete App Privacy questionnaire.
4. Screenshots for required device sizes.
5. Submit for App Review when ready for public launch.
