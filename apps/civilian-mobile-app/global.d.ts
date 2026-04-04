declare module 'react-native/Libraries/Core/ExceptionsManager' {
  export function handleException(err: Error, isFatal: boolean): void;
}

declare module '@resqlink-internal/text-input-impl' {
  import type { TextInput } from 'react-native';
  const Impl: typeof TextInput;
  export default Impl;
}
