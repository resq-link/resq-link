import {
  subscribeToOnlineResponderCount,
  updateDispatcherLocation,
  setDispatcherOnlineStatus,
} from "@packages/firebase";

export function subscribeOnlineResponderCount(onCount: (count: number) => void) {
  return subscribeToOnlineResponderCount(onCount);
}

export async function pushDispatcherLocation(latitude: number, longitude: number) {
  return updateDispatcherLocation(latitude, longitude);
}

export async function setDispatcherPresenceOnline(online: boolean) {
  return setDispatcherOnlineStatus(online);
}
