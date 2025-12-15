# Firebase Integration Guide for Dispatcher Mobile App

This app uses Firebase for dispatcher authentication with email and password.

## Setup

1. Create a `.env` file in `Dispatcher_mobileapp/`:
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
cd Dispatcher_mobileapp
npm install
```

## Usage Example

### Login Screen (`src/app/login.jsx`)

```javascript
import { signInDispatcher } from "@packages/firebase";

const handleLogin = async () => {
  try {
    const user = await signInDispatcher(
      "dispatcher@example.com",
      "password123"
    );
    console.log("Logged in:", user.uid);
    // Navigate to dashboard
  } catch (error) {
    console.error("Login failed:", error);
  }
};
```

### Register Screen (`src/app/register.jsx`)

```javascript
import { createDispatcherAccount } from "@packages/firebase";

const handleRegister = async () => {
  try {
    const { user, accountData } = await createDispatcherAccount(
      "dispatcher@example.com",
      "password123",
      "BFP" // or "PNP", "MDRRMO", "AMBULANCE", "PCG"
    );
    console.log("Account created:", accountData);
    // Navigate to dashboard
  } catch (error) {
    console.error("Registration failed:", error);
  }
};
```

## Dispatcher Roles

Available roles:
- `BFP` - Bureau of Fire Protection
- `PNP` - Philippine National Police
- `MDRRMO` - Municipal Disaster Risk Reduction and Management Office
- `AMBULANCE` - Ambulance service
- `PCG` - Philippine Coast Guard

