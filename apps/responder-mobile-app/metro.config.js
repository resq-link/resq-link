const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const monorepoRoot = path.resolve(__dirname, '..', '..');
const packagesFirebase = path.resolve(monorepoRoot, 'packages', 'firebase');

const resolveMonorepoPackage = (name) =>
  path.dirname(
    require.resolve(`${name}/package.json`, {
      paths: [monorepoRoot, __dirname],
    }),
  );

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.watchFolders = [
  ...config.watchFolders,
  packagesFirebase,
];

const WEB_ALIASES = {
  'react-native-maps': path.resolve(__dirname, './polyfills/web/maps.web.jsx'),
};

config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'cjs'],
  unstable_enablePackageExports: false,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    '@packages/firebase': packagesFirebase,
    '@react-native-async-storage/async-storage': path.join(
      resolveMonorepoPackage('@react-native-async-storage/async-storage'),
    ),
    expo: resolveMonorepoPackage('expo'),
    'react-native': resolveMonorepoPackage('react-native'),
    'expo-router': resolveMonorepoPackage('expo-router'),
    'expo/virtual/env': path.join(resolveMonorepoPackage('expo'), 'virtual', 'env'),
  },
  resolveRequest: (context, moduleName, platform) => {
    // Use web polyfill for react-native-maps on web platform
    if (platform === 'web' && moduleName === 'react-native-maps' && WEB_ALIASES[moduleName]) {
      return {
        filePath: WEB_ALIASES[moduleName],
        type: 'sourceFile',
      };
    }
    // Use default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;

