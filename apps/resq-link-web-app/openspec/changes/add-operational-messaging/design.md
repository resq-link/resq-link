## Context
The shared Firebase package already exposes dispatcher accounts, responder presence, and Firestore APIs consumed by both the dispatcher web app and responder mobile app. Messaging should reuse these account records instead of creating a separate identity system.

## Goals
- Provide real-time text messaging between dispatchers and responders.
- Let dispatchers start direct chats with responders and create group chats.
- Let responders reply in assigned chats and start chats with dispatchers/command-center users.
- Block responder-to-responder direct chats and responder-only groups.
- Keep the entry point lightweight with a bottom-right floating button in both apps.

## Non-Goals
- End-to-end encryption.
- File attachments, voice notes, message reactions, read receipts, or push notifications in the first version.
- Incident-specific automatic chat creation.

## Decisions
- Store chat threads in `chatThreads` and messages in `chatThreads/{threadId}/messages`.
- Store normalized participant ids and participant roles on each thread for rules and querying.
- Treat command-center and dispatcher accounts as dispatcher-side operators for messaging permissions.
- Use Firestore `onSnapshot` subscriptions for real-time updates.
- Render messaging as an overlay/drawer component instead of adding a primary navigation tab.

## Data Model
- `chatThreads/{threadId}`
  - `type`: `direct` or `group`
  - `title`: nullable display title for group chats
  - `participantIds`: array of account UIDs
  - `participantRoles`: map of UID to `dispatcher`, `command_center`, or `responder`
  - `createdByUserId`
  - `lastMessageText`, `lastMessageAt`, `createdAt`, `updatedAt`
- `chatThreads/{threadId}/messages/{messageId}`
  - `senderId`
  - `senderName`
  - `text`
  - `createdAt`

## Risks / Trade-offs
- Firestore rules cannot fully validate every participant profile without careful helper functions. Mitigation: validate in client APIs and duplicate the critical responder-only block in rules.
- Group membership changes can become complex. Mitigation: first version supports creation-time membership only.
- Mobile UI space is limited. Mitigation: floating button opens a full-height modal panel on responder mobile.

## Open Questions
- Should command-center accounts appear separately from dispatcher accounts in the dispatcher chat composer, or should they be hidden from the first release?
- Should group chats be reusable operational channels, or should each group be ad hoc per event/shift?
