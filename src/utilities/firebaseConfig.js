/**
 * Firebase Web config for FCM (admin panel).
 * Accepts either LAUNDRY_FIREBASE_* or VITE_FIREBASE_* (see vite.config.mjs envPrefix).
 * Falls back to the shared laundry-app-bf43c web app (same as customer Flutter web).
 * Run `npm run sync:fcm-sw` after changing .env so public/firebase-messaging-sw.js matches.
 */

/** Web Push VAPID public key (same laundry customer app — safe to ship; env overrides). */
export const LAUNDRY_WEB_PUSH_PUBLIC_KEY =
  "BHqdkpwqEH9B9Rnw_lsvJz9cfuNyo-c8wPXLLexm6X9E0gryGLxztXXvGfqazZL7frP2D6GL9B1MO9JObNiYrRE";

/** Default web app config from laundryCustomer firebase_options.dart (public client keys). */
export const DEFAULT_FIREBASE_WEB_CONFIG = {
  apiKey: "AIzaSyDdZLCsf0CQN_DIkE0mAOmRv9_pvlRq2qg",
  authDomain: "laundry-app-bf43c.firebaseapp.com",
  projectId: "laundry-app-bf43c",
  storageBucket: "laundry-app-bf43c.firebasestorage.app",
  messagingSenderId: "880600214434",
  appId: "1:880600214434:web:9f770646a7fcf4d95ee0fb",
};

function pickEnv(...keys) {
  for (const key of keys) {
    const v = import.meta.env[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

export function getFirebaseWebConfig() {
  const apiKey =
    pickEnv("LAUNDRY_FIREBASE_API_KEY", "VITE_FIREBASE_API_KEY") ||
    DEFAULT_FIREBASE_WEB_CONFIG.apiKey;
  if (!apiKey) return null;
  return {
    apiKey,
    authDomain:
      pickEnv("LAUNDRY_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_AUTH_DOMAIN") ||
      DEFAULT_FIREBASE_WEB_CONFIG.authDomain,
    projectId:
      pickEnv("LAUNDRY_FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID") ||
      DEFAULT_FIREBASE_WEB_CONFIG.projectId,
    storageBucket:
      pickEnv("LAUNDRY_FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_STORAGE_BUCKET") ||
      DEFAULT_FIREBASE_WEB_CONFIG.storageBucket,
    messagingSenderId:
      pickEnv(
        "LAUNDRY_FIREBASE_MESSAGING_SENDER_ID",
        "VITE_FIREBASE_MESSAGING_SENDER_ID"
      ) || DEFAULT_FIREBASE_WEB_CONFIG.messagingSenderId,
    appId:
      pickEnv("LAUNDRY_FIREBASE_APP_ID", "VITE_FIREBASE_APP_ID") ||
      DEFAULT_FIREBASE_WEB_CONFIG.appId,
  };
}

export function getFirebaseVapidKey() {
  const fromEnv = pickEnv(
    "LAUNDRY_FIREBASE_VAPID_KEY",
    "VITE_FIREBASE_VAPID_KEY",
    "VITE_FIREBASE_MESSAGING_VAPID_KEY"
  );
  return fromEnv || LAUNDRY_WEB_PUSH_PUBLIC_KEY;
}
