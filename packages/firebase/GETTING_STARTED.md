# Getting Started: Complete Account Creation Guide

This is your complete step-by-step guide to create accounts for Users, Dispatchers, and Command Centers.

---

## 🎯 What You'll Create

1. **User Accounts** - Phone authentication for citizens
2. **Dispatcher Accounts** - Email/password for all 5 dispatcher types:
   - BFP (Bureau of Fire Protection)
   - PNP (Philippine National Police)
   - MDRRMO (Municipal Disaster Risk Reduction and Management Office)
   - AMBULANCE (Ambulance Service)
   - PCG (Philippine Coast Guard)
3. **Command Center Accounts** - Email/password for command centers

---

## 📋 Prerequisites Checklist

- [ ] Firebase project created
- [ ] Authentication enabled (Email/Password + Phone)
- [ ] Firestore Database enabled
- [ ] Firebase config copied
- [ ] Environment variables set
- [ ] Package dependencies installed

---

## 🚀 Step-by-Step Process

### Step 1: Firebase Setup (5 minutes)

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com/
   - Click "Add project"
   - Enter project name (e.g., "RESCUE")
   - Disable Google Analytics (optional)
   - Click "Create project"

2. **Enable Authentication**
   - In Firebase Console → **Authentication** → **Get Started**
   - Go to **Sign-in method** tab
   - Enable **Email/Password** (click → Enable → Save)
   - Enable **Phone** (click → Enable → Save)

3. **Enable Firestore**
   - In Firebase Console → **Firestore Database** → **Create database**
   - Select **Start in test mode** (for development)
   - Choose a location (closest to your region)
   - Click **Enable**

4. **Get Firebase Config**
   - Go to **Project Settings** (gear icon ⚙️)
   - Scroll to "Your apps" section
   - Click the web icon `</>` to add a web app
   - Register app (nickname optional)
   - Copy the `firebaseConfig` object

### Step 2: Set Environment Variables (2 minutes)

Create `.env` file in `packages/firebase/`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Where to find these values:**
- All values are in the `firebaseConfig` object you copied
- Or in Firebase Console → Project Settings → Your apps → Web app config

### Step 3: Install & Build (1 minute)

```bash
cd packages/firebase
npm install
npm run build
```

### Step 4: Create Accounts (Choose Method)

#### Method A: Using Scripts (Fastest - Recommended)

**Create All Dispatchers:**
```bash
npx ts-node scripts/create-dispatcher-accounts.ts
```

**Create Command Centers:**
```bash
npx ts-node scripts/create-command-center.ts
```

**Create Civilian Mobile App Users:**
```bash
npx ts-node scripts/create-civilian-users.ts
```

#### Method B: Using Code in Your Apps

See `ACCOUNT_CREATION_GUIDE.md` for code examples.

---

## ✅ Verification

### Check in Firebase Console

1. **Authentication → Users**
   - Should see all created accounts
   - Email accounts for dispatchers and command centers
   - Phone accounts for users

2. **Firestore Database**
   - Collection: `dispatchers/` - Contains dispatcher profiles
   - Collection: `commandCenters/` - Contains command center profiles
   - Collection: `users/` - Contains user profiles

### Test Login

Use the test credentials from `QUICK_START.md` to test login in your apps.

---

## 📝 Default Test Accounts Created

### Dispatchers

| Agency | Email | Password | Role |
|-------|-------|-----------|------|
| BFP | `bfp@rescue.ph` | `BFP2024!` | BFP |
| PNP | `pnp@rescue.ph` | `PNP2024!` | PNP |
| MDRRMO | `mdrrmo@rescue.ph` | `MDRRMO2024!` | MDRRMO |
| Ambulance | `ambulance@rescue.ph` | `AMBULANCE2024!` | AMBULANCE |
| PCG | `pcg@rescue.ph` | `PCG2024!` | PCG |

### Command Centers

| Name | Email | Password |
|------|-------|----------|
| Manila | `manila@commandcenter.ph` | `Manila2024!` |
| Quezon City | `quezon@commandcenter.ph` | `Quezon2024!` |
| Makati | `makati@commandcenter.ph` | `Makati2024!` |

---

## 🔧 Customizing Accounts

### Change Email/Password

Edit the script files in `scripts/`:
- `create-dispatcher-accounts.ts` - Edit dispatcher accounts
- `create-command-center.ts` - Edit command center accounts

### Add More Accounts

Add entries to the arrays in the script files:

```typescript
const dispatchers = [
  // ... existing
  {
    email: 'new@rescue.ph',
    password: 'New2024!',
    role: 'BFP' as const,
    name: 'New Dispatcher'
  }
];
```

---

## 🐛 Troubleshooting

### Scripts won't run

**Error: "Cannot find module 'ts-node'"**
```bash
npm install -g ts-node
# or
npm install --save-dev ts-node
```

**Error: "Cannot find module '@packages/firebase'"**
```bash
cd packages/firebase
npm run build
```

### Environment variables not working

- Make sure `.env` file is in `packages/firebase/` directory
- Variable names must start with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`
- Restart terminal/IDE after creating `.env`

### Phone authentication issues

- Phone number must be in E.164 format: `+[country code][number]`
- Example: `+639123456789` (Philippines), `+1234567890` (US)
- For web builds, add `<div id="recaptcha-container"></div>` to HTML

### Email already in use

- Account already exists
- Scripts will skip and continue
- Use different email or delete account in Firebase Console

---

## 📚 Next Steps

1. ✅ Accounts created
2. ✅ Test login in your apps
3. ✅ Integrate Firebase into your app screens
4. ✅ Add form validation
5. ✅ Add error handling
6. ✅ Set up production environment variables

---

## 📖 Additional Resources

- **Quick Start**: `QUICK_START.md`
- **Detailed Guide**: `ACCOUNT_CREATION_GUIDE.md`
- **Code Examples**: `EXAMPLES.md`
- **Scripts Guide**: `scripts/README.md`

---

## 💡 Tips

1. **Development**: Use test mode Firestore rules
2. **Production**: Set up proper Firestore security rules
3. **Passwords**: Change default passwords before production
4. **Testing**: Use Firebase Console to verify accounts
5. **Phone Auth**: Test with real phone numbers (SMS required)

---

## 🎉 You're Ready!

Once accounts are created, you can:
- Test login in your apps
- Integrate authentication into your UI
- Start building your emergency response system!

Need help? Check the other documentation files or review the code examples.

