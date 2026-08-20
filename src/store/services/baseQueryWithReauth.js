import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../../utilities/URL";
import {
  LS_ACCESS_TOKEN,
  LS_EMPLOYEE_FEATURE_IDS,
  clearAuthTokens,
  getActiveEmployeeFeatureId,
} from "../../utilities/authStorage";
import {
  getRequestMethod,
  isRetryableGetError,
  normalizeApiError,
} from "./apiErrors";

/** Abort in-flight requests that exceed this budget. */
export const API_REQUEST_TIMEOUT_MS = 30_000;

/** Extra GET attempts after the first failure (2 retries = 3 total tries). */
const GET_RETRY_MAX = 2;
const GET_RETRY_BASE_DELAY_MS = 400;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: "include",
  timeout: API_REQUEST_TIMEOUT_MS,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem(LS_ACCESS_TOKEN);
    const activeFeatureId = getActiveEmployeeFeatureId();
    const featureIdsCsv = localStorage.getItem(LS_EMPLOYEE_FEATURE_IDS);

    headers.set("ngrok-skip-browser-warning", "true");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Zone employee: prefer current sidebar section (single id); else all allowed ids from login.
    // Header name must be all lowercase (backend expects `featureid`, not `Featureid`).
    if (activeFeatureId) {
      headers.set("featureid", activeFeatureId);
    } else if (featureIdsCsv) {
      headers.set("featureid", featureIdsCsv);
    }

    return headers;
  },
  // Override fetch to handle FormData and JSON properly.
  fetchFn: async (input, init) => {
    if (init?.body instanceof FormData) {
      // The browser must set the multipart boundary. Never log form contents:
      // admin forms may contain personal data and uploaded documents.
      const headers = new Headers(init.headers || {});
      headers.delete("Content-Type");
      init.headers = headers;
    } else if (
      init?.body &&
      typeof init.body === "object" &&
      !(init.body instanceof FormData) &&
      !(init.body instanceof Blob) &&
      !(init.body instanceof ArrayBuffer)
    ) {
      // For JSON requests, ensure Content-Type is set
      const headers = new Headers(init.headers || {});
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      init.headers = headers;
    }
    return fetch(input, init);
  },
});

const shouldForceLogout = (error) => {
  const status = Number(error?.status);
  if (status === 401) return true;

  // Some backends can reply 403 for expired/invalid auth.
  if (status === 403) {
    const message = String(
      error?.data?.message || error?.data?.error || error?.error || ""
    ).toLowerCase();
    return (
      message.includes("jwt") ||
      message.includes("token") ||
      message.includes("unauthorized") ||
      message.includes("not authenticated") ||
      message.includes("session")
    );
  }

  return false;
};

/** Login/sign-in calls also return 401 for bad credentials — do not hard-redirect. */
const isCredentialAuthRequest = (args) => {
  const url = typeof args === "string" ? args : args?.url;
  if (!url) return false;
  const path = String(url).toLowerCase();
  return (
    path.includes("adminsignin") ||
    path.includes("zoneadminsignin") ||
    path.includes("/login") ||
    path.includes("sign-in") ||
    path.includes("signin")
  );
};

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason || new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason || new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const method = getRequestMethod(args);
  let attempt = 0;

  // Retry GET only: network / 502 / 503 / 504. Never retry writes or 401.
  while (
    result?.error &&
    attempt < GET_RETRY_MAX &&
    !api.signal?.aborted &&
    isRetryableGetError(result.error, method)
  ) {
    attempt += 1;
    const backoffMs = GET_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
    try {
      await sleep(backoffMs, api.signal);
    } catch {
      break;
    }
    if (api.signal?.aborted) break;
    result = await rawBaseQuery(args, api, extraOptions);
  }

  if (shouldForceLogout(result?.error) && !isCredentialAuthRequest(args)) {
    console.warn("Session expired/invalid. Logging out...");
    document.cookie =
      "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    clearAuthTokens();
    localStorage.removeItem("login_status");
    // Avoid reload loop if already on the login screen
    if (!window.location.pathname.includes("/auth/login")) {
      window.location.href = "/auth/login";
    }
  }

  if (result?.error) {
    const retryAfter = result.meta?.response?.headers?.get?.("Retry-After");
    const error = retryAfter
      ? { ...result.error, retryAfter }
      : result.error;
    return { ...result, error: normalizeApiError(error) };
  }

  return result;
};

export default baseQueryWithReauth;
