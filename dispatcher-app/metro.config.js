const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const packagesFirebase = path.resolve(__dirname, '..', 'packages', 'firebase');

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
    expo: path.resolve(__dirname, 'node_modules', 'expo'),
    'react-native': path.resolve(__dirname, 'node_modules', 'react-native'),
    'expo/virtual/env': path.resolve(__dirname, 'node_modules', 'expo', 'virtual', 'env'),
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

