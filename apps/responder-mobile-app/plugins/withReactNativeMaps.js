/**
 * Expo config plugin to link react-native-maps into the iOS build.
 *
 * react-native-maps v1.x does not ship its own Expo config plugin, and in
 * this npm-workspaces monorepo the package is hoisted to the root
 * node_modules — which means the React Native community CLI autolinking
 * (use_native_modules!) running from the app's ios/ directory cannot
 * find it.
 *
 * This plugin patches the generated Podfile so CocoaPods knows where
 * to find the react-native-maps podspec at `pod install` time and enables
 * CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES.
 */
const { withDangerousMod } = require('expo/config-plugins');
const path = require('node:path');
const fs = require('node:fs');

function resolveMonorepoMaps(projectRoot) {
  try {
    return path.dirname(
      require.resolve('react-native-maps/package.json', {
        paths: [projectRoot, path.resolve(projectRoot, '..', '..')],
      })
    );
  } catch {
    return null;
  }
}

function withReactNativeMaps(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, 'ios');
      const podfilePath = path.join(iosDir, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        return cfg;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const mapsRoot = resolveMonorepoMaps(projectRoot);
      if (!mapsRoot) {
        console.warn(
          '[withReactNativeMaps] Could not resolve react-native-maps — skipping Podfile patch'
        );
        return cfg;
      }

      // Normalise for Ruby (forward slashes work on all platforms in Ruby)
      const podspecDir = mapsRoot.replace(/\\/g, '/');

      // ── 1. Add pod declaration after use_expo_modules! ──
      if (!podfile.includes("'react-native-maps'")) {
        const anchor = 'use_expo_modules!';
        const insertionIndex = podfile.indexOf(anchor);
        if (insertionIndex === -1) {
          console.warn(
            '[withReactNativeMaps] Could not find use_expo_modules! in Podfile — skipping pod injection'
          );
          return cfg;
        }

        const insertAfter = insertionIndex + anchor.length;
        const podEntries = [
          '',
          '',
          '  # react-native-maps (injected by withReactNativeMaps config plugin)',
          `  pod 'react-native-maps', :path => '${podspecDir}'`,
        ].join('\n');

        podfile =
          podfile.slice(0, insertAfter) + podEntries + podfile.slice(insertAfter);

        console.log(
          `[withReactNativeMaps] Patched Podfile with react-native-maps from ${podspecDir}`
        );
      }

      // ── 2. Allow non-modular includes and suppress clang warnings ──
      const nonModularFix = `
    # Fix non-modular headers and warnings for react-native-maps
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        build_config.build_settings['OTHER_CFLAGS'] ||= ['$(inherited)']
        if !build_config.build_settings['OTHER_CFLAGS'].include?('-Wno-error=non-modular-include-in-framework-module')
          build_config.build_settings['OTHER_CFLAGS'] << ' -Wno-error=non-modular-include-in-framework-module'
        end
      end
    end`;

      if (!podfile.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        const postInstallAnchor = 'post_install do |installer|';
        const postInstallIdx = podfile.indexOf(postInstallAnchor);
        if (postInstallIdx !== -1) {
          const insertAt = postInstallIdx + postInstallAnchor.length;
          podfile =
            podfile.slice(0, insertAt) + nonModularFix + podfile.slice(insertAt);

          console.log(
            '[withReactNativeMaps] Patched post_install with non-modular header fix'
          );
        }
      }

      fs.writeFileSync(podfilePath, podfile, 'utf8');
      return cfg;
    },
  ]);
}

module.exports = withReactNativeMaps;
