# Dispatcher Mobile App

A mobile application for dispatchers to view and manage assigned emergency cases in real-time.

## Features

- **Dispatcher Authentication**: Secure login with role verification
- **Real-time Case Updates**: Automatically receive assigned cases as they're assigned by the command center
- **Case Dashboard**: View all assigned cases with status, priority, and location information
- **Case Details**: View comprehensive case information including reporter details
- **Role-based Access**: Only dispatchers can access the app (civilians are blocked)

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

Dispatchers must log in with their email and password. The app verifies that:
- The user exists in Firebase Authentication
- The user has a document in the `dispatchers` collection
- The dispatcher account is active

## Usage

1. **Login**: Enter dispatcher email and password
2. **Dashboard**: View all assigned cases in real-time
3. **Case Details**: Tap on a case to view full details including reporter information
4. **Logout**: Use the logout button in the dashboard header

## Data Flow

- Cases are assigned to dispatchers by the command center web application
- When a case is assigned, it automatically appears in the dispatcher's dashboard
- Real-time updates ensure dispatchers see new assignments immediately
- Case status changes are reflected in real-time

## Project Structure

```
dispatcher-app/
├── src/
│   ├── app/
│   │   ├── _layout.jsx      # Navigation setup
│   │   ├── index.jsx        # Entry point (redirects to login/dashboard)
│   │   ├── login.jsx        # Dispatcher login screen
│   │   ├── dashboard.jsx    # Main dashboard with assigned cases
│   │   └── case-detail.jsx  # Case detail view
│   ├── components/
│   │   ├── CaseCard.jsx         # Case card component
│   │   ├── CaseStatusBadge.jsx  # Status badge
│   │   ├── PriorityBadge.jsx    # Priority badge
│   │   ├── CaseInfoCard.jsx     # Case information display
│   │   ├── LoadingScreen.jsx    # Loading state
│   │   ├── ErrorAlert.jsx       # Error display
│   │   ├── CustomButton.jsx     # Reusable button
│   │   └── FormInput.jsx        # Form input component
│   └── utils/
│       ├── auth/
│       │   └── dispatcherAuth.js  # Dispatcher authentication utilities
│       └── userStore.js           # User state management
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

