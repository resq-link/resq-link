# Change: Add operational messaging

## Why
Dispatchers and responders need a built-in communication channel tied to RESQ accounts so operational coordination does not rely on external apps.

## What Changes
- Add shared Firestore-backed chat threads and messages for dispatcher/responder communication.
- Add a floating messaging button to the dispatcher web app and responder mobile app.
- Allow dispatchers to create one-to-one responder chats and dispatcher-led group chats.
- Allow responders to participate only in chats that include at least one dispatcher or command-center account.
- Prevent responder-to-responder direct chats and responder-created responder-only groups.

## Impact
- Affected specs: `operational-messaging`
- Affected code: `packages/firebase/src/*`, `packages/firebase/firestore.rules`, `apps/dispatcher-web-app/components/*`, `apps/dispatcher-web-app/app/layout.tsx`, `apps/responder-mobile-app/src/app/_layout.jsx`, `apps/responder-mobile-app/src/modules/*`
