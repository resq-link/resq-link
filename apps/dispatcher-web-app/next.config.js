const path = require("path");
const os = require("os");

/**
 * Hostnames allowed to request /_next/* in development (LAN phones, alternate IPs).
 * Next.js compares Origin hostname only (not port). localhost is allowed by default.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
function getAllowedDevOrigins() {
  const origins = new Set(["127.0.0.1"]);

  for (const interfaces of Object.values(os.networkInterfaces())) {
    if (!interfaces) continue;
    for (const net of interfaces) {
      if (net.family === "IPv4" && !net.internal) {
        origins.add(net.address);
      }
    }
  }

  const extra = process.env.ALLOWED_DEV_ORIGINS;
  if (extra) {
    for (const entry of extra.split(",")) {
      const trimmed = entry.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  return [...origins];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence cross-origin dev warnings for LAN/mobile testing (Next.js 15.3+)
  allowedDevOrigins: getAllowedDevOrigins(),
  // Monorepo: avoid inferring wrong workspace root when multiple lockfiles exist
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ["firebase-admin"],
  // React Strict Mode double-invokes mount/layout effects in development.
  // With react-leaflet + Next 15, this can trigger duplicate
  // Leaflet initialization on the same container ("Map container is already initialized").
  reactStrictMode: false,
  transpilePackages: ["@packages/firebase", "lucide-react"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Keep dev overlay; avoid experimental flags that change webpack graph mid-restart
  devIndicators: {
    position: "bottom-right",
  },
  webpack: (config, { isServer }) => {
    // Do NOT override config.cache.version here. Next.js sets a version that includes
    // next.config compilation keys (configVars). Replacing it caused stale filesystem
    // cache restores after next.config.js edits → undefined module factories →
    // "Cannot read properties of undefined (reading 'call')" in _not-found/page.js.

    // Ignore React Native modules that aren't available in Next.js
    config.resolve.alias = {
      ...config.resolve.alias,
      "expo-constants": false,
      "@react-native-async-storage/async-storage": false,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "expo-constants": false,
        "@react-native-async-storage/async-storage": false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
