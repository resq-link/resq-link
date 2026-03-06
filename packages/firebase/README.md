# @packages/firebase

Shared Firebase package for RESCUE mobile applications.

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Quick guide to create accounts (Start here!)
- **[CREATE_IN_FIREBASE_CONSOLE.md](./CREATE_IN_FIREBASE_CONSOLE.md)** - Create accounts in Firebase Console (No scripts needed!)
- **[CONSOLE_QUICK_REFERENCE.md](./CONSOLE_QUICK_REFERENCE.md)** - Quick reference for Firebase Console
- **[ACCOUNT_CREATION_GUIDE.md](./ACCOUNT_CREATION_GUIDE.md)** - Detailed account creation guide
- **[EXAMPLES.md](./EXAMPLES.md)** - Code examples for each app
- **[scripts/README.md](./scripts/README.md)** - Scripts for creating test accounts
- **[ENV_SETUP.md](./ENV_SETUP.md)** - Environment variables setup guide
- **[FIRESTORE_SECURITY_RULES.md](./FIRESTORE_SECURITY_RULES.md)** - ⚠️ **IMPORTANT**: Firestore security rules setup guide

## Installation

This package is used by:

- `apps/dispatcher-web-app` (Next.js)
- `apps/civilian-mobile-app` (Expo/React Native)
- `apps/responder-mobile-app` (Expo/React Native)

### Adding to your app

Since this is a local package, add it to each app's `package.json`:

**For apps/dispatcher-web-app:**

```json
{
  "dependencies": {
    "@packages/firebase": "file:../../packages/firebase"
  }
}
```

**For apps/civilian-mobile-app:**

```json
{
  "dependencies": {
    "@packages/firebase": "file:../../packages/firebase"
  }
}
```

**For apps/responder-mobile-app:**

```json
{
  "dependencies": {
    "@packages/firebase": "file:../../packages/firebase"
  }
}
```

Then run `npm install` in each app directory.

## Setup

1. Install dependencies:

```bash
cd packages/firebase
npm install
```

2. Build the package:

```bash
npm run build
```

3. Configure environment variables in each app:

### For Next.js (apps/dispatcher-web-app):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### For Expo apps (apps/civilian-mobile-app, apps/responder-mobile-app):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Usage

### Import in your app:

```typescript
import {
  auth,
  firestore,
  createDispatcherAccount,
  createCommandCenterAccount,
  signInUserWithPhone,
} from "@packages/firebase";
```

### Create Dispatcher Account:

```typescript
import { createDispatcherAccount } from "@packages/firebase";

const { user, accountData } = await createDispatcherAccount(
  "dispatcher@example.com",
  "password123",
  "BFP",
);
```

### Create Command Center Account:

```typescript
import { createCommandCenterAccount } from "@packages/firebase";

const { user, accountData } = await createCommandCenterAccount(
  "center@example.com",
  "password123",
  "Main Command Center",
  "Manila, Philippines",
);
```

### Sign In User with Phone:

```typescript
import {
  signInUserWithPhone,
  verifyPhoneCodeAndCreateProfile,
} from "@packages/firebase";

// Step 1: Send verification code
const { verificationId } = await signInUserWithPhone("+1234567890");

// Step 2: Verify code and create profile
const { user, accountData } = await verifyPhoneCodeAndCreateProfile(
  verificationId,
  "123456", // code from SMS
  "John Doe",
  "123 Main St, City",
);
```

## Firestore Collections

- `dispatchers/{id}` - Dispatcher accounts
- `users/{id}` - User (citizen) accounts
- `commandCenters/{id}` - Command center accounts
- `emergencies/{id}` - Emergency reports

## 🔒 Security Rules Setup

**⚠️ IMPORTANT**: Before using the app, you must set up Firestore security rules!

1. **Read the guide**: See **[FIRESTORE_SECURITY_RULES.md](./FIRESTORE_SECURITY_RULES.md)**
2. **Deploy rules**: Copy `firestore.rules` to Firebase Console → Firestore → Rules
3. **Publish**: Click "Publish" to activate the rules

Without proper security rules, you'll get "Missing insufficient permissions" errors when trying to create emergency reports.
