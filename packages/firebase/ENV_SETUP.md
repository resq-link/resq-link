# Environment Variables Setup

## Quick Setup for Scripts

Create a `.env` file in `packages/firebase/` directory with your Firebase configuration.

### Option 1: Use FIREBASE_ prefix (Recommended for Scripts)

```env
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### Option 2: Use NEXT_PUBLIC_ prefix (For Next.js apps)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Option 3: Use EXPO_PUBLIC_ prefix (For Expo apps)

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Where to Find These Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll to **Your apps** section
5. Click the web icon `</>` to add a web app (if not already added)
6. Copy the `firebaseConfig` values

## Example .env File

```env
# Firebase Configuration for Scripts
FIREBASE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz
FIREBASE_AUTH_DOMAIN=my-rescue-project.firebaseapp.com
FIREBASE_PROJECT_ID=my-rescue-project
FIREBASE_STORAGE_BUCKET=my-rescue-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

## Important Notes

- ✅ The `.env` file should be in `packages/firebase/` directory
- ✅ Never commit `.env` file to git (it's in .gitignore)
- ✅ Scripts will automatically load `.env` file
- ✅ You can use any of the three prefix options (FIREBASE_, NEXT_PUBLIC_, EXPO_PUBLIC_)
- ✅ The config.ts file checks all three prefixes automatically

## Troubleshooting

### "Invalid API Key" Error

1. **Check .env file location**: Must be in `packages/firebase/` directory
2. **Check variable names**: Must match exactly (case-sensitive)
3. **Check values**: No extra spaces or quotes
4. **Restart terminal**: After creating/editing .env file

### Scripts Not Loading .env

- Make sure `dotenv` is installed: `npm install`
- Make sure `.env` file exists in `packages/firebase/` directory
- Check file name is exactly `.env` (not `.env.txt` or `.env.local`)

