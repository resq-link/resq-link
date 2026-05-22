const fs = require('node:fs');
const path = require('node:path');

const appJson = require('./app.json');

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

const getEnv = (name) =>
  process.env[`EXPO_PUBLIC_${name}`] ||
  process.env[`NEXT_PUBLIC_${name}`] ||
  localEnv[`EXPO_PUBLIC_${name}`] ||
  localEnv[`NEXT_PUBLIC_${name}`] ||
  '';

module.exports = ({ config }) => {
  const baseConfig = {
    ...appJson.expo,
    ...config,
  };

  return {
    ...baseConfig,
    extra: {
      ...baseConfig.extra,
      firebase: {
        apiKey: getEnv('FIREBASE_API_KEY'),
        authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
        projectId: getEnv('FIREBASE_PROJECT_ID'),
        storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
        appId: getEnv('FIREBASE_APP_ID'),
        databaseURL: getEnv('FIREBASE_DATABASE_URL'),
      },
      agora: {
        appId: getEnv('AGORA_APP_ID'),
      },
    },
  };
};
