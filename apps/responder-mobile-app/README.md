# Responder Mobile App

A mobile application for responders to view and manage assigned emergency cases in real-time.

## Features

- **Responder Authentication**: Secure login with role verification
- **Real-time Case Updates**: Automatically receive assigned cases as they're assigned by the command center
- **Case Dashboard**: View all assigned cases with status, priority, and location information
- **Case Details**: View comprehensive case information including reporter details
- **Role-based Access**: Only responders can access the app (civilians are blocked)

## Setup

1. Install dependencies:

```bash
npm install
```

2. The app uses the same Firebase configuration as the mobile app (configured in `app.json`)

3. Start the development server:

```bash
npx expo start
```

## Authentication

Responders must log in with their email and password. The app verifies that:

- The user exists in Firebase Authentication
- The user has a document in the `dispatchers` collection
- The responder account is active

## Usage

1. **Login**: Enter responder email and password
2. **Dashboard**: View all assigned cases in real-time
3. **Case Details**: Tap on a case to view full details including reporter information
4. **Logout**: Use the logout button in the dashboard header

## Data Flow

- Cases are assigned to responders by the command center web application
- When a case is assigned, it automatically appears in the responder's dashboard
- Real-time updates ensure responders see new assignments immediately
- Case status changes are reflected in real-time

## Architecture

- **[docs/architecture.md](./docs/architecture.md)** — folder layout, routing, theme, services (source of truth)  
- **[docs/RESPONDER-APP-STRUCTURE-GUIDE.md](./docs/RESPONDER-APP-STRUCTURE-GUIDE.md)** — route map and quick conventions  
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — short pointer to the docs above  

**`.env`** lives at the **app root** (this folder). Do not move it.

## Project Structure

```
responder-mobile-app/
├── src/
│   ├── app/                          # Expo Router — URLs defined only here
│   │   ├── _layout.jsx               # Root providers + Stack
│   │   ├── index.jsx                 # / → redirect to /login or /dashboard
│   │   ├── +not-found.tsx            # Unmatched routes
│   │   ├── (auth)/login.jsx          # /login
│   │   ├── (tabs)/
│   │   │   ├── _layout.jsx           # 4 tabs: Dashboard, Map, Notifications, Settings
│   │   │   ├── dashboard.jsx         # /dashboard
│   │   │   ├── map.jsx               # /map
│   │   │   ├── notifications.jsx    # /notifications
│   │   │   └── settings.jsx          # /settings
│   │   ├── incident/[id].jsx         # /incident/:id — case detail
│   │   └── support/
│   │       ├── about.jsx             # /support/about
│   │       ├── help-support.jsx      # /support/help-support
│   │       └── location.jsx          # /support/location
│   │
│   ├── modules/                      # Feature code (components, hooks) — no duplicate /screens here
│   │   ├── auth/, dashboard/, incidents/, map/, notifications/, settings/
│   │
│   ├── components/                   # Shared UI only: ui/, feedback/, layout/
│   ├── services/                     # Firebase / API (incidentService, responderService, auth/…)
│   ├── store/userStore.ts            # Zustand session user
│   ├── query/                        # TanStack Query client + keys
│   ├── utils/                        # Pure helpers (formatting, map helpers)
│   ├── theme/, context/
│   └── constants/
```

## Firebase Integration

The app uses the `@packages/firebase` package for:

- Authentication: `signInDispatcher`
- Real-time subscriptions: `subscribeToDispatcherAssignedEmergencies`
- Firestore queries: `getDoc`, `doc`

## Security

- Dispatcher role verification on login
- Only authenticated dispatchers can access assigned cases
- Firestore security rules enforce access control
- Dispatcher ID validation ensures users only see their assigned cases
