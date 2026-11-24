import { initializeApp, getApps } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";
import { getFirebaseWebConfig } from "./firebaseConfig";

let appInstance = null;

function getFirebaseApp() {
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
 * Firebase project this browser's FCM token belongs to, read from the initialized app
 * (so from VITE_FIREBASE_* config); "" when Firebase is not configured.
 */
export function getFirebaseProjectId() {
  return getFirebaseApp()?.options?.projectId || "";
}

/**
 * Same pattern as customer app: async messaging instance or null.
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
