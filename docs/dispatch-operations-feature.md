# Dispatch Operations Feature Notes

## Summary

This branch adds the dispatch operations work for responder-bound resources, operational messaging, intake recovery, and super-admin account separation.

## Scope

- Resources can be bound to a primary responder and crew responders.
- Available dispatch matching now requires a bound active responder or agency account.
- Dispatching a resource stores the resource and bound responder ids on the incident so responder tracking follows the user tied to the vehicle.
- Incident lifecycle updates keep linked resources in sync across assigned, en route, on scene, and resolved states.
- Dispatcher and responder apps include a floating operational messaging widget.
- Dispatchers can start group chats and direct chats with responders.
- Responders can chat with dispatchers, but responder-to-responder chat creation is blocked.
- Intake now rolls back a newly created incident if dispatch validation fails.
- Stuck `awaiting_resources` intake incidents can be dispatched or removed from the detail panel.
- Super-admin dispatcher and responder account creation flows are separated.
- Firestore rules include the required access for messaging, dispatch ledgers, intake cleanup, and incident rule management.

## Verification

Run these checks from the repository root:

```bash
npm run build --prefix packages/firebase
npx tsc --noEmit --incremental false --project apps/dispatcher-web-app/tsconfig.json
npm run build --prefix apps/dispatcher-web-app
npm run build --prefix apps/super-admin-web-app
```

Responder web export can be checked from `apps/responder-mobile-app`:

```bash
npx expo export --platform web --output-dir dist-test
```

Remove the generated `dist-test` output after verification.
