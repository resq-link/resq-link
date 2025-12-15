import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration - these should be set via environment variables or app.json
// Supports both NEXT_PUBLIC_/EXPO_PUBLIC_ prefixes (for apps) and FIREBASE_ prefix (for scripts)
// Also supports Expo app.json extra.firebase config

// Helper function to check if a value is a placeholder
const isPlaceholder = (value: string | undefined | null): boolean => {
  if (!value) return true;
  const placeholders = [
    'YOUR_API_KEY_HERE',
    'your_api_key_here',
    'YOUR_AUTH_DOMAIN_HERE',
    'your_auth_domain_here',
    'YOUR_PROJECT_ID_HERE',
    'your_project_id_here',
    'YOUR_STORAGE_BUCKET_HERE',
    'your_storage_bucket_here',
    'YOUR_SENDER_ID_HERE',
    'your_sender_id_here',
    'YOUR_APP_ID_HERE',
    'your_app_id_here',
  ];
  return placeholders.some(placeholder => value.includes(placeholder));
};

// Helper function to get config value, skipping placeholders
const getConfigValue = (
  expoValue: string | undefined | null,
  ...envValues: (string | undefined)[]
): string => {
  // If expo value exists and is not a placeholder, use it
  if (expoValue && !isPlaceholder(expoValue)) {
    return expoValue;
  }
  // Otherwise, use first available env value
  for (const envValue of envValues) {
    if (envValue && !isPlaceholder(envValue)) {
      return envValue;
    }
  }
  return '';
};

// Try to get Firebase config from Expo Constants (app.json extra.firebase)
let expoFirebaseConfig = null;
try {
  // Use require to avoid import issues in non-Expo environments
  const Constants = require('expo-constants');
  if (Constants) {
    // Try multiple paths to get the config
    expoFirebaseConfig = Constants.default?.expoConfig?.extra?.firebase || 
                         Constants.expoConfig?.extra?.firebase ||
                         Constants.default?.manifest?.extra?.firebase ||
                         Constants.manifest?.extra?.firebase ||
                         Constants.default?.manifest2?.extra?.firebase ||
                         Constants.manifest2?.extra?.firebase;
    
    if (expoFirebaseConfig) {
      // Check if API key is a placeholder
      if (isPlaceholder(expoFirebaseConfig.apiKey)) {
        console.log('⚠️ Firebase config in app.json contains placeholder values, falling back to environment variables');
      } else {
        console.log('✅ Firebase config loaded from app.json');
      }
    }
  }
} catch (e) {
  // Constants not available (not in Expo environment) - this is fine
  // Will fall back to environment variables
  console.log('⚠️ Could not load Expo Constants, using environment variables');
}

const firebaseConfig = {
  apiKey: getConfigValue(
    expoFirebaseConfig?.apiKey,
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    process.env.FIREBASE_API_KEY
  ),
  authDomain: getConfigValue(
    expoFirebaseConfig?.authDomain,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    process.env.FIREBASE_AUTH_DOMAIN
  ),
  projectId: getConfigValue(
    expoFirebaseConfig?.projectId,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    process.env.FIREBASE_PROJECT_ID
  ),
  storageBucket: getConfigValue(
    expoFirebaseConfig?.storageBucket,
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    process.env.FIREBASE_STORAGE_BUCKET
  ),
  messagingSenderId: getConfigValue(
    expoFirebaseConfig?.messagingSenderId,
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    process.env.FIREBASE_MESSAGING_SENDER_ID
  ),
  appId: getConfigValue(
    expoFirebaseConfig?.appId,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    process.env.FIREBASE_APP_ID
  ),
};

// Validate Firebase config before initialization
const isConfigValid = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

// Lazy initialization - only initialize when accessed
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _firestore: Firestore | null = null;

function getApp(): FirebaseApp {
  if (_app) {
    return _app;
  }

  const existingApps = getApps();
  
  if (existingApps.length > 0) {
    _app = existingApps[0];
    console.log('✅ Using existing Firebase app instance');
    return _app;
  }

  // Log config for debugging (without sensitive data)
  console.log('🔧 Firebase Config Check:');
  console.log('  - API Key:', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING');
  console.log('  - Auth Domain:', firebaseConfig.authDomain || 'MISSING');
  console.log('  - Project ID:', firebaseConfig.projectId || 'MISSING');
  console.log('  - App ID:', firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 10)}...` : 'MISSING');
  
  if (!isConfigValid()) {
    console.error('❌ Firebase config is missing or incomplete!');
    console.error('Config values:', {
      apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
      authDomain: firebaseConfig.authDomain ? 'SET' : 'MISSING',
      projectId: firebaseConfig.projectId ? 'SET' : 'MISSING',
      appId: firebaseConfig.appId ? 'SET' : 'MISSING',
    });
    console.error('Please check:');
    console.error('  1. app.json has firebase config in extra.firebase');
    console.error('  2. Or .env file has EXPO_PUBLIC_FIREBASE_* variables');
    throw new Error('Firebase configuration is missing or incomplete. Please check app.json or .env file.');
  }
  
  try {
    console.log('🚀 Initializing Firebase...');
    _app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
    return _app;
  } catch (error: any) {
    console.error('❌ Firebase initialization error:', error.message);
    console.error('Full error:', error);
    throw new Error(`Firebase initialization failed: ${error.message}. Please check your Firebase configuration.`);
  }
}

function getAuthInstance(): Auth {
  if (_auth) {
    return _auth;
  }

  const app = getApp();

  try {
    // Check if we're in React Native environment
    const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
    const isExpo = typeof require !== 'undefined';
    
    if (isReactNative || isExpo) {
      // React Native/Expo: Use initializeAuth with AsyncStorage
      try {
        // For React Native, we need to use getReactNativePersistence
        // Import it dynamically to avoid issues in non-React Native environments
        const { getReactNativePersistence } = require('firebase/auth');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        _auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
        console.log('✅ Firebase Auth initialized with AsyncStorage persistence');
        return _auth;
      } catch (asyncStorageError: any) {
        // Fallback to getAuth if AsyncStorage is not available
        console.warn('⚠️ AsyncStorage not available, using getAuth (auth state won\'t persist)');
        _auth = getAuth(app);
        return _auth;
      }
    } else {
      // Web/Next.js: Use getAuth
      _auth = getAuth(app);
      console.log('✅ Firebase Auth initialized (web)');
      return _auth;
    }
  } catch (error: any) {
    console.error('❌ Error initializing Auth:', error.message);
    console.error('Full error:', error);
    throw new Error(`Failed to initialize Firebase Auth: ${error.message}`);
  }
}

function getFirestoreInstance(): Firestore {
  if (_firestore) {
    return _firestore;
  }

  const app = getApp();
  
  try {
    _firestore = getFirestore(app);
    console.log('✅ Firebase Firestore initialized');
    return _firestore;
  } catch (error: any) {
    console.error('❌ Error initializing Firestore:', error.message);
    throw new Error(`Failed to initialize Firebase Firestore: ${error.message}`);
  }
}

// Export getters that initialize lazily
export const app = getApp();
export const auth = getAuthInstance();
export const firestore = getFirestoreInstance();

