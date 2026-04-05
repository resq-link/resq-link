const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ["firebase-admin"],
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'expo-constants': false,
      '@react-native-async-storage/async-storage': false,
    };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'expo-constants': false,
        '@react-native-async-storage/async-storage': false,
      };
    }
    if (isServer) {
      const prev = config.externals;
      const asArray = Array.isArray(prev)
        ? prev
        : prev != null
          ? [prev]
          : [];
      config.externals = [
        ...asArray,
        ({ request }, callback) => {
          if (!request) {
            return callback();
          }
          if (
            request === "firebase-admin" ||
            request.startsWith("firebase-admin/") ||
            request.startsWith("@google-cloud/") ||
            request === "google-auth-library" ||
            request.startsWith("google-auth-library/") ||
            request === "google-gax" ||
            request.startsWith("google-gax/") ||
            request.startsWith("@grpc/") ||
            request === "gcp-metadata" ||
            request === "gaxios" ||
            request.startsWith("teeny-request")
          ) {
            return callback(undefined, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
