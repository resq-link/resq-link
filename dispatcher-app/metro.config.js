const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const packagesFirebase = path.resolve(__dirname, '..', 'packages', 'firebase');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.watchFolders = [
  ...config.watchFolders,
  packagesFirebase,
];

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
};

module.exports = config;

