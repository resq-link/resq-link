import "./src/utils/configureDevLogBox";

import "react-native-url-polyfill/auto";
import "./src/__create/polyfills";
global.Buffer = require("buffer").Buffer;

import "expo-router/entry";
import { App } from "expo-router/build/qualified-entry";
import type { ReactNode } from "react";
import { AppRegistry } from "react-native";
import { DeviceErrorBoundaryWrapper } from "./__create/DeviceErrorBoundary";
import AnythingMenu from "./src/__create/anything-menu";

function AnythingMenuWrapper({ children }: { children: ReactNode }) {
  return <AnythingMenu>{children}</AnythingMenu>;
}

let WrapperComponentProvider: React.ComponentType<{ children: ReactNode }> =
  AnythingMenuWrapper;

if (__DEV__) {
  WrapperComponentProvider = ({ children }) => (
    <DeviceErrorBoundaryWrapper>
      <AnythingMenuWrapper>{children}</AnythingMenuWrapper>
    </DeviceErrorBoundaryWrapper>
  );
}

AppRegistry.setWrapperComponentProvider(() => WrapperComponentProvider);
AppRegistry.registerComponent("main", () => App);
