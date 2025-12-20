# Troubleshooting "Missing or Insufficient Permissions" Error

If you're still getting permission errors after updating Firestore rules, follow these steps:

## Step 1: Verify Firestore Rules Are Deployed

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Verify the rules include the `emergencies` collection
5. Make sure you clicked **"Publish"** after updating

## Step 2: Verify User Is Authenticated

The error can occur if the user isn't properly authenticated with Firebase Auth. Check:

1. **In your app**, make sure the user is logged in using `signInCivilian()`
2. **Check console logs** - you should see "Login successful: [user.uid]"
3. **Verify auth state** - The app checks `auth.currentUser` before submitting

## Step 3: Test with Simplified Rules

If still having issues, temporarily use simplified rules to test authentication:

1. Copy rules from `FIRESTORE_RULES_SIMPLE.md`
2. Deploy to Firebase Console
3. Try submitting a report
4. If it works → Authentication is working, switch back to full rules
5. If it fails → Authentication issue, see Step 4

## Step 4: Check Firebase Auth Setup

Verify your Firebase Auth is properly configured:

1. **Firebase Console** → **Authentication** → **Users**
2. Check if your test user exists
3. **Firebase Console** → **Authentication** → **Sign-in method**
4. Verify **Email/Password** is enabled

## Step 5: Check User Profile in Firestore

The `signInCivilian` function requires a user profile in Firestore:

1. **Firebase Console** → **Firestore Database**
2. Navigate to `users` collection
3. Check if a document exists with your user's UID
4. If missing, create it manually or use the registration flow

## Step 6: Create Composite Index (If Needed)

If you see an error about a missing index:

1. The error message will include a link to create the index
2. Click the link or go to Firebase Console → Firestore → Indexes
3. Click "Create Index"
4. Wait for index to build (can take a few minutes)

## Common Issues and Solutions

### Issue: "User must be authenticated with Firebase Auth"
**Solution**: Make sure you're logged in using `signInCivilian()` before submitting reports.

### Issue: "User profile not found"
**Solution**: Create a user profile in Firestore `users` collection with the user's UID.

### Issue: Rules not updating
**Solution**: 
- Wait 1-2 minutes for rules to propagate
- Clear browser cache
- Try in incognito mode

### Issue: Still getting permission errors after all steps
**Solution**: 
1. Check Firebase Console → Firestore → Rules for syntax errors
2. Verify the collection name matches (`emergencies` not `incidents`)
3. Check that `request.auth.uid` matches the `userId` in the document

## Debug Checklist

- [ ] Firestore rules are deployed and published
- [ ] User is authenticated (check `auth.currentUser` in console)
- [ ] User profile exists in Firestore `users` collection
- [ ] Collection name is correct (`emergencies`)
- [ ] Firebase Auth is enabled (Email/Password)
- [ ] No syntax errors in Firestore rules
- [ ] Composite index created (if error mentions it)

## Still Having Issues?

1. Check browser/device console for detailed error messages
2. Check Firebase Console → Firestore → Usage tab for denied requests
3. Verify your Firebase project ID matches in `.env` file
4. Try the simplified rules from `FIRESTORE_RULES_SIMPLE.md` to isolate the issue

