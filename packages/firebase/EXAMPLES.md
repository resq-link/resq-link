# Usage Examples

## Example: Command Center Web (Next.js)

### 1. Install the package

Add to `apps/dispatcher-web-app/package.json`:

```json
{
  "dependencies": {
    "@packages/firebase": "file:../../packages/firebase"
  }
}
```

Then run:

```bash
cd apps/dispatcher-web-app
npm install
```

### 2. Set environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Use in your code

```typescript
// apps/dispatcher-web-app/app/login/page.tsx
import {
  createCommandCenterAccount,
  signInCommandCenter
} from "@packages/firebase";

export default function LoginPage() {
  const handleRegister = async () => {
    try {
      const { user, accountData } = await createCommandCenterAccount(
        "center@example.com",
        "password123",
        "Main Command Center",
        "Manila, Philippines"
      );
      console.log("Account created:", accountData);
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handleLogin = async () => {
    try {
      const user = await signInCommandCenter(
        "center@example.com",
        "password123"
      );
      console.log("Logged in:", user.uid);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    // Your UI here
  );
}
```

---

## Example: Dispatcher Mobile App (Expo)

### 1. Install the package

Add to `apps/responder-mobile-app/package.json`:

```json
{
  "dependencies": {
    "@packages/firebase": "file:../../packages/firebase"
  }
}
```

Then run:

```bash
cd apps/responder-mobile-app
npm install
```

### 2. Set environment variables

Create `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Use in your code

```typescript
// apps/responder-mobile-app/src/app/register.jsx
import { createDispatcherAccount } from "@packages/firebase";

export default function RegisterScreen() {
  const handleRegister = async () => {
    try {
      const { user, accountData } = await createDispatcherAccount(
        "dispatcher@example.com",
        "password123",
        "BFP" // or "PNP", "MDRRMO", "AMBULANCE", "PCG"
      );
      console.log("Account created:", accountData);
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  return (
    // Your UI here
  );
}
```

---

## Example: User Mobile App (Expo)

### 1. Install the package

Add to `apps/civilian-mobile-app/package.json`:

```json
{
  "dependencies": {
    "@packages/firebase": "file:../../packages/firebase"
  }
}
```

Then run:

```bash
cd apps/civilian-mobile-app
npm install
```

### 2. Set environment variables

Create `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Use in your code

```typescript
// src/app/login.jsx
import {
  signInUserWithPhone,
  verifyPhoneCodeAndCreateProfile
} from "@packages/firebase";

export default function LoginScreen() {
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [code, setCode] = useState("");

  const handleSendCode = async () => {
    try {
      // Phone number must be in E.164 format (e.g., +1234567890)
      const result = await signInUserWithPhone("+1234567890");
      setConfirmationResult(result);
      console.log("Verification code sent!");
    } catch (error) {
      console.error("Failed to send code:", error);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationResult) return;

    try {
      const { user, accountData } = await verifyPhoneCodeAndCreateProfile(
        confirmationResult,
        code,
        "John Doe",
        "123 Main St, City"
      );
      console.log("Logged in:", user.uid);
      console.log("Profile:", accountData);
    } catch (error) {
      console.error("Verification failed:", error);
    }
  };

  return (
    // Your UI here
    // Note: For web, add <div id="recaptcha-container"></div> to your JSX
  );
}
```

### 4. Add reCAPTCHA container (Web only)

For web builds, add a container for reCAPTCHA:

```jsx
// In your component
return (
  <View>
    {/* For web builds */}
    {Platform.OS === "web" && (
      <div id="recaptcha-container" style={{ display: "none" }} />
    )}
    {/* Rest of your UI */}
  </View>
);
```

---

## Building the Package

Before using the package in your apps, build it:

```bash
cd packages/firebase
npm install
npm run build
```

The compiled files will be in `packages/firebase/dist/`.
