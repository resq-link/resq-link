# RESQ-Link Cloud Functions

Server-side push alerts for responder incident assignments.

| Function | Trigger | Purpose |
|----------|---------|---------|
| `onIncidentAssigned` | Firestore update on `incidents/{id}` | Alerts responders newly added to `assignedResourceIds` |
| `resendUnacknowledgedAlerts` | Schedule, every 1 min | Re-alerts responders who have not acknowledged yet |

Both run in `asia-southeast1`.

## How the alert works

1. A dispatcher dispatches resources; `dispatchIncidentResources` merges the
   bound responder uids into the incident's `assignedResourceIds`.
2. `onIncidentAssigned` diffs that array, loads each responder's Expo tokens
   from `dispatchers/{uid}.pushTokens`, and sends a high-priority push.
3. The responder app plays a looping alarm and shows a blocking acknowledge
   sheet. Acknowledging writes the responder's uid into
   `responderAlertAcknowledgedBy` on the incident.
4. Until that happens, `resendUnacknowledgedAlerts` keeps re-sending, up to
   `REMINDER_WINDOW_MINUTES` (20) after the last alert.

Only `critical` and `high` incidents trigger a push. Dead tokens are pruned
automatically when Expo reports `DeviceNotRegistered`.

## Platform behaviour

**Android** gets a genuine alarm: the `incident-alerts` channel is MAX
importance, carries the bundled `incident_alarm.wav`, vibrates, and bypasses Do
Not Disturb.

**iOS cannot loop a sound from a remote push** without Apple's Critical Alerts
entitlement, which must be requested and justified. Instead the push uses
`interruptionLevel: "time-sensitive"` (breaks through Focus, no entitlement
needed) and the once-a-minute reminder stands in for a repeating alarm. The
continuous loop only runs once the app is open. One minute is Cloud Scheduler's
floor — a faster cadence would need a self-rescheduling Cloud Task.

## Prerequisites before this will actually deliver

These are **not** configured in this repo yet:

1. **Blaze plan.** Cloud Functions v2 and Cloud Scheduler both require it.
2. **Android / FCM.** There is no `google-services.json` in the repo. Add the
   Firebase Android app, download it, and upload an **FCM V1 service account
   key** to Expo (`eas credentials`). Without this, Android push silently fails.
3. **iOS / APNs.** An APNs key must be registered with Expo, also via
   `eas credentials`.
4. **A development or production build.** Expo Go dropped remote push support
   in SDK 53 — `registerForIncidentPush` returns `null` there. Use
   `eas build --profile development`.

The app degrades safely if these are missing: registration returns `null`, no
push is sent, and the in-app alarm still fires whenever the app is open.

## Deploy

```bash
cd functions
npm install
npm run build

firebase use <project-id>        # once
firebase deploy --only functions
```

Watch it work:

```bash
firebase functions:log --only onIncidentAssigned
```

## Local development

```bash
npm run serve      # functions emulator on :5001
```

The scheduled function does not fire on a timer in the emulator; invoke it
manually from the emulator UI.

## Tuning

Both constants are at the top of `src/index.ts`:

- `REMINDER_WINDOW_MINUTES` (20) — how long reminders keep going. Deliberately
  bounded: "until acknowledged" would otherwise hammer a phone that is switched
  off indefinitely and burn quota. Past this window the incident is left for the
  dispatcher to reassign.
- `ALARM_PRIORITIES` — which priorities warrant waking a phone.
