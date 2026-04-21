import { initializeApp, getApps, FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';

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

const getConfigValue = (
  expoValue: string | undefined | null,
  ...envValues: (string | undefined)[]
): string => {
  if (expoValue && !isPlaceholder(expoValue)) {
    return expoValue;
  }
  for (const envValue of envValues) {
    if (envValue && !isPlaceholder(envValue)) {
      return envValue;
    }
  }
  return '';
};

type ExpoFirebaseExtra = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  databaseURL?: string;
} | null;

/** `undefined` = not loaded yet; `null` = no usable Expo extra */
let expoFirebaseConfigMemo: ExpoFirebaseExtra | undefined = undefined;

/**
 * Reads Expo `extra.firebase` only when called (e.g. first Firebase use).
 * Avoids requiring `expo-constants` during unrelated module evaluation.
 */
function loadExpoFirebaseConfig(): ExpoFirebaseExtra {
  if (expoFirebaseConfigMemo !== undefined) {
    return expoFirebaseConfigMemo;
  }

  expoFirebaseConfigMemo = null;

  const isNextJs =
    typeof process !== 'undefined' && Boolean(process.env.NEXT_RUNTIME);
  const isBrowser = typeof window !== 'undefined';
  const isReactNative =
    typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

  if (!isNextJs && (isReactNative || (!isBrowser && !isNextJs))) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require('expo-constants');
      if (Constants) {
        const cfg =
          Constants.default?.expoConfig?.extra?.firebase ||
          Constants.expoConfig?.extra?.firebase ||
          Constants.default?.manifest?.extra?.firebase ||
          Constants.manifest?.extra?.firebase ||
          Constants.default?.manifest2?.extra?.firebase ||
          Constants.manifest2?.extra?.firebase;
        if (cfg && typeof cfg === 'object') {
          expoFirebaseConfigMemo = cfg as NonNullable<ExpoFirebaseExtra>;
        }
      }
    } catch {
      /* not an Expo bundle */
    }
  }

  if (expoFirebaseConfigMemo && isPlaceholder(expoFirebaseConfigMemo.apiKey)) {
    expoFirebaseConfigMemo = null;
  }

  return expoFirebaseConfigMemo;
}

let cachedFirebaseOptions: FirebaseOptions | null = null;

function getFirebaseOptions(): FirebaseOptions {
  if (cachedFirebaseOptions) {
    return cachedFirebaseOptions;
  }

  const expoFirebaseConfig = loadExpoFirebaseConfig();

  cachedFirebaseOptions = {
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
    databaseURL: getConfigValue(
      expoFirebaseConfig?.databaseURL,
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
      process.env.FIREBASE_DATABASE_URL
    ),
  };

  return cachedFirebaseOptions;
}

function isConfigValid(cfg: FirebaseOptions): boolean {
  return !!(
    cfg.apiKey &&
    cfg.authDomain &&
    cfg.projectId &&
    cfg.appId
  );
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _firestore: Firestore | null = null;
let _database: Database | null = null;
let _storage: FirebaseStorage | null = null;

function ensureFirebaseApp(): FirebaseApp {
  if (_app) {
    return _app;
  }

  const existingApps = getApps();

  if (existingApps.length > 0) {
    _app = existingApps[0];
    return _app;
  }

  const firebaseConfig = getFirebaseOptions();

  console.log('🔧 Firebase Config Check:');
  console.log('  - API Key:', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING');
  console.log('  - Auth Domain:', firebaseConfig.authDomain || 'MISSING');
  console.log('  - Project ID:', firebaseConfig.projectId || 'MISSING');
  console.log('  - App ID:', firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 10)}...` : 'MISSING');

  if (!isConfigValid(firebaseConfig)) {
    console.error('❌ Firebase config is missing or incomplete!');
    throw new Error('Firebase configuration is missing or incomplete. Please check app.json or .env file.');
  }

  try {
    console.log('🚀 Initializing Firebase...');
    _app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
    return _app;
  } catch (error: any) {
    console.error('❌ Firebase initialization error:', error.message);
    throw new Error(`Firebase initialization failed: ${error.message}. Please check your Firebase configuration.`);
  }
}

function loadReactNativeAsyncStorage(): {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    const AsyncStorage = mod?.default ?? mod;
    if (
      AsyncStorage &&
      typeof AsyncStorage.getItem === 'function' &&
      typeof AsyncStorage.setItem === 'function'
    ) {
      return AsyncStorage;
    }
  } catch {
    // Not in a React Native bundle or package missing
  }
  return null;
}

function ensureFirebaseAuth(): Auth {
  if (_auth) {
    return _auth;
  }

  const app = ensureFirebaseApp();

  try {
    const isRN =
      typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

    if (isRN) {
      const AsyncStorage = loadReactNativeAsyncStorage();
      if (AsyncStorage) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getReactNativePersistence } = require('firebase/auth') as {
            getReactNativePersistence: (
              storage: typeof AsyncStorage,
            ) => import('firebase/auth').Persistence;
          };
          _auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
          });
          return _auth;
        } catch (e: any) {
          if (e?.code === 'auth/already-initialized') {
            _auth = getAuth(app);
            return _auth;
          }
          console.warn('⚠️ initializeAuth failed, using getAuth:', e?.message);
          _auth = getAuth(app);
          return _auth;
        }
      }
      _auth = getAuth(app);
      return _auth;
    }

    _auth = getAuth(app);
    return _auth;
  } catch (error: any) {
    console.error('❌ Error initializing Auth:', error.message);
    throw new Error(`Failed to initialize Firebase Auth: ${error.message}`);
  }
}

function ensureFirebaseFirestore(): Firestore {
  if (_firestore) {
    return _firestore;
  }

  const app = ensureFirebaseApp();

  try {
    _firestore = getFirestore(app);
    return _firestore;
  } catch (error: any) {
    console.error('❌ Error initializing Firestore:', error.message);
    throw new Error(`Failed to initialize Firebase Firestore: ${error.message}`);
  }
}

function ensureFirebaseRealtimeDatabase(): Database {
  if (_database) {
    return _database;
  }

  const app = ensureFirebaseApp();
  const cfg = getFirebaseOptions();

  if (!cfg.databaseURL || isPlaceholder(cfg.databaseURL)) {
    throw new Error(
      'Firebase Realtime Database URL is missing. Set EXPO_PUBLIC_FIREBASE_DATABASE_URL (or NEXT_PUBLIC_FIREBASE_DATABASE_URL) to your database URL from the Firebase console.',
    );
  }

  try {
    _database = getDatabase(app);
    return _database;
  } catch (error: any) {
    console.error('❌ Error initializing Realtime Database:', error.message);
    throw new Error(`Failed to initialize Firebase Realtime Database: ${error.message}`);
  }
}

function ensureFirebaseStorage(): FirebaseStorage {
  if (_storage) {
    return _storage;
  }

  const app = ensureFirebaseApp();

  try {
    _storage = getStorage(app);
    return _storage;
  } catch (error: any) {
    console.error('❌ Error initializing Storage:', error.message);
    throw new Error(`Failed to initialize Firebase Storage: ${error.message}`);
  }
}

/**
 * Lazy, real Firebase instances only — no Proxy (Firebase APIs expect genuine Auth/Firestore objects).
 * Importing this module does not initialize Firebase; first getter call does.
 */
export function getFirebaseApp(): FirebaseApp {
  return ensureFirebaseApp();
}
export function getFirebaseAuth(): Auth {
  return ensureFirebaseAuth();
}
export function getFirebaseFirestore(): Firestore {
  return ensureFirebaseFirestore();
}

/** Returns true when a Realtime Database URL is configured (presence features). */
export function isFirebaseRealtimeDatabaseConfigured(): boolean {
  const cfg = getFirebaseOptions();
  return !!(cfg.databaseURL && !isPlaceholder(cfg.databaseURL));
}

export function getFirebaseRealtimeDatabase(): Database {
  return ensureFirebaseRealtimeDatabase();
}

export function getFirebaseStorage(): FirebaseStorage {
  return ensureFirebaseStorage();
}
