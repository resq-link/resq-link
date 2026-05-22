# Agora Voice Calling Setup

ResQ Link uses Agora only for app-to-app incident voice calls. Twilio/SMS/report submission remains the fallback path when token generation or channel join fails.

## What This Adds

- Civilians can start an incident voice call from an active emergency confirmation screen.
- Dispatchers can see and answer active `callSessions` from the intake workspace.
- Responders can receive assigned incident calls from the responder dashboard.
- Shared Firebase helpers track call lifecycle states: `ringing`, `accepted`, `connected`, `ended`, `missed`, and `failed`.
- Firestore rules include the `callSessions` collection used by mobile and dispatcher clients.

## Environment

Mobile public config:

```bash
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
EXPO_PUBLIC_API_URL=http://your-dispatcher-api-host:4000
```

Dispatcher API server-only config:

```bash
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
AGORA_TOKEN_TTL_SECONDS=3600
```

Never put `AGORA_APP_CERTIFICATE` in either mobile app or any `EXPO_PUBLIC_` variable.

## Runtime Notes

`react-native-agora` uses native SDKs, so Expo Go is not enough. Build and test with Expo development builds, prebuild, or EAS.

The token endpoint is `POST /api/agora/token` in `apps/dispatcher-web-app`. It requires a Firebase ID token and accepts an `incidentId` plus `channelName`. Channel names must be `incident_{incidentId}`.

The dispatcher web app also listens for active `callSessions` and can answer civilian calls in the browser with `agora-rtc-sdk-ng`. Browser microphone access requires a secure context; `localhost` is allowed for local testing, while LAN/IP testing may require HTTPS depending on the browser.

Call session documents are stored in Firestore `callSessions`. Firestore rules should allow civilians to create/read their own call sessions and responders to read/update only sessions assigned to their uid/team.

## Implementation Map

- `apps/dispatcher-web-app/app/api/agora/token/route.ts` generates short-lived RTC tokens after verifying the Firebase ID token.
- `packages/firebase/src/callSessions.ts` owns channel naming, session creation, lifecycle updates, and subscriptions.
- `apps/civilian-mobile-app/src/hooks/useAgoraVoiceCall.js` and `src/services/agoraVoice.js` join mobile users to the Agora channel.
- `apps/civilian-mobile-app/src/app/calling.jsx` provides the in-call screen.
- `apps/dispatcher-web-app/components/IncidentCallNotification.tsx` handles incoming active call sessions in the dispatcher UI.
- `apps/responder-mobile-app/src/modules/calls/components/ResponderCallPanel.jsx` surfaces assigned incoming calls to responders.

## Local Verification

1. Set the environment variables above for the dispatcher app and both Expo apps.
2. Start `apps/dispatcher-web-app` so mobile token requests can reach `/api/agora/token`.
3. Use development builds for the mobile apps because `react-native-agora` requires native code.
4. Create or open an incident as a signed-in civilian, then start a voice call.
5. Confirm a `callSessions` document is created with `status: ringing` and `channelName: incident_{incidentId}`.
6. Answer from dispatcher intake or the assigned responder dashboard and confirm the status moves through `accepted` to `connected`.
7. End or decline the call and confirm the final status is `ended` or `missed`.
