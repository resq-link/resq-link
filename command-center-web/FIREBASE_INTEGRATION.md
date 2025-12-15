# Firebase Integration Guide for Command Center Web

This app uses Firebase for command center authentication with email and password.

## Setup

1. Create a `.env.local` file in `command-center-web/`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

2. Install dependencies:
```bash
cd command-center-web
npm install
```

## Usage Example

### Login Page (`app/login/page.tsx`)

```typescript
'use client'

import { signInCommandCenter } from "@packages/firebase";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const user = await signInCommandCenter(email, password);
      console.log("Logged in:", user.uid);
      // Redirect to dashboard
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    // Your login form UI
  );
}
```

### Register Page (`app/register/page.tsx`)

```typescript
'use client'

import { createCommandCenterAccount } from "@packages/firebase";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const handleRegister = async () => {
    try {
      const { user, accountData } = await createCommandCenterAccount(
        email,
        password,
        name,
        location
      );
      console.log("Account created:", accountData);
      // Redirect to dashboard
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  return (
    // Your registration form UI
  );
}
```

