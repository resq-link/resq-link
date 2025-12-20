# Firestore Security Rules Setup Guide

This guide explains how to set up Firestore security rules for the RESCUE emergency reporting system.

## 🔒 Security Rules Overview

The security rules control who can read and write data in Firestore. The rules are defined in `firestore.rules` and need to be deployed to your Firebase project.

## 📋 Rules Summary

### Emergency Reports (`emergencies` collection)

- **Create**: Any authenticated user can create an emergency report (must be their own)
- **Read**: 
  - Users can read their own reports
  - Command center users can read all reports
  - Dispatchers can read all reports
- **Update**: Only command center and dispatchers can update reports (to change status, assign responders)
- **Delete**: Only command center users can delete reports

### User Profiles (`users` collection)

- **Read**: Users can read their own profile, command center and dispatchers can read all
- **Create/Update**: Users can create/update their own profile
- **Delete**: Users can delete their own profile

### Dispatchers (`dispatchers` collection)

- **Read**: Dispatchers can read their own, command center can read all
- **Create/Update**: Dispatchers can create/update their own, command center can update any

### Command Centers (`commandCenters` collection)

- **Read**: Command center users can read their own
- **Create/Update**: Command center users can create/update their own

## 🚀 Setup Instructions

### Option 1: Using Firebase Console (Recommended for Quick Setup)

1. **Open Firebase Console**
   - Go to https://console.firebase.google.com/
   - Select your project

2. **Navigate to Firestore Rules**
   - Click on **Firestore Database** in the left sidebar
   - Click on the **Rules** tab

3. **Copy and Paste Rules**
   - Open `packages/firebase/firestore.rules` file
   - Copy all the content
   - Paste it into the Firebase Console rules editor
   - Click **Publish**

### Option 2: Using Firebase CLI (For Development)

1. **Install Firebase CLI** (if not already installed)
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project** (if not already done)
   ```bash
   cd packages/firebase
   firebase init firestore
   ```
   - Select your Firebase project
   - Use the existing `firestore.rules` file when prompted

4. **Deploy Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

## 🧪 Testing Rules

### Test Emergency Report Creation

1. **Authenticate a user** in your mobile app
2. **Submit an emergency report**
3. **Verify** the report appears in Firestore

### Test Command Center Access

1. **Login as command center user** in the web app
2. **Verify** you can see all emergency reports
3. **Try updating** a report status (should work)

### Test User Access

1. **Login as a regular user** in the mobile app
2. **Verify** you can only see your own reports
3. **Try updating** someone else's report (should fail)

## ⚠️ Important Notes

### Development Mode

For development, you might want to use more permissive rules temporarily:

```javascript
// TEMPORARY: Development rules (NOT for production!)
match /emergencies/{reportId} {
  allow read, write: if request.auth != null;
}
```

**⚠️ WARNING**: Never use these rules in production! They allow any authenticated user to modify any report.

### Production Rules

The provided rules in `firestore.rules` are production-ready and enforce proper security:
- Users can only create reports with their own userId
- Users can only read their own reports
- Only authorized personnel (command center, dispatchers) can see all reports
- Only authorized personnel can update report status

## 🔍 Troubleshooting

### Error: "Missing insufficient permissions"

**Cause**: Firestore security rules are blocking the operation.

**Solutions**:
1. **Check if user is authenticated**: Make sure the user is logged in
2. **Verify rules are deployed**: Check Firebase Console → Firestore → Rules
3. **Check userId matches**: Ensure `request.auth.uid` matches the `userId` in the document
4. **Review rule logic**: Make sure the rule conditions match your use case

### Error: "Permission denied"

**Cause**: The user doesn't have permission for the operation.

**Solutions**:
1. **Verify user type**: Check if user is in the correct collection (users, dispatchers, commandCenters)
2. **Check rule conditions**: Review the rule logic for the specific operation
3. **Test with Firebase Console**: Try the operation manually in Firebase Console to verify

### Rules Not Updating

**Solutions**:
1. **Clear cache**: Wait a few minutes for rules to propagate
2. **Redeploy**: Deploy rules again using Firebase CLI
3. **Check syntax**: Verify rules syntax is correct (no typos)

## 📚 Additional Resources

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase CLI Documentation](https://firebase.google.com/docs/cli)

## ✅ Verification Checklist

After setting up rules, verify:

- [ ] Rules are deployed to Firebase Console
- [ ] Users can create emergency reports
- [ ] Users can read their own reports
- [ ] Command center can read all reports
- [ ] Command center can update report status
- [ ] Users cannot read other users' reports
- [ ] Users cannot update report status

---

**Need Help?** Check the Firebase Console → Firestore → Rules for any syntax errors or review the rule logic.

