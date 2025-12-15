# Creating Accounts in Firebase Console

This guide shows you how to create User, Dispatcher, and Command Center accounts directly in the Firebase Console.

---

## 📋 Overview

You'll need to:
1. **Create Authentication accounts** in Firebase Console
2. **Add Firestore documents** for each account type

---

## 1. Creating User Accounts (Phone Authentication)

### Step 1: Enable Phone Authentication

1. Go to Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Phone** provider
3. Click **Save**

### Step 2: Add Test Phone Numbers (Optional - for testing)

1. Go to **Authentication** → **Sign-in method** → **Phone**
2. Click **Phone numbers for testing**
3. Add test numbers (e.g., `+1234567890` with code `123456`)
4. Click **Save**

### Step 3: Create User via Phone Auth

**Note:** Phone authentication requires SMS verification, so you'll need to:
- Use your app to sign in with phone number
- Or use the Firebase Console to add test numbers

**After user signs in via phone:**
1. Go to **Authentication** → **Users**
2. You'll see the user with their phone number
3. Copy the **User UID**

### Step 4: Add Firestore Document

1. Go to **Firestore Database**
2. Click **Start collection** (if first time) or navigate to `users` collection
3. Click **Add document**
4. **Document ID**: Use the User UID from Authentication
5. **Fields**:
   ```
   phone: string → "+1234567890"
   fullName: string → "John Doe"
   address: string → "123 Main St, City"
   createdAt: timestamp → (current timestamp)
   ```
6. Click **Save**

---

## 2. Creating Dispatcher Accounts (Email/Password)

### Step 1: Enable Email/Password Authentication

1. Go to Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Click **Save**

### Step 2: Create Dispatcher Accounts

1. Go to **Authentication** → **Users**
2. Click **Add user** (or the **+** button)
3. **Email**: Enter email (e.g., `bfp@rescue.ph`)
4. **Password**: Enter password (e.g., `BFP2024!`)
5. Click **Add user**
6. **Copy the User UID** (you'll need this for Firestore)

### Step 3: Create All 5 Dispatcher Types

Repeat Step 2 for each dispatcher type:

| Role | Email | Password | User UID (copy this) |
|------|-------|----------|---------------------|
| BFP | `bfp@rescue.ph` | `BFP2024!` | (copy after creation) |
| PNP | `pnp@rescue.ph` | `PNP2024!` | (copy after creation) |
| MDRRMO | `mdrrmo@rescue.ph` | `MDRRMO2024!` | (copy after creation) |
| AMBULANCE | `ambulance@rescue.ph` | `AMBULANCE2024!` | (copy after creation) |
| PCG | `pcg@rescue.ph` | `PCG2024!` | (copy after creation) |

### Step 4: Add Firestore Documents for Dispatchers

1. Go to **Firestore Database**
2. Click **Start collection** (if first time) or navigate to `dispatchers` collection
3. For each dispatcher:

   **Click "Add document"**
   - **Document ID**: Use the User UID from Authentication
   - **Fields**:
     ```
     email: string → "bfp@rescue.ph"
     role: string → "BFP" (or "PNP", "MDRRMO", "AMBULANCE", "PCG")
     createdAt: timestamp → (current timestamp)
     active: boolean → true
     ```
   - Click **Save**

4. Repeat for all 5 dispatcher types

---

## 3. Creating Command Center Accounts (Email/Password)

### Step 1: Create Command Center Accounts

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. **Email**: Enter email (e.g., `manila@commandcenter.ph`)
4. **Password**: Enter password (e.g., `Manila2024!`)
5. Click **Add user**
6. **Copy the User UID**

### Step 2: Create Multiple Command Centers

Repeat for each command center:

| Name | Email | Password | User UID (copy this) |
|------|-------|----------|---------------------|
| Manila | `manila@commandcenter.ph` | `Manila2024!` | (copy after creation) |
| Quezon City | `quezon@commandcenter.ph` | `Quezon2024!` | (copy after creation) |
| Makati | `makati@commandcenter.ph` | `Makati2024!` | (copy after creation) |

### Step 3: Add Firestore Documents for Command Centers

1. Go to **Firestore Database**
2. Navigate to `commandCenters` collection (or create it)
3. For each command center:

   **Click "Add document"**
   - **Document ID**: Use the User UID from Authentication
   - **Fields**:
     ```
     email: string → "manila@commandcenter.ph"
     name: string → "Manila Command Center"
     location: string → "Manila, Philippines"
     createdAt: timestamp → (current timestamp)
     ```
   - Click **Save**

4. Repeat for all command centers

---

## 📊 Quick Reference: Firestore Structure

### Users Collection (`users/{userId}`)
```
phone: string
fullName: string
address: string
createdAt: timestamp
```

### Dispatchers Collection (`dispatchers/{userId}`)
```
email: string
role: string (BFP, PNP, MDRRMO, AMBULANCE, PCG)
createdAt: timestamp
active: boolean (true)
```

### Command Centers Collection (`commandCenters/{userId}`)
```
email: string
name: string
location: string
createdAt: timestamp
```

---

## ✅ Verification Checklist

After creating accounts, verify:

- [ ] **Authentication → Users**: All accounts listed
- [ ] **Firestore → users/**: User documents created
- [ ] **Firestore → dispatchers/**: 5 dispatcher documents created
- [ ] **Firestore → commandCenters/**: Command center documents created
- [ ] All Firestore documents use the correct User UID as document ID
- [ ] All required fields are present in each document

---

## 🧪 Testing Accounts

### Test Dispatcher Login

In your app:
```typescript
import { signInDispatcher } from "@packages/firebase";

const user = await signInDispatcher("bfp@rescue.ph", "BFP2024!");
```

### Test Command Center Login

```typescript
import { signInCommandCenter } from "@packages/firebase";

const user = await signInCommandCenter("manila@commandcenter.ph", "Manila2024!");
```

### Test User Login

```typescript
import { signInUserWithPhone, verifyPhoneCode } from "@packages/firebase";

const confirmationResult = await signInUserWithPhone("+1234567890");
const user = await verifyPhoneCode(confirmationResult, "123456");
```

---

## 💡 Tips

1. **User UID is Important**: Always use the User UID from Authentication as the Firestore document ID
2. **Copy UIDs**: Keep a note of User UIDs when creating accounts
3. **Batch Creation**: You can create multiple auth accounts first, then add all Firestore documents
4. **Test Mode**: Firestore starts in test mode - set up security rules for production
5. **Phone Auth**: For phone auth, you'll need to use your app or add test numbers

---

## 🎯 Summary

**What you'll create:**

✅ **5 Dispatcher Accounts** (BFP, PNP, MDRRMO, AMBULANCE, PCG)
- Created in Authentication (Email/Password)
- Firestore documents in `dispatchers/` collection

✅ **3 Command Center Accounts** (Manila, Quezon, Makati)
- Created in Authentication (Email/Password)
- Firestore documents in `commandCenters/` collection

✅ **User Accounts** (as needed)
- Created via phone authentication in your app
- Firestore documents in `users/` collection

---

## Next Steps

1. ✅ Accounts created in Firebase Console
2. ✅ Test login in your apps
3. ✅ Verify Firestore documents
4. ✅ Set up Firestore security rules
5. ✅ Integrate into your app UI

