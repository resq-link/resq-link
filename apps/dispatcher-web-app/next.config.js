/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Ignore React Native modules that aren't available in Next.js
    config.resolve.alias = {
      ...config.resolve.alias,
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

