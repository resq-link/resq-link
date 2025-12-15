import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration - these should be set via environment variables
// Supports both NEXT_PUBLIC_/EXPO_PUBLIC_ prefixes (for apps) and FIREBASE_ prefix (for scripts)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
          process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 
          process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 
              process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 
              process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
             process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 
             process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                 process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                 process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 
                     process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 
                     process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 
         process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 
         process.env.FIREBASE_APP_ID || '',
};

// Initialize Firebase (singleton pattern)
// Check if Firebase is already initialized
const existingApps = getApps();
let app: FirebaseApp;

if (existingApps.length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = existingApps[0];
}

// Initialize Auth and Firestore
// These will work in both Next.js and Expo environments
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore };

