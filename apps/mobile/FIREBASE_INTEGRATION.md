# Firebase Integration Guide for Mobile App

This app uses Firebase for user authentication with phone numbers.

## Setup

1. Create a `.env` file in `apps/mobile/`:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

2. Install dependencies:
```bash
cd apps/mobile
npm install
```

## Usage Example

### Login Screen (`src/app/login.jsx`)

```javascript
import { signInUserWithPhone, verifyPhoneCodeAndCreateProfile } from "@packages/firebase";

// Step 1: Send verification code
const confirmationResult = await signInUserWithPhone("+1234567890");

// Step 2: Verify code and create profile
const { user, accountData } = await verifyPhoneCodeAndCreateProfile(
  confirmationResult,
  "123456", // code from SMS
  "John Doe",
  "123 Main St, City"
);
```

### Register Screen (`src/app/register.jsx`)

Similar to login, but you'll create the profile during registration.

## Note for Web Builds

For web builds, add a reCAPTCHA container:

```jsx
import { Platform } from "react-native";

// In your component
{Platform.OS === 'web' && (
  <div id="recaptcha-container" style={{ display: 'none' }} />
)}
```

