import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "@resq/map-screen-cache";

export async function loadMapCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveMapCache(payload) {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...payload,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* best-effort cache */
  }
}

export function formatRelativeUpdatedAt(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
