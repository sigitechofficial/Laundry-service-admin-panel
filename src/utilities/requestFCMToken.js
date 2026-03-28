import { getToken } from "firebase/messaging";
import { getFirebaseWebConfig, getFirebaseVapidKey } from "./firebaseConfig";
import { getMessagingInstance } from "./firebase";

const DEV_TOKEN_KEY = "devToken";

function fcmLog(...args) {
  if (import.meta.env.DEV) {
    console.log("[FCM]", ...args);
  }
}

function fcmDevHint(message) {
  if (import.meta.env.DEV) {
    console.warn(
      `[FCM] ${message}\n` +
        "Check: VITE_FIREBASE_* in .env, npm run sync:fcm-sw, allow notifications, https or localhost."
    );
  }
}

/** Cached token without prompting (e.g. for immediate login payload). */
export function getCachedDeviceToken() {
  try {
    return localStorage.getItem(DEV_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Same flow as customer app: permission → getMessagingInstance → register SW (with fallback) → getToken.
 * Returns string for admin API `dvToken` (empty if unavailable).
 */
export async function requestDeviceToken() {
  fcmLog("requestDeviceToken() called");

  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    fcmDevHint("Service workers not available.");
    return getCachedDeviceToken();
  }

  if (!getFirebaseWebConfig()) {
    fcmDevHint("Firebase web config missing.");
    return getCachedDeviceToken();
  }

  if (!("Notification" in window)) {
    fcmDevHint("Notifications API not available.");
    return getCachedDeviceToken();
  }

  const vapidKey = getFirebaseVapidKey();

  try {
    fcmLog("Step 1: notification permission");
    const permission = await Notification.requestPermission();
    fcmLog("permission:", permission);

    if (permission !== "granted") {
      fcmDevHint(`Notification permission was "${permission}" (need "granted").`);
      return getCachedDeviceToken();
    }

    fcmLog("Step 2: getMessagingInstance()");
    const messaging = await getMessagingInstance();
    if (!messaging) {
      fcmDevHint("FCM not supported or messaging init failed.");
      return getCachedDeviceToken();
    }
    fcmLog("messaging instance OK");

    fcmLog("Step 3: service worker");
    let registration;
    try {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      fcmLog("service worker register OK");
    } catch (swError) {
      console.error("[FCM] service worker registration error:", swError);
      registration = await navigator.serviceWorker.getRegistration();
      fcmLog("fallback getRegistration:", registration ? "found" : "none");
    }

    await navigator.serviceWorker.ready;

    fcmLog("Step 4: getToken()");
    const currentToken = await getToken(messaging, {
      vapidKey,
      ...(registration ? { serviceWorkerRegistration: registration } : {}),
    });

    fcmLog("token:", currentToken ? "received" : "empty");

    if (currentToken) {
      localStorage.setItem(DEV_TOKEN_KEY, currentToken);
      return currentToken;
    }

    fcmDevHint(
      "getToken returned empty — check firebase-messaging-sw.js (run sync:fcm-sw), VAPID, hard refresh."
    );
    return getCachedDeviceToken();
  } catch (err) {
    console.error("[FCM] Error getting FCM token:", err);
    fcmDevHint(err?.message || String(err));
    return getCachedDeviceToken();
  }
}
