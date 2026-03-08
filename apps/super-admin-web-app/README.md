# RESQ-Link Super Admin

Web app for managing responder, civilian, and command center accounts. Uses Firebase Admin SDK for server-side account creation.

## Setup

1. **Copy environment variables** from `dispatcher-web-app/.env` or create `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Server-side only (for API routes)
GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json
# OR
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

2. **Create the first super admin** (run once):

```bash
cd packages/firebase
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=YourSecurePassword npx ts-node scripts/create-first-admin.ts
```

3. **Build the firebase package** (if not already built):

```bash
cd packages/firebase && npm run build
```

4. **Run the app**:

```bash
cd apps/super-admin-web-app
npm install
npm run dev
```

The app runs on http://localhost:3001 (different port from dispatcher).

## Features

- **Responders** – Create dispatcher/responder accounts (BFP, PNP, MDRRMO, AMBULANCE, PCG)
- **Civilians** – Create civilian user accounts with email/password
- **Command Centers** – Create command center accounts
