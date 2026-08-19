/**
 * Centralized logging for the civilian mobile app.
 * debug — development only
 * info — important lifecycle (dev only by default)
 * warnOnce — deduplicated warnings
 */

const warnedKeys = new Set();

function isDev() {
  return typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
}

export function appDebug(...args) {
  if (isDev()) {
    console.log(...args);
  }
}

export function appInfo(...args) {
  if (isDev()) {
    console.log(...args);
  }
}

export function appWarn(...args) {
  console.warn(...args);
}

export function appWarnOnce(key, ...args) {
  if (warnedKeys.has(key)) {
    return;
  }
  warnedKeys.add(key);
  console.warn(...args);
}

export function appError(...args) {
  console.error(...args);
}
