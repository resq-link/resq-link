// API configuration for mobile app
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { appDebug, appInfo } from '@/utils/logger';

// UI MODE: Set to true to use mock data for UI development (no backend needed)
// UI Mode: mock data for UI development. Set to false to hit real backend.
export const UI_MODE = Constants.expoConfig?.extra?.uiMode === true;

const LOCALHOST_PATTERN = /localhost|127\.0\.0\.1/i;

const trimTrailingSlash = (url) => url.replace(/\/$/, '');

const isLocalhostHost = (url) => LOCALHOST_PATTERN.test(url);

/** Dev machine IP from Metro / Expo (e.g. "192.168.1.100:8081"). */
const getDebuggerHostIp = () => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest?.debuggerHost,
  ];

  for (const host of candidates) {
    if (typeof host === 'string' && host.length > 0) {
      return host.split(':')[0];
    }
  }

  return null;
};

// Get the API base URL
// Priority: 1. EXPO_PUBLIC_API_URL, 2. non-localhost app config, 3. Expo dev IP, 4. platform fallback
const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  const configUrl = Constants.expoConfig?.extra?.apiUrl
    ? trimTrailingSlash(Constants.expoConfig.extra.apiUrl)
    : null;
  const devHostIp = getDebuggerHostIp();

  if (devHostIp) {
    return `http://${devHostIp}:4000`;
  }

  if (configUrl && !isLocalhostHost(configUrl)) {
    return configUrl;
  }

  if (Platform.OS === 'android') {
    // Android emulator alias for the host machine.
    return 'http://10.0.2.2:4000';
  }

  // iOS simulator can reach the host via localhost.
  if (configUrl) {
    return configUrl;
  }

  return 'http://localhost:4000';
};

const API_BASE_URL = getApiBaseUrl();

/** True when the API URL is localhost and cannot be reached from this native runtime. */
export const isNativeLocalhostApi = () => {
  if (!isLocalhostHost(API_BASE_URL)) {
    return false;
  }

  // iOS simulator shares the host network stack; localhost works there.
  if (Platform.OS === 'ios' && Constants.isDevice === false) {
    return false;
  }

  return true;
};

// Log the API URL for debugging (development only)
if (__DEV__) {
  if (UI_MODE) {
    appInfo('UI MODE: Using mock data (no backend required)');
  } else {
    appDebug('API Base URL:', API_BASE_URL);
  }
}

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    emergency: {
      list: '/api/emergency/list',
      submit: '/api/emergency/submit',
    },
    responders: {
      locations: '/api/responders/locations',
    },
  },
};

export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Mock data for UI development
export const mockData = {
  login: {
    user: {
      id: "mock-user-123",
      uid: "mock-user-123",
      email: "civilian@test.com",
      phone_number: "+639123456789",
      phone: "+639123456789",
      name: "Test User",
      role: "civilian",
      created_at: new Date().toISOString(),
    },
  },
  register: {
    user: {
      id: "mock-user-123",
      phone_number: "0000000000",
      name: "New User",
      created_at: new Date().toISOString(),
    },
  },
  emergencyList: {
    reports: [
      {
        id: "1",
        incident_type: "fire",
        incident_id: "inc-mock-1",
        location_text: "123 Main St",
        status: "pending",
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "2",
        incident_type: "medical",
        location_text: "456 Oak Ave",
        status: "in_progress",
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  },
  emergencySubmit: {
    report: {
      id: "new-report-123",
      incident_type: "fire",
      location_text: "789 Pine Rd",
      status: "pending",
      created_at: new Date().toISOString(),
    },
  },
  responders: {
    responders: [
      {
        id: "1",
        name: "Engine 7",
        unit_type: "Fire Truck",
        latitude: 17.6132,
        longitude: 121.727,
        status: "available",
      },
      {
        id: "2",
        name: "Ambulance 3",
        unit_type: "Ambulance",
        latitude: 17.6232,
        longitude: 121.737,
        status: "en_route",
        assignedIncidentId: "inc-mock-1",
      },
    ],
  },
};
