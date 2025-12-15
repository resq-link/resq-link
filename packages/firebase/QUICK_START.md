# Quick Start: Creating Accounts

This guide will help you quickly create accounts for Users, Dispatchers, and Command Centers.

## Step 1: Setup Firebase

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Follow the setup wizard

2. **Enable Authentication**
   - In Firebase Console, go to **Authentication** → **Get Started**
   - Enable **Email/Password** provider
   - Enable **Phone** provider

3. **Enable Firestore**
   - Go to **Firestore Database** → **Create database**
   - Start in **test mode** (for development)
   - Choose a location

4. **Get Your Config**
   - Go to **Project Settings** (gear icon)
   - Scroll to "Your apps"
   - Click the web icon (`</>`) to add a web app
   - Copy the `firebaseConfig` object

## Step 2: Set Environment Variables

### For Scripts (packages/firebase)

Create `.env` file in `packages/firebase/`:

```env
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

**Note:** 
- Scripts support `FIREBASE_*` prefix (recommended for scripts)
- Also supports `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` prefixes
- See `ENV_SETUP.md` for detailed instructions

## Step 3: Install Dependencies

```bash
cd packages/firebase
npm install
npm run build
```

## Step 4: Create Accounts

### Option A: Using Scripts (Recommended for Testing)

#### Create All Dispatcher Accounts

```bash
npx ts-node scripts/create-dispatcher-accounts.ts
```

This creates:
- ✅ BFP Dispatcher (`bfp@rescue.ph`)
- ✅ PNP Dispatcher (`pnp@rescue.ph`)
- ✅ MDRRMO Dispatcher (`mdrrmo@rescue.ph`)
- ✅ Ambulance Dispatcher (`ambulance@rescue.ph`)
- ✅ PCG Dispatcher (`pcg@rescue.ph`)

#### Create Command Center Accounts

```bash
npx ts-node scripts/create-command-center.ts
```

This creates:
- ✅ Manila Command Center (`manila@commandcenter.ph`)
- ✅ Quezon City Command Center (`quezon@commandcenter.ph`)
- ✅ Makati Command Center (`makati@commandcenter.ph`)

#### Create User Account (Interactive)

```bash
npx ts-node scripts/create-user-account.ts
```

Follow the prompts:
1. Enter phone number (E.164 format: `+1234567890`)
2. Enter full name
3. Enter address
4. Enter verification code from SMS

### Option B: Using Code in Your Apps

See `ACCOUNT_CREATION_GUIDE.md` for detailed code examples.

## Step 5: Verify in Firebase Console

1. **Check Authentication**
   - Go to **Authentication** → **Users**
   - You should see all created accounts

2. **Check Firestore**
   - Go to **Firestore Database**
   - Check collections:
     - `dispatchers/` - Dispatcher accounts
     - `commandCenters/` - Command center accounts
     - `users/` - User accounts

## Default Credentials

### Dispatchers

| Role | Email | Password |
|------|-------|----------|
| BFP | `bfp@rescue.ph` | `BFP2024!` |
| PNP | `pnp@rescue.ph` | `PNP2024!` |
| MDRRMO | `mdrrmo@rescue.ph` | `MDRRMO2024!` |
| Ambulance | `ambulance@rescue.ph` | `AMBULANCE2024!` |
| PCG | `pcg@rescue.ph` | `PCG2024!` |

### Command Centers

| Name | Email | Password |
|------|-------|----------|
| Manila | `manila@commandcenter.ph` | `Manila2024!` |
| Quezon City | `quezon@commandcenter.ph` | `Quezon2024!` |
| Makati | `makati@commandcenter.ph` | `Makati2024!` |

## Testing Login

### Test Dispatcher Login

```typescript
import { signInDispatcher } from "@packages/firebase";

const user = await signInDispatcher("bfp@rescue.ph", "BFP2024!");
console.log("Logged in:", user.uid);
```

### Test Command Center Login

```typescript
import { signInCommandCenter } from "@packages/firebase";

const user = await signInCommandCenter("manila@commandcenter.ph", "Manila2024!");
console.log("Logged in:", user.uid);
```

### Test User Login

```typescript
import { signInUserWithPhone, verifyPhoneCode } from "@packages/firebase";

// Step 1: Send code
const confirmationResult = await signInUserWithPhone("+1234567890");

// Step 2: Verify code
const user = await verifyPhoneCode(confirmationResult, "123456");
console.log("Logged in:", user.uid);
```

## Troubleshooting

### "Cannot find module '@packages/firebase'"
- Make sure you've run `npm install` in the app directory
- Make sure the Firebase package is built: `cd packages/firebase && npm run build`

### "Email already in use"
- Account already exists, skip or use different email

### "Invalid phone number"
- Phone must be in E.164 format: `+[country code][number]`
- Example: `+639123456789` (Philippines), `+1234567890` (US)

### "Code expired"
- Verification codes expire after a few minutes
- Request a new code

### Scripts not working
- Make sure environment variables are set
- Make sure `npm run build` was run in `packages/firebase`
- Install ts-node: `npm install -g ts-node` or `npm install --save-dev ts-node`

## Next Steps

1. ✅ Accounts created
2. ✅ Test login in your apps
3. ✅ Integrate into your app's UI
4. ✅ Set up proper error handling
5. ✅ Add form validation

See `ACCOUNT_CREATION_GUIDE.md` for more detailed examples.

