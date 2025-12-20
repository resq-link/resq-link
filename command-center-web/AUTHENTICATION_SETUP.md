# Command Center Authentication Setup

## ✅ What's Been Set Up

1. **Authentication Context** (`contexts/AuthContext.tsx`)
   - Manages Firebase Auth state
   - Provides `useAuth()` hook for components
   - Handles sign out functionality

2. **Login Page** (`app/login/page.tsx`)
   - Beautiful login form
   - Uses `signInCommandCenter()` from Firebase package
   - Redirects to dashboard on success

3. **Protected Routes** (`components/ProtectedRoute.tsx`)
   - Wraps dashboard to require authentication
   - Redirects to login if not authenticated
   - Shows loading state while checking auth

4. **Updated Navigation** (`components/Navigation.tsx`)
   - Shows user email when logged in
   - Sign out button
   - Hides navigation on login page

5. **Protected Dashboard** (`app/page.tsx`)
   - Requires authentication to view
   - Automatically redirects to login if not authenticated

## 🚀 How to Use

### Step 1: Create a Command Center Account

You need to create a command center account first. You can do this in two ways:

#### Option A: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** → **Users**
3. Click **Add User**
4. Enter email and password
5. Create the user

6. Then go to **Firestore Database**
7. Create a document in `commandCenters` collection:
   - **Document ID**: Use the User UID from Authentication
   - **Fields**:
     ```
     email: string → "admin@commandcenter.com"
     name: string → "Main Command Center"
     location: string → "Manila, Philippines"
     createdAt: timestamp → (current timestamp)
     ```

#### Option B: Using Code (Temporary)

Create a temporary script or use browser console:

```typescript
import { createCommandCenterAccount } from "@packages/firebase";

const { user, accountData } = await createCommandCenterAccount(
  "admin@commandcenter.com",
  "password123",
  "Main Command Center",
  "Manila, Philippines"
);

console.log("Account created:", accountData);
```

### Step 2: Login

1. Start your development server:
   ```bash
   cd command-center-web
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. You'll be redirected to `/login` if not authenticated
4. Enter your command center email and password
5. Click "Sign in"
6. You'll be redirected to the dashboard

### Step 3: View Emergency Reports

Once logged in:
- The dashboard will automatically load emergency reports from Firestore
- Reports appear in real-time as they're submitted from the mobile app
- You can see total, active, and pending incident counts
- Click "Sign Out" in the navigation to logout

## 🔒 Security

- All routes are protected - unauthenticated users are redirected to login
- Firestore security rules require authentication to read emergency reports
- Auth state persists across page refreshes (handled by Firebase Auth)

## 🐛 Troubleshooting

### "Failed to login"
- Check that the email/password is correct
- Verify the user exists in Firebase Authentication
- Check that a document exists in `commandCenters` collection with the user's UID

### "Missing or insufficient permissions"
- Make sure you're logged in
- Check Firestore rules allow command center users to read `emergencies` collection
- Verify the user document exists in `commandCenters` collection

### Dashboard shows "No active incidents"
- Check browser console for error messages
- Verify emergency reports exist in Firestore `emergencies` collection
- Make sure reports have `status: 'pending'` or `status: 'active'`

## 📝 Next Steps

- Add user profile page
- Add password reset functionality
- Add session timeout handling
- Add role-based access control (if needed)

