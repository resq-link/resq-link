import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Deployed RESQ-LINK web app (LiveKit token API, etc.). */
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

const API_BASE_URL = getApiBaseUrl();

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    calls: {
      token: '/api/calls/token',
    },
  },
};

export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;
