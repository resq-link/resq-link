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
  serverExternalPackages: ["firebase-admin", "resend"],
  // React Strict Mode double-invokes mount/layout effects in development.
  // With react-leaflet + Next 15, this can trigger duplicate
  // Leaflet initialization on the same container ("Map container is already initialized").
  reactStrictMode: false,
  transpilePackages: ["@packages/firebase"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Turbopack cannot resolve Windows absolute paths ("windows imports are not implemented yet").
  // Keep aliases relative; default `npm run dev` uses webpack until that is fixed.
  turbopack: {
    resolveAlias: {
      "@packages/firebase": "../../packages/firebase/src/index.ts",
      "expo-constants": "./lib/empty-module.js",
      "@react-native-async-storage/async-storage": "./lib/empty-module.js",
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    // Legacy dispatcher bookmarks are gated in middleware (workspace check first),
    // then rewritten to canonical /command-center/* routes there.
    return [
      { source: "/admin", destination: "/admin/dashboard", permanent: false },
      { source: "/admin/profile", destination: "/admin/settings", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/admin/accounts/list", destination: "/api/accounts/list" },
      { source: "/api/admin/accounts/disable", destination: "/api/accounts/disable" },
      { source: "/api/admin/accounts/enable", destination: "/api/accounts/enable" },
      { source: "/api/admin/accounts/reset-password", destination: "/api/accounts/reset-password" },
      { source: "/api/admin/accounts/update-staff", destination: "/api/accounts/update-staff" },
      { source: "/api/admin/accounts/create-dispatcher", destination: "/api/create-dispatcher" },
      { source: "/api/admin/accounts/create-responder", destination: "/api/create-responder" },
      { source: "/api/admin/accounts/create-civilian", destination: "/api/create-civilian" },
      { source: "/api/admin/accounts/create-command-center", destination: "/api/create-command-center" },
      { source: "/api/admin/kyc/list", destination: "/api/kyc/list" },
      { source: "/api/admin/kyc/approve", destination: "/api/kyc/approve" },
      { source: "/api/admin/kyc/reject", destination: "/api/kyc/reject" },
      { source: "/api/admin/audit", destination: "/api/audit" },
      { source: "/api/admin/notifications", destination: "/api/notifications" },
      { source: "/api/admin/notifications/mark-read", destination: "/api/notifications/mark-read" },
      { source: "/api/admin/agencies", destination: "/api/agencies" },
      { source: "/api/admin/agencies/:id", destination: "/api/agencies/:id" },
      { source: "/api/admin/agencies/:id/disable", destination: "/api/agencies/:id/disable" },
      { source: "/api/admin/agencies/:id/enable", destination: "/api/agencies/:id/enable" },
      { source: "/api/admin/settings/me", destination: "/api/settings/me" },
      { source: "/api/admin/settings/profile", destination: "/api/settings/profile" },
      { source: "/api/admin/settings/password-changed", destination: "/api/settings/password-changed" },
      { source: "/api/admin/stats", destination: "/api/stats/overview" },
      { source: "/api/admin/command-centers/update", destination: "/api/command-centers/update" },
      { source: "/api/admin/teams/list", destination: "/api/teams/list" },
      { source: "/api/command-center/agent/chat", destination: "/api/agent/chat" },
      { source: "/api/command-center/team-members/create", destination: "/api/create-team-member" },
      { source: "/api/public/email-otp/send", destination: "/api/email-otp/send" },
      { source: "/api/public/email-otp/verify", destination: "/api/email-otp/verify" },
      { source: "/api/public/auth/forgot-password/send", destination: "/api/auth/forgot-password/send" },
      { source: "/api/public/auth/forgot-password/reset", destination: "/api/auth/forgot-password/reset" },
    ];
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
      "@packages/firebase$": path.resolve(
        __dirname,
        "../../packages/firebase/src/index.ts"
      ),
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

    // Do not enable webpack lazyCompilation. Its EventSource onerror path
    // surfaces in the Next.js overlay as a Runtime Error of "[object Event]"
    // and races when two `next dev` processes share `.next`.

    return config;
  },
};

module.exports = nextConfig;
