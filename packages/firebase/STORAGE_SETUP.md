# Firebase Storage Setup Guide

This guide explains how to set up Firebase Storage for photo uploads in the emergency reporting system.

## 📋 Overview

Firebase Storage is used to store photos uploaded with emergency reports. Photos are stored in the `emergencies/photos/` path with unique filenames.

## 🚀 Setup Instructions

### Step 1: Enable Firebase Storage

1. **Open Firebase Console**
   - Go to https://console.firebase.google.com/
   - Select your project

2. **Navigate to Storage**
   - Click on **Storage** in the left sidebar
   - If you haven't enabled Storage yet, click **Get started**

3. **Choose Storage Location**
   - Select a location for your storage bucket (choose the same region as your Firestore for best performance)
   - Click **Done**

### Step 2: Deploy Storage Security Rules

You have two options to deploy the storage rules:

#### Option 1: Using Firebase Console (Recommended for Quick Setup)

1. **Navigate to Storage Rules**
   - In Firebase Console, go to **Storage** → **Rules** tab

2. **Copy and Paste Rules**
   - Open `packages/firebase/storage.rules` file
   - Copy all the content
   - Paste it into the Firebase Console rules editor
   - Click **Publish**

#### Option 2: Using Firebase CLI (For Development)

1. **Install Firebase CLI** (if not already installed)

   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**

   ```bash
   firebase login
   ```

3. **Initialize Firebase Storage** (if not already done)

   ```bash
   cd packages/firebase
   firebase init storage
   ```

   - Select your Firebase project
   - Use the existing `storage.rules` file when prompted

4. **Deploy Rules**
   ```bash
   firebase deploy --only storage
   ```

### Step 3: Verify Storage Bucket Configuration

1. **Check Storage Bucket Name**
   - In Firebase Console, go to **Project Settings** → **General** tab
   - Find your **Storage bucket** name (e.g., `your-project.appspot.com`)
   - Make sure this matches your `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` environment variable

2. **Verify Environment Variable**
   - Check your `.env` file in `apps/civilian-mobile-app/`
   - Ensure `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` is set correctly
   - The value should be just the bucket name (e.g., `your-project.appspot.com`) or the full gs:// URL (e.g., `gs://your-project.appspot.com`)

## 🔒 Security Rules Explanation

The storage rules (`storage.rules`) enforce:

- **Authentication Required**: Only authenticated users can upload/read photos
- **File Size Limit**: Maximum 10MB per file
- **File Type Restriction**: Only image files are allowed
- **Path Security**: Photos can only be stored in `emergencies/photos/` path

### Current Rules Summary

```javascript
/emergencies/photos/{photoId}
  - Write: Authenticated users only, max 10MB, images only
  - Read: Authenticated users only
```

## 🧪 Testing

### Test Photo Upload

1. **Run your mobile app**

   ```bash
   cd apps/civilian-mobile-app
   npm start
   ```

2. **Submit an Emergency Report with Photo**
   - Login to the app
   - Navigate to "Report Emergency"
   - Fill in the form
   - Add a photo (from camera or gallery)
   - Submit the report

3. **Verify Upload**
   - Check Firebase Console → Storage → `emergencies/photos/`
   - You should see the uploaded photo file
   - The emergency report in Firestore should have the `imageUrl` field populated

### Common Issues

#### Error: "Permission denied"

- **Cause**: Storage rules not deployed or user not authenticated
- **Solution**:
  - Verify storage rules are deployed
  - Check that user is logged in
  - Verify rules match the file path (`emergencies/photos/`)

#### Error: "File size exceeds maximum"

- **Cause**: File is larger than 10MB
- **Solution**: Compress the image before upload (already handled in code with quality: 0.8)

#### Error: "Storage bucket not found"

- **Cause**: Storage bucket not configured or wrong bucket name
- **Solution**:
  - Verify Storage is enabled in Firebase Console
  - Check `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` environment variable
  - Restart your app after changing environment variables

## 📝 Production Considerations

### File Size Limits

- Current limit: 10MB per file
- Consider reducing to 5MB for mobile uploads
- Images are compressed (quality: 0.8) before upload

### Storage Costs

- Firebase Storage has a free tier: 5GB storage, 1GB/day downloads
- Monitor usage in Firebase Console → Usage and billing

### Cleanup Strategy

- Consider implementing automatic deletion of old emergency photos
- Or archive photos after reports are resolved

## 🔧 Advanced Configuration

### Custom File Paths

To change the storage path, update the path parameter in `emergency-form.jsx`:

```javascript
imageUrl = await uploadImageToStorage(
  imageUri,
  "emergencies/photos/",
  fileName,
);
```

### Adjust File Size Limit

Edit `storage.rules`:

```javascript
allow write: if isAuthenticated()
             && request.resource.size < 5 * 1024 * 1024  // 5MB max file size
             && request.resource.contentType.matches('image/.*');
```

### Allow Specific Image Types Only

Edit `storage.rules`:

```javascript
allow write: if isAuthenticated()
             && request.resource.size < 10 * 1024 * 1024
             && request.resource.contentType.matches('image/(jpeg|jpg|png)');
```
