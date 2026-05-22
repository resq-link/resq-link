# Account Creation Guide

This guide shows you how to create accounts for Users, Dispatchers, and Command Centers using the Firebase package.

## Prerequisites

1. **Firebase Project Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password and Phone)
   - Enable Firestore Database
   - Get your Firebase config

2. **Set Environment Variables**
   - See `README.md` for environment variable setup

3. **Build the Package**
   ```bash
   cd packages/firebase
   npm run build
   ```

---

## 1. Creating User (Citizen) Accounts

**Auth Type**: Phone Number Only

### Step-by-Step Process

1. **Send Verification Code**
2. **Verify Code and Create Profile**

### Example Implementation

```typescript
import { signInUserWithPhone, verifyPhoneCodeAndCreateProfile } from "@packages/firebase";

// Step 1: Send verification code
const phoneNumber = "+1234567890"; // Must be in E.164 format
const confirmationResult = await signInUserWithPhone(phoneNumber);

// Step 2: User enters the code they received via SMS
const code = "123456"; // Code from SMS

// Step 3: Verify code and create profile
const { user, accountData } = await verifyPhoneCodeAndCreateProfile(
  confirmationResult,
  code,
  "John Doe",        // Full name
  "123 Main St, City" // Address
);

console.log("User created:", accountData);
// Profile stored in Firestore: users/{userId}
```

### Firestore Structure

```
users/
  {userId}/
    phone: "+1234567890"
    fullName: "John Doe"
    address: "123 Main St, City"
    createdAt: Timestamp
```

---

## 2. Creating Dispatcher Accounts

**Auth Type**: Email + Password

**Available Roles**: `BFP`, `PNP`, `MDRRMO`, `AMBULANCE`, `PCG`

### Example Implementation

```typescript
import { createDispatcherAccount } from "@packages/firebase";

// Create BFP Dispatcher
const { user, accountData } = await createDispatcherAccount(
  "bfp@example.com",
  "password123",
  "BFP"
);

// Create PNP Dispatcher
await createDispatcherAccount(
  "pnp@example.com",
  "password123",
  "PNP"
);

// Create MDRRMO Dispatcher
await createDispatcherAccount(
  "mdrrmo@example.com",
  "password123",
  "MDRRMO"
);

// Create Ambulance Dispatcher
await createDispatcherAccount(
  "ambulance@example.com",
  "password123",
  "AMBULANCE"
);

// Create PCG Dispatcher
await createDispatcherAccount(
  "pcg@example.com",
  "password123",
  "PCG"
);
```

### Firestore Structure

```
dispatchers/
  {userId}/
    email: "bfp@example.com"
    role: "BFP" | "PNP" | "MDRRMO" | "AMBULANCE" | "PCG"
    createdAt: Timestamp
    active: true
```

### Login Dispatcher

```typescript
import { signInDispatcher } from "@packages/firebase";

const user = await signInDispatcher(
  "bfp@example.com",
  "password123"
);
```

---

## 3. Creating Command Center Accounts

**Auth Type**: Email + Password

### Example Implementation

```typescript
import { createCommandCenterAccount } from "@packages/firebase";

const { user, accountData } = await createCommandCenterAccount(
  "center@example.com",
  "password123",
  "Manila Command Center",
  "Manila, Philippines"
);
```

### Firestore Structure

```
commandCenters/
  {userId}/
    email: "center@example.com"
    name: "Manila Command Center"
    location: "Manila, Philippines"
    createdAt: Timestamp
```

### Login Command Center

```typescript
import { signInCommandCenter } from "@packages/firebase";

const user = await signInCommandCenter(
  "center@example.com",
  "password123"
);
```

---

## Complete Example Scripts

See the `scripts/` folder for ready-to-use scripts:
- `create-civilian-users.ts` - Civilian mobile app accounts (automatic)
- `create-standard-dispatchers-admin.ts` - Responder/dispatcher accounts
- `create-command-center.ts` - Command center accounts

---

## Testing Accounts

After creating accounts, you can test login:

### Test User Login
```typescript
import { signInUserWithPhone, verifyPhoneCode } from "@packages/firebase";

const confirmationResult = await signInUserWithPhone("+1234567890");
const user = await verifyPhoneCode(confirmationResult, "123456");
```

### Test Dispatcher Login
```typescript
import { signInDispatcher } from "@packages/firebase";

const user = await signInDispatcher("bfp@example.com", "password123");
```

### Test Command Center Login
```typescript
import { signInCommandCenter } from "@packages/firebase";

const user = await signInCommandCenter("center@example.com", "password123");
```

---

## Error Handling

All functions throw errors that should be caught:

```typescript
try {
  const { user, accountData } = await createDispatcherAccount(
    email,
    password,
    role
  );
  console.log("Success:", accountData);
} catch (error) {
  console.error("Error:", error.message);
  // Handle error (show to user, etc.)
}
```

Common errors:
- `auth/email-already-in-use` - Email already registered
- `auth/weak-password` - Password too weak
- `auth/invalid-phone-number` - Invalid phone format
- `auth/code-expired` - Verification code expired

---

## Next Steps

1. Integrate account creation into your app's registration screens
2. Add form validation
3. Add error handling and user feedback
4. Test with real Firebase project

