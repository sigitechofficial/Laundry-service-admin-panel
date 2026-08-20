/**
 * Firebase Web config for FCM (admin panel).
 * Prefer VITE_FIREBASE_* (see .env.example). LAUNDRY_FIREBASE_* remains a
 * backward-compatible alias (vite.config.mjs envPrefix).
 * Missing development configuration disables messaging. Production builds
 * validate all required VITE_FIREBASE_* values in vite.config.mjs.
 * Run `npm run sync:fcm-sw` after changing .env so public/firebase-messaging-sw.js matches.
 */

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
  const apiKey = pickEnv("VITE_FIREBASE_API_KEY", "LAUNDRY_FIREBASE_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    authDomain: pickEnv(
      "VITE_FIREBASE_AUTH_DOMAIN",
      "LAUNDRY_FIREBASE_AUTH_DOMAIN"
    ),
    projectId: pickEnv(
      "VITE_FIREBASE_PROJECT_ID",
      "LAUNDRY_FIREBASE_PROJECT_ID"
    ),
    storageBucket: pickEnv(
      "VITE_FIREBASE_STORAGE_BUCKET",
      "LAUNDRY_FIREBASE_STORAGE_BUCKET"
    ),
    messagingSenderId: pickEnv(
      "VITE_FIREBASE_MESSAGING_SENDER_ID",
      "LAUNDRY_FIREBASE_MESSAGING_SENDER_ID"
    ),
    appId: pickEnv("VITE_FIREBASE_APP_ID", "LAUNDRY_FIREBASE_APP_ID"),
  };
}

export function getFirebaseVapidKey() {
  return pickEnv(
    "VITE_FIREBASE_VAPID_KEY",
    "VITE_FIREBASE_MESSAGING_VAPID_KEY",
    "LAUNDRY_FIREBASE_VAPID_KEY"
  );
}
