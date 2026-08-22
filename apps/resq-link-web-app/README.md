# RESQ-LINK Web

Unified Next.js application for the RESQ-LINK Emergency Response System.

One app, one login, one port, two protected workspaces:

- `/login` — shared, role-neutral sign-in
- `/command-center/*` — emergency operations
- `/admin/*` — platform administration

## Getting Started

```bash
cd apps/resq-link-web-app
npm install
```

Copy `.env.example` to `.env.local` and fill in Firebase, Mapbox, Agora, Gemini, and Resend values.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

From the repo root you can also run:

```bash
npm run dev:web
```

## Workspaces

| Path | Who | After login |
| ---- | --- | ----------- |
| `/command-center/overview` | `commandCenters/{uid}` | Command Center |
| `/admin/dashboard` | `admins/{uid}` | Platform Administration |
| `/access-denied` | any other Firebase account | Access restricted |

Firebase Authentication alone does not grant access. After sign-in the server resolves the UID against Firestore and sets the workspace.

Command-center realtime providers (incidents, map, Agora, Gemini) mount only under `/command-center/*`. Super Admin does not inherit that runtime.

## Canonical routes

**Command Center**

- `/command-center/overview`
- `/command-center/map`
- `/command-center/intake`
- `/command-center/sms`
- `/command-center/incidents`
- `/command-center/footage-requests`
- `/command-center/resources`
- `/command-center/teams`
- `/command-center/incident-management`
- `/command-center/report`
- `/command-center/history`

**Super Admin**

- `/admin/dashboard`
- `/admin/dispatchers`
- `/admin/responders`
- `/admin/civilians`
- `/admin/command-centers`
- `/admin/kyc`
- `/admin/audit`

Legacy dispatcher URLs such as `/overview` and `/intake` temporarily redirect to `/command-center/*`.

## Mobile API compatibility

Civilian OTP and password-reset clients still call:

- `/api/email-otp/send`
- `/api/email-otp/verify`
- `/api/auth/forgot-password/send`
- `/api/auth/forgot-password/reset`

Responder voice calls still use `/api/agora/token`. Namespaced aliases also exist under `/api/admin/*`, `/api/command-center/*`, and `/api/public/*`.
