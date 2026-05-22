# Change: Add incident management intake

## Why
The dispatcher web app currently uses a mock intake screen and does not apply the command center's incident routing guidance. The incident module needs a real Firestore-backed flow that applies the SPUP incident taxonomy and advisory agency recommendations.

## What Changes
- Add shared incident-management types and Firestore APIs in the Firebase package.
- Replace the dispatcher intake mock screen with a live incident intake and dispatch surface.
- Suggest agency routing from the SPUP incident subtype catalog without limiting dispatcher choice.
- Leave `teamId` and `teamName` nullable so a future teams module can attach cleanly.

## Impact
- Affected specs: `incident-management`
- Affected code: `packages/firebase/src/incidents.ts`, `packages/firebase/src/index.ts`, `apps/dispatcher-web-app/app/intake/page.tsx`
