const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");
const fs = require("node:fs");
const { FileStore } = require("metro-cache");
const { reportErrorToRemote } = require("./__create/report-error-to-remote");
const {
  handleResolveRequestError,
  VIRTUAL_ROOT,
  VIRTUAL_ROOT_UNRESOLVED,
} = require("./__create/handle-resolve-request-error");

const monorepoRoot = path.resolve(__dirname, "..", "..");
const packagesFirebase = path.resolve(monorepoRoot, "packages", "firebase");

const resolveMonorepoPackage = (name) =>
  path.dirname(
    require.resolve(`${name}/package.json`, {
      paths: [monorepoRoot, __dirname],
    }),
  );

const reactNativeRoot = resolveMonorepoPackage("react-native");
const bottomSheetRoot = resolveMonorepoPackage("@gorhom/bottom-sheet");
const bottomSheetLib = path.join(bottomSheetRoot, "lib/module");
const flashListStub = path.resolve(__dirname, "./polyfills/optional/flash-list.js");
const RN_TEXT_INPUT_IMPL = path.join(
  reactNativeRoot,
  "Libraries/Components/TextInput/TextInput.js",
);

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const NATIVE_ALIASES = {
  "./Libraries/Components/TextInput/TextInput": path.resolve(
    __dirname,
    "./polyfills/native/texinput.native.jsx",
  ),
};
const SHARED_ALIASES = {
  "expo-image": path.resolve(__dirname, "./polyfills/shared/expo-image.tsx"),
};
fs.mkdirSync(VIRTUAL_ROOT_UNRESOLVED, { recursive: true });
config.watchFolders = [
  ...config.watchFolders,
  VIRTUAL_ROOT,
  VIRTUAL_ROOT_UNRESOLVED,
  packagesFirebase,
];

// Ensure Metro can resolve the shared Firebase package
config.resolver = {
  ...config.resolver,
  // Add support for .cjs files (required for Firebase)
  sourceExts: [...(config.resolver?.sourceExts || []), "cjs"],
  // Disable unstable package exports resolution (fixes Firebase module resolution)
  unstable_enablePackageExports: false,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    "@packages/firebase": packagesFirebase,
    expo: resolveMonorepoPackage("expo"),
    "react-native": reactNativeRoot,
    "expo-router": resolveMonorepoPackage("expo-router"),
    "expo/virtual/env": path.join(resolveMonorepoPackage("expo"), "virtual", "env"),
    "@gorhom/bottom-sheet": bottomSheetLib,
    "@shopify/flash-list": flashListStub,
  },
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    if (moduleName === "@resqlink-internal/text-input-impl") {
      return { type: "sourceFile", filePath: RN_TEXT_INPUT_IMPL };
    }

    // @gorhom/bottom-sheet "react-native" field points at TypeScript src; use compiled lib.
    if (moduleName === "@gorhom/bottom-sheet") {
      return {
        type: "sourceFile",
        filePath: path.join(bottomSheetLib, "index.js"),
      };
    }

    if (moduleName.startsWith("@gorhom/bottom-sheet/")) {
      const subpath = moduleName.slice("@gorhom/bottom-sheet/".length);
      const libCandidate = path.join(bottomSheetRoot, "lib/module", subpath);
      if (fs.existsSync(libCandidate)) {
        return { type: "sourceFile", filePath: libCandidate };
      }
      if (fs.existsSync(`${libCandidate}.js`)) {
        return { type: "sourceFile", filePath: `${libCandidate}.js` };
      }
    }

    if (moduleName === "@shopify/flash-list") {
      return { type: "sourceFile", filePath: flashListStub };
    }

    if (
      context.originModulePath.startsWith(`${__dirname}/polyfills/native`) ||
      context.originModulePath.startsWith(`${__dirname}/polyfills/shared`)
    ) {
      return context.resolveRequest(context, moduleName, platform);
    }
    // Wildcard alias for Expo Google Fonts
    if (
      moduleName.startsWith("@expo-google-fonts/") &&
      moduleName !== "@expo-google-fonts/dev"
    ) {
      return context.resolveRequest(
        context,
        "@expo-google-fonts/dev",
        platform,
      );
    }
    if (SHARED_ALIASES[moduleName] && !moduleName.startsWith("./polyfills/")) {
      return context.resolveRequest(
        context,
        SHARED_ALIASES[moduleName],
        platform,
      );
    }

    if (NATIVE_ALIASES[moduleName] && !moduleName.startsWith("./polyfills/")) {
      return context.resolveRequest(
        context,
        NATIVE_ALIASES[moduleName],
        platform,
      );
    }
    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    return handleResolveRequestError({ error, context, platform, moduleName });
  }
};

const cacheDir = path.join(__dirname, "caches");
const metroCacheRoot = path.join(cacheDir, ".metro-cache");

// Avoid "Unable to deserialize cloned data" from a stale/corrupt disk cache (common on Windows).
// Set METRO_PERSIST_CACHE=1 to keep the on-disk cache between restarts.
if (process.env.NODE_ENV !== "production" && process.env.METRO_PERSIST_CACHE !== "1") {
  try {
    fs.rmSync(metroCacheRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
try {
  fs.mkdirSync(cacheDir, { recursive: true });
} catch {
  /* ignore */
}

config.cacheStores = () => [
  new FileStore({
    root: metroCacheRoot,
  }),
];
config.resetCache = false;
const originalReporterUpdate = config.reporter?.update?.bind(config.reporter);
config.reporter = {
  ...config.reporter,
  update: (event) => {
    originalReporterUpdate?.(event);
    const reportableErrors = [
      "error",
      "bundling_error",
      "cache_read_error",
      "hmr_client_error",
      "transformer_load_failed",
    ];
    for (const errorType of reportableErrors) {
      if (event.type === errorType) {
        if (errorType === "cache_read_error") {
          try {
            fs.rmSync(cacheDir, { recursive: true, force: true });
            fs.mkdirSync(cacheDir, { recursive: true });
          } catch {
            // no-op
          }
        }
        reportErrorToRemote({ error: event.error }).catch(() => {
          // no-op
        });
      }
    }
    return event;
  },
};

const originalGetTransformOptions = config.transformer.getTransformOptions;

config.transformer = {
  ...config.transformer,
  getTransformOptions: async (entryPoints, options) => {
    if (options.dev === false) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir);
    }
    return await originalGetTransformOptions(entryPoints, options);
  },
};

module.exports = config;
