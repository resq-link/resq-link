# Command Center Dashboard Setup

## Issue: Dashboard Not Showing Emergency Reports

The command center dashboard requires **Firebase Authentication** to read emergency reports from Firestore.

## Quick Fix Options

### Option 1: Login as Command Center User (Recommended)

1. **Create a command center account** (if you haven't already):
   ```typescript
   import { createCommandCenterAccount } from "@packages/firebase";
   
   const { user, accountData } = await createCommandCenterAccount(
     "admin@commandcenter.com",
     "password123",
     "Main Command Center",
     "Manila, Philippines"
   );
   ```

2. **Login in your app**:
   - Create a login page at `app/login/page.tsx`
   - Use `signInCommandCenter(email, password)` from `@packages/firebase`
   - Store auth state and redirect to dashboard

3. **Check browser console** - you should see:
   - `✅ User authenticated: [user.uid]`
   - `Received emergency reports: [count]`

### Option 2: Temporarily Allow Unauthenticated Reads (Testing Only)

**⚠️ WARNING**: Only for development/testing. Never use in production!

Update your Firestore rules to temporarily allow unauthenticated reads:

```javascript
// Emergency Reports collection - TEMPORARY FOR TESTING
match /emergencies/{reportId} {
  // Allow anyone to read (for testing)
  allow read: if true;
  // Still require auth for writes
  allow create: if request.auth != null && 
                   request.resource.data.userId == request.auth.uid;
  allow update, delete: if false; // Disable for testing
}
```

**Remember to revert this after testing!**

## Debugging

1. **Open browser console** (F12)
2. **Look for these messages**:
   - `Setting up emergency reports subscription...`
   - `✅ User authenticated: [uid]` or `⚠️ User not authenticated`
   - `Received emergency reports: [count]`
   - Any error messages

3. **Check Firestore Console**:
   - Go to Firebase Console → Firestore Database
   - Verify `emergencies` collection has documents
   - Check that documents have `status: 'pending'` or `status: 'active'`

## Expected Behavior

- **With Authentication**: Dashboard shows all emergency reports in real-time
- **Without Authentication**: Dashboard shows "No active incidents" and console shows warning

## Next Steps

1. Set up authentication in command center (Option 1 - recommended)
2. Or temporarily allow unauthenticated reads (Option 2 - testing only)
3. Check browser console for debugging information
4. Verify reports exist in Firestore with correct status

