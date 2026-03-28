# Firebase FCM device token (`dvToken`) — customer web app & admin/backend integration

This document describes how the **customer-facing laundry web app** obtains a Firebase Cloud Messaging (FCM) **device registration token** and sends it to the API as **`dvToken`**. Use it to align the **admin panel / backend** with the same field name, storage, and push-notification flow.

---

## 1. What is `dvToken`?

| Item                | Description                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name in API**     | `dvToken` (string)                                                                                                                                 |
| **Meaning**         | FCM **registration token** for the current browser session. It identifies _this_ device/browser for push notifications from your Firebase project. |
| **Not the same as** | Firebase Auth ID token, session JWT, or Apple/Google OAuth tokens.                                                                                 |

The backend should treat `dvToken` as an **opaque string** provided by the client. It can change when the user clears site data, uses another browser, or FCM rotates the token.

---

## 2. How the customer app gets the token (high level)

1. **Firebase Web SDK** is initialized in `utilities/firebase.js` (Auth + Messaging).
2. On supported browsers, the app calls **`requestDeviceToken()`** from `utilities/requestFCMToken.js`, which:
   - Requests **notification permission** (`Notification.requestPermission()`).
   - Ensures **Firebase Messaging** is supported (`isSupported()` from `firebase/messaging`).
   - Registers the **service worker** at **`/firebase-messaging-sw.js`** (file in `public/`).
   - Calls **`getToken(messaging, { vapidKey, serviceWorkerRegistration })`** to obtain the FCM registration token.
3. If a token is returned, it is stored in the browser as:
   - **`localStorage` key:** `devToken`  
     (internal client storage name; the **API field remains `dvToken`**.)

---

## 3. Where the customer app sends `dvToken`

The sign-in / registration flows attach **`dvToken`** to the JSON body of customer auth requests, including:

| Typical endpoint (relative to API base URL)          | Usage                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `customer/loginUser`                                 | Email/password and other login paths — body includes `dvToken` when available. |
| `customer/registerCustomer` (via RTK `registerUser`) | Registration payload can include `dvToken`.                                    |

**Contract for backend:**

- **Field name:** `dvToken`
- **Type:** string
- **Optional:** yes — if the user denies notifications, FCM is unsupported, or the service worker fails, the client may send **`""`** (empty string) or omit updating the token. Backend should not require a non-empty `dvToken` for login to succeed unless product rules say otherwise.

---

## 4. Client-side files (reference for your team)

| File                              | Role                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `utilities/firebase.js`           | Firebase app init, Auth providers, `getMessagingInstance`, re-exports `getToken` / `onMessage`.                              |
| `utilities/requestFCMToken.js`    | `requestDeviceToken()` — permission, SW register, `getToken` with **VAPID key** and SW registration.                         |
| `public/firebase-messaging-sw.js` | Service worker: same Firebase **web config** as the app (compat SDK), `onBackgroundMessage` for background notifications.    |
| `src/app/(auth)/sign-in/page.jsx` | Resolves token via `getDeviceToken()` / `localStorage.getItem("devToken")`, passes **`dvToken`** in login/register payloads. |
| `components/Header.jsx`           | Calls `requestDeviceToken()` and `onMessage` for foreground handling (supplementary to sign-in flow).                        |

**VAPID key:** Configured in `utilities/requestFCMToken.js` (`getToken(..., { vapidKey: "..." })`). It must match the **Web Push certificates** / VAPID key pair generated in **Firebase Console → Project settings → Cloud Messaging → Web configuration**.

---

## 5. What the admin panel / backend should implement

### 5.1 Accept and persist `dvToken`

- On **`customer/loginUser`** and **`customer/registerCustomer`** (and any other auth endpoint the app sends `dvToken` to), read **`dvToken`** from the JSON body.
- Store it **per customer user** (and optionally per device if you support multiple tokens per user).
- If `dvToken` is empty, keep the previous stored token or clear only when you explicitly want to remove push for that client.

### 5.2 Send push notifications (FCM HTTP v1 or Admin SDK)

- Use **Firebase Admin SDK** (Node, etc.) or **FCM HTTP v1 API** with a **service account** for the **same Firebase project** as the customer web app.
- Target the stored **`dvToken`** string as the device registration token.
- Handle FCM errors such as **`UNREGISTERED`** / **`INVALID_ARGUMENT`** by removing or invalidating stored tokens.

### 5.3 Admin panel UI (optional)

- Show **“Push enabled”** / **last token updated at** if useful for support.
- Do **not** display full tokens in plain text in shared logs; treat as sensitive device identifiers.

### 5.4 Alignment checklist

- [ ] API accepts **`dvToken`** (string) on login/register payloads used by the customer app.
- [ ] Backend uses the **same Firebase project** as `projectId` in the web app config.
- [ ] VAPID key in Firebase Console matches the key used in `requestFCMToken.js` (if tokens fail to generate, this is a common cause).
- [ ] **`firebase-messaging-sw.js`** is served from the **origin** the customer uses (HTTPS in production); FCM web push requires secure context (except `localhost`).

---

## 6. Foreground vs background (for support / debugging)

| Context        | Behavior in customer app                                                      |
| -------------- | ----------------------------------------------------------------------------- |
| **Foreground** | `onMessage` in `Header.jsx` can show in-app handling (e.g. toast).            |
| **Background** | `firebase-messaging-sw.js` uses `onBackgroundMessage` and `showNotification`. |

Server-side **notification payload** structure should follow FCM docs (`notification` + optional `data`).

---

## 7. Quick glossary

| Term                   | Meaning                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **FCM**                | Firebase Cloud Messaging.                                                                |
| **Registration token** | Long string returned by `getToken()`; this is what the app sends as **`dvToken`**.       |
| **VAPID**              | Voluntary Application Server Identification for Web Push; required for web `getToken()`. |
| **Service worker**     | `firebase-messaging-sw.js` must be registered for background push on the web.            |

---

## 8. Contact

For exact payload shapes of `customer/loginUser` and `customer/registerCustomer`, inspect the customer app’s `src/app/(auth)/sign-in/page.jsx` and RTK mutations in `src/app/store/services/api.js` (`useUserLoginMutation`, `useRegisterUserMutation`).

---

_Document generated from the Laundry customer web app codebase. Update this file if field names or endpoints change._
