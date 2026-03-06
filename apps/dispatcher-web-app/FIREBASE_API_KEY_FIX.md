# Firebase API Key Suspended - How to Fix

## Error Message

```
Failed to sign in command center: Firebase: Error (auth/permission-denied:-consumer-'api-key:...'-has-been-suspended.)
```

## What This Means

Your Firebase API key has been **suspended** by Google. This can happen due to:

- Exceeding quota limits
- Billing issues
- Security violations
- API key restrictions

## Solution: Get a New API Key

### Step 1: Go to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **gear icon (⚙️)** → **Project Settings**

### Step 2: Get Your Firebase Config

1. Scroll down to **"Your apps"** section
2. If you have a web app, click on it
3. If you don't have a web app:
   - Click **"Add app"** → Select **Web icon (`</>`)**
   - Register the app (nickname: "Command Center Web")
   - Click **"Register app"**

4. You'll see your `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...", // ← This is what you need
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
   };
   ```

### Step 3: Update Environment Variables

1. Open `.env.local` in `apps/dispatcher-web-app/` folder
2. Update the API key:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_new_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Important**: Copy ALL the values from Firebase Console, not just the API key

### Step 4: Restart Your Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd apps/dispatcher-web-app
npm run dev
```

## Alternative: Check API Key Restrictions

If you want to keep using the same API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your API key
5. Check if there are restrictions that might be causing issues
6. You may need to:
   - Remove restrictions temporarily
   - Or create a new unrestricted API key for development

## Verify Your Config

After updating, verify your `.env.local` file has all required variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza... (new key)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Still Having Issues?

1. **Check Firebase Project Status**:
   - Go to Firebase Console
   - Check if project is active
   - Verify billing is set up (if using paid features)

2. **Check Quota Limits**:
   - Firebase Console → Usage and billing
   - Make sure you haven't exceeded free tier limits

3. **Create a New Firebase Project** (if needed):
   - Create a fresh project
   - Enable Authentication (Email/Password)
   - Enable Firestore
   - Get new config values
   - Update `.env.local`

## Quick Test

After updating, test in browser console:

```javascript
// Should show your project ID, not errors
console.log(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
```
