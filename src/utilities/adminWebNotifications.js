import { onMessage } from "firebase/messaging";
import { getMessagingInstance } from "./firebase";
import { requestDeviceToken, getCachedDeviceToken } from "./requestFCMToken";
import { BASE_URL } from "./URL";
import { LS_ACCESS_TOKEN } from "./authStorage";

let foregroundStarted = false;
let registerInFlight = null;

function apiRoot() {
  return String(BASE_URL || "").replace(/\/$/, "");
}

function extractTitleBody(payload = {}) {
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "Laundry Admin";
  const body =
    payload.notification?.body ||
    payload.data?.body ||
    payload.data?.message ||
    "";
  return { title: String(title), body: String(body) };
}

/**
 * Show a browser notification when the admin tab is focused (FCM onMessage).
 * Background / closed-tab pushes are handled by public/firebase-messaging-sw.js.
 */
export async function startAdminForegroundNotifications({ onNotify } = {}) {
  if (foregroundStarted || typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;

  const messaging = await getMessagingInstance();
  if (!messaging) return false;

  onMessage(messaging, (payload) => {
    const { title, body } = extractTitleBody(payload);
    console.log("[FCM] foreground message", { title, body, data: payload.data });

    if (typeof onNotify === "function") {
      try {
        onNotify({ title, body, payload });
      } catch (_) {
        /* ignore */
      }
    }

    if (Notification.permission === "granted") {
      try {
        const n = new Notification(title, {
          body,
          icon: "/images/logo.png",
          tag: payload.data?.alertType || payload.data?.type || `admin_${Date.now()}`,
          data: payload.data || {},
        });
        n.onclick = () => {
          window.focus();
          n.close();
          const type = payload.data?.alertType || payload.data?.type;
          if (type === "payment_failed") {
            window.location.href = "/orders/payment-failures";
          } else if (payload.data?.bookingId && payload.data.bookingId !== "0") {
            window.location.href = `/orders/order-details/${payload.data.bookingId}`;
          }
        };
      } catch (err) {
        console.warn("[FCM] Notification() failed", err);
      }
    }
  });

  foregroundStarted = true;
  console.log("[FCM] foreground listener ready");
  return true;
}

/**
 * Request permission, get FCM token, register it with the backend for the logged-in admin.
 */
export async function ensureAdminFcmRegistered() {
  if (typeof window === "undefined") {
    return { ok: false, reason: "NO_WINDOW" };
  }
  if (registerInFlight) return registerInFlight;

  registerInFlight = (async () => {
    try {
      const accessToken = localStorage.getItem(LS_ACCESS_TOKEN);
      if (!accessToken) {
        return { ok: false, reason: "NOT_LOGGED_IN" };
      }

      if ("Notification" in window && Notification.permission === "denied") {
        return { ok: false, reason: "PERMISSION_DENIED" };
      }

      const token = await requestDeviceToken();
      if (!token || token.length < 80 || /^no-fcm/i.test(token)) {
        return {
          ok: false,
          reason: "NO_TOKEN",
          cached: Boolean(getCachedDeviceToken()),
        };
      }

      const res = await fetch(`${apiRoot()}/admin/notification-preferences/register-fcm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ dvToken: token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status === "0") {
        return {
          ok: false,
          reason: "REGISTER_FAILED",
          message: json?.message || res.statusText,
        };
      }
      return { ok: true, tokenPreview: json?.data?.tokenPreview };
    } catch (err) {
      return { ok: false, reason: "ERROR", message: err?.message };
    } finally {
      registerInFlight = null;
    }
  })();

  return registerInFlight;
}
