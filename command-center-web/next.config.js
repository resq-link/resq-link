const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Preserve existing aliases and add path alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      'expo-constants': false,
      '@react-native-async-storage/async-storage': false,
    };
    
    // Also ignore these modules in webpack externals
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'expo-constants': false,
        '@react-native-async-storage/async-storage': false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig

