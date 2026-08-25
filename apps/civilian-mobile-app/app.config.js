const fs = require('node:fs');
const path = require('node:path');

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return values;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return values;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      values[key] = value.replace(/^['"]|['"]$/g, '');
      return values;
    }, {});
}

const localEnv = loadLocalEnv();

/** Production RESQ-LINK web app (email OTP, password reset). */
const PRODUCTION_API_URL = 'https://www.resq-link.com';

const getEnv = (name) =>
  process.env[name] ||
  process.env[`EXPO_PUBLIC_${name}`] ||
  process.env[`NEXT_PUBLIC_${name}`] ||
  localEnv[name] ||
  localEnv[`EXPO_PUBLIC_${name}`] ||
  localEnv[`NEXT_PUBLIC_${name}`] ||
  '';

const navigationBarPlugin = [
  'expo-navigation-bar',
  {
    visibility: 'hidden',
    backgroundColor: '#00000000',
  },
];

module.exports = ({ config }) => {
  const baseConfig = config;
  const googleMapsApiKey =
    getEnv('GOOGLE_MAPS_API_KEY') ||
    getEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY') ||
    getEnv('FIREBASE_API_KEY') ||
    getEnv('EXPO_PUBLIC_FIREBASE_API_KEY') ||
    baseConfig.extra?.googleMaps?.apiKey ||
    baseConfig.android?.config?.googleMaps?.apiKey ||
    'AIzaSyCWLfP5vbHiFTiDQCG3YVxKu8iehstmo0g';
  const apiUrl =
    getEnv('EXPO_PUBLIC_API_URL') ||
    getEnv('API_URL') ||
    baseConfig.extra?.apiUrl ||
    PRODUCTION_API_URL;
  const otpApiUrl =
    getEnv('EXPO_PUBLIC_OTP_API_URL') ||
    getEnv('OTP_API_URL') ||
    baseConfig.extra?.otpApiUrl ||
    apiUrl;
  const isAndroidBuild = process.env.EAS_BUILD_PLATFORM === 'android';

  const plugins = (baseConfig.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== 'expo-navigation-bar';
  });

  if (isAndroidBuild) {
    plugins.push(navigationBarPlugin);
  }

  const androidConfig = {
    ...baseConfig.android,
    config: {
      ...baseConfig.android?.config,
      googleMaps: {
        ...baseConfig.android?.config?.googleMaps,
        apiKey: googleMapsApiKey,
      },
    },
  };

  return {
    ...baseConfig,
    plugins,
    ios: {
      ...baseConfig.ios,
      ...(googleMapsApiKey
        ? {
            config: {
              ...baseConfig.ios?.config,
              googleMapsApiKey,
            },
          }
        : null),
    },
    android: androidConfig,
    extra: {
      ...baseConfig.extra,
      apiUrl,
      otpApiUrl,
      firebase: {
        apiKey: getEnv('FIREBASE_API_KEY'),
        authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
        projectId: getEnv('FIREBASE_PROJECT_ID'),
        storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
        appId: getEnv('FIREBASE_APP_ID'),
      },
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  };
};
