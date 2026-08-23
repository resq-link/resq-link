import "react-native-gesture-handler";
import "./src/utils/configureDevLogBox";

import "react-native-url-polyfill/auto";
import "./src/lib/create/polyfills";
global.Buffer = require("buffer").Buffer;

import "expo-router/entry";
import { App } from "expo-router/build/qualified-entry";
import type { ReactNode } from "react";
import { AppRegistry } from "react-native";
import { DeviceErrorBoundaryWrapper } from "./__create/DeviceErrorBoundary";
import { RootErrorBoundary } from "./src/components/RootErrorBoundary";
import AnythingMenu from "./src/lib/create/anything-menu";

function AnythingMenuWrapper({ children }: { children: ReactNode }) {
  return <AnythingMenu>{children}</AnythingMenu>;
}

function WrapperComponentProvider({ children }: { children: ReactNode }) {
  const content = <AnythingMenuWrapper>{children}</AnythingMenuWrapper>;

  // Always wrap with RootErrorBoundary so release/TestFlight builds
  // recover from uncaught JS errors instead of crashing.
  if (__DEV__) {
    return (
      <RootErrorBoundary>
        <DeviceErrorBoundaryWrapper>{content}</DeviceErrorBoundaryWrapper>
      </RootErrorBoundary>
    );
  }

  return <RootErrorBoundary>{content}</RootErrorBoundary>;
}

AppRegistry.setWrapperComponentProvider(() => WrapperComponentProvider);
AppRegistry.registerComponent("main", () => App);
