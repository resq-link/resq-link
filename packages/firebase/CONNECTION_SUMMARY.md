# Firebase Package Connection Summary

✅ **All three apps are now connected to the Firebase package!**

## What Was Done

1. ✅ Created `packages/firebase` package with Firebase initialization and auth functions
2. ✅ Added package dependency to all three apps:
   - `apps/civilian-mobile-app/package.json`
   - `apps/dispatcher-web-app/package.json`
   - `apps/responder-mobile-app/package.json`
3. ✅ Installed packages in all three apps
4. ✅ Created integration guides for each app

## Package Structure

```
packages/firebase/
├── src/
│   ├── config.ts          # Firebase initialization
│   ├── auth.ts            # Authentication functions
│   └── index.ts           # Main exports
├── dist/                  # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
└── README.md
```

## Available Exports

All apps can now import:

```typescript
import {
  auth, // Firebase Auth instance
  firestore, // Firestore instance
  createDispatcherAccount, // Create dispatcher account
  createCommandCenterAccount, // Create command center account
  signInUserWithPhone, // Phone auth for users
  verifyPhoneCodeAndCreateProfile, // Verify phone code
  signInDispatcher, // Login dispatcher
  signInCommandCenter, // Login command center
} from "@packages/firebase";
```

## Next Steps

### 1. Set Environment Variables

**For Expo apps (civilian-mobile-app, responder-mobile-app):**
Create `.env` file:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**For Next.js (dispatcher-web-app):**
Create `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. Rebuild Firebase Package (if needed)

If you make changes to the Firebase package:

```bash
cd packages/firebase
npm run build
```

### 3. Integration Guides

See the integration guides in each app:

- `apps/civilian-mobile-app/FIREBASE_INTEGRATION.md`
- `apps/dispatcher-web-app/FIREBASE_INTEGRATION.md`

## Usage by App Type

### Mobile App (User/Citizen)

- **Auth Type**: Phone number
- **Functions**: `signInUserWithPhone`, `verifyPhoneCodeAndCreateProfile`
- **Firestore Path**: `users/{id}`

### Dispatcher Mobile App

- **Auth Type**: Email + Password
- **Functions**: `createDispatcherAccount`, `signInDispatcher`
- **Firestore Path**: `dispatchers/{id}`
- **Roles**: BFP, PNP, MDRRMO, AMBULANCE, PCG

### Command Center Web

- **Auth Type**: Email + Password
- **Functions**: `createCommandCenterAccount`, `signInCommandCenter`
- **Firestore Path**: `commandCenters/{id}`

## Testing

After setting up environment variables, you can test the integration:

1. **Mobile App**: Test phone authentication
2. **Dispatcher App**: Test email/password authentication
3. **Command Center**: Test email/password authentication

All authentication will create/update profiles in Firestore automatically.
