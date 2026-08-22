# App Store privacy & review checklist (responder app)

## Privacy Policy URL (required)

```
https://www.resq-link.com/privacy-policy
```

In-app: **Settings → Security** or **Settings → About → Privacy & Security**

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

## App Review Information (paste into Notes)

```
RESPONDER APP — ADMIN-PROVISIONED ACCOUNTS ONLY
There is no public registration. Accounts are created by dispatch administrators.

DEMO ACCOUNT:
  Email: [YOUR_REVIEWER_EMAIL]
  Password: [YOUR_REVIEWER_PASSWORD]
  Must exist in Firebase dispatchers collection with status active.

PERMISSIONS:
  - Location: live GPS share with dispatch when enabled; map navigation to incidents
  - Camera / Photo library: optional post-incident scene photos (PostReportModal)
  - Notifications: incident assignment alerts

Privacy policy: https://www.resq-link.com/privacy-policy

No in-app voice calling. Priority alerts use bundled alarm audio (expo-audio playback only).
```

## Before submission

1. Deploy web legal pages to production.
2. Create active dispatcher demo account in Firebase.
3. Run EAS/prebuild so camera, photo, and location strings apply.
4. Remove microphone from App Store Connect if previously declared.
