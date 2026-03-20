# RESQ-Link - Project Setup Guide 

Welcome to the RESCUE Mobile App project! This monorepo contains multiple applications and a shared Firebase package. This guide will help you set up each component of the project.

## 📁 Project Structure

```
RESCUE_MOBILE APP/
├── apps/
│   ├── civilian-mobile-app/     # Mobile app for citizens (Expo/React Native)
│   ├── dispatcher-web-app/      # Web dashboard for command centers (Next.js)
│   └── responder-mobile-app/    # Mobile app for responders (Expo/React Native)
└── packages/
    └── firebase/            # Shared Firebase package
```

## 🔑 Getting API Keys

**Important**: Before setting up any project, you need to obtain Firebase API keys and configuration.

**Contact**: **Shawn Mikel Campo** to get the Firebase API keys and configuration values.

You will need the following Firebase configuration values:

- `API_KEY`
- `AUTH_DOMAIN`
- `PROJECT_ID`
- `STORAGE_BUCKET`
- `MESSAGING_SENDER_ID`
- `APP_ID`

Once you receive these values, you'll use them in the environment files for each project (see setup instructions below).

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)
- For mobile apps: **Expo CLI** (will be installed with dependencies)

## 🚀 Setup Instructions

Follow these steps to set up each project. **Start with the Firebase package**, as it's a dependency for the other projects.

### 1. Setup `packages/firebase/` (Required First)

This shared package must be set up first as it's used by all other projects.

```bash
# Navigate to the Firebase package directory
cd packages/firebase

# Install dependencies
npm install

# Build the package
npm run build
```

**Environment Setup** (Optional - for scripts):
Create a `.env` file in `packages/firebase/` directory:

```env
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

> **Note**: Get these values from **Shawn Mikel Campo**.

**Additional Documentation**:

- See `packages/firebase/README.md` for detailed usage
- See `packages/firebase/ENV_SETUP.md` for environment variable details
- See `packages/firebase/FIRESTORE_SECURITY_RULES.md` for security rules setup

---

### 2. Setup `apps/civilian-mobile-app/` (Citizen Mobile App)

This is the mobile app for citizens to report emergencies.

```bash
# Navigate to the mobile app directory
cd apps/civilian-mobile-app

# Install dependencies
npm install

# Create environment file
# Create a .env file in apps/civilian-mobile-app/ directory
```

**Environment Setup**:
Create a `.env` file in `apps/civilian-mobile-app/` directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> **Note**: Get these values from **Shawn Mikel Campo**.

**Running the App**:

```bash
# Start the Expo development server
npx expo start

# Or use npm scripts if available
npm start
```

**Additional Documentation**:

- See `apps/civilian-mobile-app/README.md` for detailed project information
- See `apps/civilian-mobile-app/FIREBASE_INTEGRATION.md` for Firebase integration details
- See `apps/civilian-mobile-app/API_SETUP.md` for API setup instructions

---

### 3. Setup `apps/dispatcher-web-app/` (Web Dashboard)

This is the Next.js web application for command centers to monitor and manage emergencies.

```bash
# Navigate to the command center web directory
cd apps/dispatcher-web-app

# Install dependencies
npm install

# Create environment file
# Create a .env.local file in apps/dispatcher-web-app/ directory
```

**Environment Setup**:
Create a `.env.local` file in `apps/dispatcher-web-app/` directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional: Mapbox token for map features
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
NEXT_PUBLIC_MAPBOX_STYLE=mapbox/streets-v12
```

> **Note**: Get Firebase values from **Shawn Mikel Campo**. Mapbox token is optional and can be obtained from [Mapbox](https://account.mapbox.com/access-tokens/).

**Running the App**:

```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:3000
```

**Additional Documentation**:

- See `apps/dispatcher-web-app/README.md` for detailed project information
- See `apps/dispatcher-web-app/FIREBASE_INTEGRATION.md` for Firebase integration details
- See `apps/dispatcher-web-app/AUTHENTICATION_SETUP.md` for authentication setup

---

### 4. Setup `apps/responder-mobile-app/` (Responder Mobile App)

This is the mobile app for dispatchers to receive and manage emergency reports.

```bash
# Navigate to the responder app directory
cd apps/responder-mobile-app

# Install dependencies
npm install

# Create environment file
# Create a .env file in apps/responder-mobile-app/ directory
```

**Environment Setup**:
Create a `.env` file in `apps/responder-mobile-app/` directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> **Note**: Get these values from **Shawn Mikel Campo**.

**Running the App**:

```bash
# Start the Expo development server
npx expo start

# Or use npm scripts if available
npm start
```

**Additional Documentation**:

- See `apps/responder-mobile-app/README.md` for detailed project information

---

## 🔄 Setup Order Summary

For a fresh clone, follow this order:

1. ✅ **First**: Setup `packages/firebase/` (required by all other projects)
2. ✅ **Then**: Setup any of the three apps in any order:
   - `apps/civilian-mobile-app/`
   - `apps/dispatcher-web-app/`
   - `apps/responder-mobile-app/`

## 🛠️ Common Commands

### Firebase Package

```bash
cd packages/firebase
npm install
npm run build          # Build the package
npm run dev            # Watch mode for development
```

### Mobile Apps (apps/civilian-mobile-app & apps/responder-mobile-app)

```bash
cd apps/civilian-mobile-app          # or cd apps/responder-mobile-app
npm install
npx expo start          # Start Expo development server
```

### Command Center Web

```bash
cd apps/dispatcher-web-app
npm install
npm run dev             # Start development server (http://localhost:3000)
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
```

## ⚠️ Important Notes

1. **Firebase Package**: Must be built before other projects can use it. Run `npm run build` in `packages/firebase/` after installation.

2. **Environment Variables**:
   - Never commit `.env` or `.env.local` files to git
   - Each project needs its own environment file with the correct prefix:
     - `EXPO_PUBLIC_` for Expo apps (apps/civilian-mobile-app, apps/responder-mobile-app)
     - `NEXT_PUBLIC_` for Next.js app (apps/dispatcher-web-app)
     - `FIREBASE_` for scripts in packages/firebase

3. **API Keys**: Contact **Shawn Mikel Campo** to obtain all Firebase API keys and configuration values.

4. **Firestore Security Rules**: Before using the apps, make sure Firestore security rules are set up. See `packages/firebase/FIRESTORE_SECURITY_RULES.md`.

## 🐛 Troubleshooting

### "Cannot find module '@packages/firebase'"

- Make sure you've built the Firebase package: `cd packages/firebase && npm run build`
- Make sure you've run `npm install` in the app directory

### "Invalid API Key" or Firebase connection errors

- Verify your `.env` or `.env.local` file exists in the correct directory
- Check that all environment variables are set correctly
- Ensure variable names match exactly (case-sensitive)
- Contact **Shawn Mikel Campo** to verify API keys are correct

### Expo/React Native build errors

- Clear cache: `npx expo start -c`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- For iOS: `cd ios && pod install` (if applicable)

### Next.js build errors

- Clear `.next` directory: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## 📚 Additional Resources

- **Firebase Package**: See `packages/firebase/README.md` for detailed documentation
- **Command Center**: See `apps/dispatcher-web-app/README.md` for web app details
- **Mobile Apps**: See individual `FIREBASE_INTEGRATION.md` files in each mobile app directory

## 👥 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the project-specific documentation files
3. Contact **Shawn Mikel Campo** for API keys and configuration support

---

**Happy Coding! 🚀**
