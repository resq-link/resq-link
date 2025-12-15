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

## Installation

This package is used by:
- `command-center-web` (Next.js)
- `apps/mobile` (Expo/React Native)
- `Dispatcher_mobileapp` (Expo/React Native)

### Adding to your app

Since this is a local package, add it to each app's `package.json`:

**For command-center-web:**
```json
{
  "dependencies": {
    "@packages/firebase": "file:../packages/firebase"
  }
}
```

**For apps/mobile:**
```json
{
  "dependencies": {
    "@packages/firebase": "file:../../packages/firebase"
  }
}
```

**For Dispatcher_mobileapp:**
```json
{
  "dependencies": {
    "@packages/firebase": "file:../packages/firebase"
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

### For Next.js (command-center-web):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### For Expo apps (mobile, Dispatcher_mobileapp):
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
  signInUserWithPhone 
} from "@packages/firebase";
```

### Create Dispatcher Account:

```typescript
import { createDispatcherAccount } from "@packages/firebase";

const { user, accountData } = await createDispatcherAccount(
  "dispatcher@example.com",
  "password123",
  "BFP"
);
```

### Create Command Center Account:

```typescript
import { createCommandCenterAccount } from "@packages/firebase";

const { user, accountData } = await createCommandCenterAccount(
  "center@example.com",
  "password123",
  "Main Command Center",
  "Manila, Philippines"
);
```

### Sign In User with Phone:

```typescript
import { signInUserWithPhone, verifyPhoneCodeAndCreateProfile } from "@packages/firebase";

// Step 1: Send verification code
const { verificationId } = await signInUserWithPhone("+1234567890");

// Step 2: Verify code and create profile
const { user, accountData } = await verifyPhoneCodeAndCreateProfile(
  verificationId,
  "123456", // code from SMS
  "John Doe",
  "123 Main St, City"
);
```

## Firestore Collections

- `dispatchers/{id}` - Dispatcher accounts
- `users/{id}` - User (citizen) accounts
- `commandCenters/{id}` - Command center accounts

