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
