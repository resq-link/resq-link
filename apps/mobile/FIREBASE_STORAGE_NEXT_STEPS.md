# Firebase Storage Integration - Next Steps

## ✅ What's Been Done

1. ✅ Firebase Storage initialized in the Firebase package
2. ✅ `uploadImageToStorage()` function created and exported
3. ✅ Emergency form updated to use Firebase Storage instead of Uploadcare
4. ✅ Storage security rules file created (`packages/firebase/storage.rules`)

## 🚀 Next Steps to Complete Setup

### Step 1: Enable Firebase Storage in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **city-rescue-dispatch**
3. Click **Storage** in the left sidebar
4. If Storage is not enabled:
   - Click **Get started**
   - Choose a storage location (same region as Firestore for best performance)
   - Click **Done**

### Step 2: Deploy Storage Security Rules

You need to deploy the security rules to allow authenticated users to upload photos.

**Option A: Via Firebase Console (Easiest)**
1. In Firebase Console, go to **Storage** → **Rules** tab
2. Open `packages/firebase/storage.rules` file
3. Copy the entire content
4. Paste into the Firebase Console rules editor
5. Click **Publish**

**Option B: Via Firebase CLI**
```bash
cd packages/firebase
firebase deploy --only storage
```

### Step 3: Verify Configuration

Your Firebase Storage bucket is already configured in `app.json`:
- Storage Bucket: `city-rescue-dispatch.firebasestorage.app` ✅

### Step 4: Test the Integration

1. **Start your app:**
   ```bash
   cd apps/mobile
   npm start
   ```

2. **Test photo upload:**
   - Login to the app
   - Navigate to "Report Emergency"
   - Fill in the form
   - Take a photo or select one from gallery
   - Submit the report

3. **Verify in Firebase Console:**
   - Go to **Storage** → Browse files
   - You should see: `emergencies/photos/emergency_[timestamp]_[random].jpg`
   - Check Firestore → `emergencies` collection
   - The document should have an `imageUrl` field with the download URL

## 🔒 Security Rules Summary

The storage rules allow:
- ✅ Authenticated users to upload photos
- ✅ Maximum file size: 10MB
- ✅ Only image files accepted
- ✅ Photos stored in `emergencies/photos/` path only

## 📚 Documentation

For detailed information, see:
- `packages/firebase/STORAGE_SETUP.md` - Complete setup guide
- `packages/firebase/storage.rules` - Security rules file

## ⚠️ Troubleshooting

### Error: "Permission denied"
- Check that storage rules are deployed
- Verify user is authenticated
- Check Firebase Console → Storage → Rules

### Error: "Storage bucket not found"
- Verify Storage is enabled in Firebase Console
- Check that bucket name matches: `city-rescue-dispatch.firebasestorage.app`

### Photos not uploading
- Check browser/device console for errors
- Verify Firebase Storage is enabled
- Check network connectivity
- Verify file size is under 10MB

## 🎉 You're Ready!

Once you complete Steps 1-2 (Enable Storage & Deploy Rules), your emergency reporting with photo uploads will be fully functional!

