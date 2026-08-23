// API configuration for mobile app
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { appDebug, appInfo } from '@/utils/logger';

// UI MODE: Set to true to use mock data for UI development (no backend needed)
export const UI_MODE = Constants.expoConfig?.extra?.uiMode === true;

/** Deployed RESQ-LINK web app (email OTP, password reset). */
export const PRODUCTION_API_URL = 'https://www.resq-link.com';

const LOCALHOST_PATTERN = /localhost|127\.0\.0\.1/i;

const trimTrailingSlash = (url) => url.replace(/\/$/, '');

const isLocalhostHost = (url) => LOCALHOST_PATTERN.test(url);

const useLocalApi =
  process.env.EXPO_PUBLIC_USE_LOCAL_API === 'true' ||
  process.env.EXPO_PUBLIC_USE_LOCAL_API === '1';

const getExtraApiUrl = (key) => {
  const value = Constants.expoConfig?.extra?.[key];
  if (typeof value === 'string' && value.length > 0) {
    if (!useLocalApi && isLocalhostHost(value)) {
      return null;
    }
    return trimTrailingSlash(value);
  }
  return null;
};

const resolveExplicitUrl = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string') {
      return trimTrailingSlash(candidate);
    }
  }
  return null;
};

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

/** Local Next.js dev server URL — only when explicitly enabled. */
const getLocalDevApiUrl = (port) => {
  const devHostIp = getDebuggerHostIp();
  if (devHostIp) {
    return `http://${devHostIp}:${port}`;
  }

  if (Platform.OS === 'android' && Constants.isDevice === false) {
    return `http://10.0.2.2:${port}`;
  }

  return `http://localhost:${port}`;
};

const getApiBaseUrl = () => {
  const envUrl = resolveExplicitUrl(process.env.EXPO_PUBLIC_API_URL);
  if (envUrl) {
    return envUrl;
  }

  if (useLocalApi && __DEV__) {
    const extraUrl = getExtraApiUrl('apiUrl');
    if (extraUrl) {
      return extraUrl;
    }
    return getLocalDevApiUrl(3000);
  }

  const extraUrl = getExtraApiUrl('apiUrl');
  if (extraUrl) {
    return extraUrl;
  }

  return PRODUCTION_API_URL;
};

const getOtpApiBaseUrl = () => {
  const dedicatedUrl = resolveExplicitUrl(process.env.EXPO_PUBLIC_OTP_API_URL);
  if (dedicatedUrl) {
    return dedicatedUrl;
  }

  const extraOtpUrl = getExtraApiUrl('otpApiUrl');
  if (extraOtpUrl) {
    return extraOtpUrl;
  }

  const envUrl = resolveExplicitUrl(process.env.EXPO_PUBLIC_API_URL);
  if (envUrl) {
    return envUrl;
  }

  const extraApiUrl = getExtraApiUrl('apiUrl');
  if (extraApiUrl) {
    return extraApiUrl;
  }

  if (useLocalApi && __DEV__) {
    return getLocalDevApiUrl(3000);
  }

  return PRODUCTION_API_URL;
};

const API_BASE_URL = getApiBaseUrl();
export const OTP_API_BASE_URL = getOtpApiBaseUrl();

export const getOtpApiUrl = (endpoint) => `${OTP_API_BASE_URL}${endpoint}`;

/** True when the API URL is localhost and cannot be reached from this native runtime. */
export const isNativeLocalhostApi = () => {
  if (!isLocalhostHost(API_BASE_URL)) {
    return false;
  }

  if (Platform.OS === 'ios' && Constants.isDevice === false) {
    return false;
  }

  return true;
};

if (__DEV__) {
  if (UI_MODE) {
    appInfo('UI MODE: Using mock data (no backend required)');
  } else {
    appDebug('API Base URL:', API_BASE_URL);
    appDebug('OTP API Base URL:', OTP_API_BASE_URL);
    appDebug('Use local API:', useLocalApi ? 'yes (EXPO_PUBLIC_USE_LOCAL_API)' : 'no');
  }
}

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    emailOtpSend: '/api/email-otp/send',
    emailOtpVerify: '/api/email-otp/verify',
    forgotPasswordSend: '/api/auth/forgot-password/send',
    forgotPasswordReset: '/api/auth/forgot-password/reset',
    emergency: {
      list: '/api/emergency/list',
      submit: '/api/emergency/submit',
    },
    responders: {
      locations: '/api/responders/locations',
    },
  },
};

export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;

export const mockData = {
  login: {
    user: {
      id: 'mock-user-123',
      uid: 'mock-user-123',
      email: 'civilian@test.com',
      phone_number: '+639123456789',
      phone: '+639123456789',
      name: 'Test User',
      role: 'civilian',
      created_at: new Date().toISOString(),
    },
  },
  register: {
    user: {
      id: 'mock-user-123',
      phone_number: '0000000000',
      name: 'New User',
      created_at: new Date().toISOString(),
    },
  },
  emergencyList: {
    reports: [
      {
        id: '1',
        incident_type: 'fire',
        incident_id: 'inc-mock-1',
        location_text: 'Brgy. San Roque, City Center',
        status: 'pending',
        created_at: new Date(Date.now() - 44 * 60000).toISOString(),
      },
      {
        id: '2',
        incident_type: 'medical',
        location_text: 'Brgy. San Roque, City Center',
        status: 'in_progress',
        created_at: new Date(Date.now() - 50 * 60000).toISOString(),
      },
    ],
  },
  emergencySubmit: {
    report: {
      id: 'new-report-123',
      incident_type: 'fire',
      location_text: '789 Pine Rd',
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  },
  responders: {
    responders: [
      {
        id: '1',
        name: 'Engine 7',
        unit_type: 'Fire Truck',
        latitude: 17.6132,
        longitude: 121.727,
        status: 'available',
      },
      {
        id: '2',
        name: 'Ambulance 3',
        unit_type: 'Ambulance',
        latitude: 17.6232,
        longitude: 121.737,
        status: 'en_route',
        assignedIncidentId: 'inc-mock-1',
      },
    ],
  },
};
