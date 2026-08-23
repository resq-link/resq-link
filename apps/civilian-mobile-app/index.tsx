import "react-native-gesture-handler";
import "./src/utils/configureDevLogBox";

import "react-native-url-polyfill/auto";
import "./src/lib/create/polyfills";
global.Buffer = require("buffer").Buffer;

import "expo-router/entry";
import { App } from "expo-router/build/qualified-entry";
import type { ReactNode } from "react";
import { AppRegistry } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootErrorBoundary } from "./src/components/RootErrorBoundary";

const isAnythingApp =
  process.env.EXPO_PUBLIC_IS_ANYTHING_APP === JSON.stringify(true);

function RootWrapper({ children }: { children: ReactNode }) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}

function WrapperComponentProvider({ children }: { children: ReactNode }) {
  let content: ReactNode = <RootWrapper>{children}</RootWrapper>;

  if (isAnythingApp) {
    // Lazy-load Create Anything tooling only when that flag is on.
    // Production RESQ-Link must never import anything-menu (native TurboModule abort).
    const AnythingMenu = require("./src/lib/create/anything-menu").default;
    content = <AnythingMenu>{children}</AnythingMenu>;
  } else if (__DEV__) {
    const {
      DeviceErrorBoundaryWrapper,
    } = require("./__create/DeviceErrorBoundary");
    content = (
      <DeviceErrorBoundaryWrapper>
        <RootWrapper>{children}</RootWrapper>
      </DeviceErrorBoundaryWrapper>
    );
  }

  // Always wrap so release/TestFlight recovers from uncaught JS errors.
  return <RootErrorBoundary>{content}</RootErrorBoundary>;
}

AppRegistry.setWrapperComponentProvider(() => WrapperComponentProvider);
AppRegistry.registerComponent("main", () => App);
