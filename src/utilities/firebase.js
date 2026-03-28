import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { getFirebaseWebConfig } from "./firebaseConfig";

let appInstance = null;

export { getToken };

export function getFirebaseApp() {
  const config = getFirebaseWebConfig();
  if (!config?.apiKey) return null;
  if (!getApps().length) {
    appInstance = initializeApp(config);
  } else {
    appInstance = getApps()[0];
  }
  return appInstance;
}

/**
 * Same pattern as customer app: async messaging instance or null.
 * Alias: getMessagingInstance (customer naming).
 */
export async function getMessagingInstance() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!(await isSupported())) return null;
  try {
    return getMessaging(app);
  } catch {
    return null;
  }
}

/** @deprecated use getMessagingInstance — kept for any internal refs */
export async function getMessagingWhenReady() {
  return getMessagingInstance();
}
