/**
 * Firebase Web config for FCM (admin panel).
 * Accepts either LAUNDRY_FIREBASE_* or VITE_FIREBASE_* (see vite.config.mjs envPrefix).
 * Run `npm run sync:fcm-sw` after changing .env so public/firebase-messaging-sw.js matches.
 */

/** Web Push VAPID public key (same laundry customer app — safe to ship; env overrides). */
export const LAUNDRY_WEB_PUSH_PUBLIC_KEY =
  "BHqdkpwqEH9B9Rnw_lsvJz9cfuNyo-c8wPXLLexm6X9E0gryGLxztXXvGfqazZL7frP2D6GL9B1MO9JObNiYrRE";

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
  const apiKey = pickEnv("LAUNDRY_FIREBASE_API_KEY", "VITE_FIREBASE_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    authDomain: pickEnv("LAUNDRY_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: pickEnv("LAUNDRY_FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID"),
    storageBucket: pickEnv("LAUNDRY_FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: pickEnv(
      "LAUNDRY_FIREBASE_MESSAGING_SENDER_ID",
      "VITE_FIREBASE_MESSAGING_SENDER_ID"
    ),
    appId: pickEnv("LAUNDRY_FIREBASE_APP_ID", "VITE_FIREBASE_APP_ID"),
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
