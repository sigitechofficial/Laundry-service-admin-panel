import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../../utilities/URL";
import {
  LS_ACCESS_TOKEN,
  LS_EMPLOYEE_FEATURE_IDS,
  clearAuthTokens,
  getActiveEmployeeFeatureId,
} from "../../utilities/authStorage";

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: "include",
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
  // Override fetch to handle FormData and JSON properly
  fetchFn: async (input, init) => {
    // Debug logging for FormData requests
    if (init?.body instanceof FormData) {
      console.log('Sending FormData request:', {
        url: input,
        method: init.method,
        bodyType: 'FormData'
      });

      // Log FormData contents
      for (let [key, value] of init.body.entries()) {
        if (value instanceof File) {
          console.log(`FormData ${key}:`, {
            name: value.name,
            size: value.size,
            type: value.type
          });
        } else {
          console.log(`FormData ${key}:`, value);
        }
      }

      // Ensure Content-Type is removed - browser will set it with boundary
      const headers = new Headers(init.headers || {});
      headers.delete('Content-Type');
      console.log('Headers after FormData processing:', Object.fromEntries(headers));
      init.headers = headers;
    } else if (init?.body && typeof init.body === 'object' && !(init.body instanceof FormData) && !(init.body instanceof Blob) && !(init.body instanceof ArrayBuffer)) {
      // For JSON requests, ensure Content-Type is set
      const headers = new Headers(init.headers || {});
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      init.headers = headers;
    }
    return fetch(input, init);
  }
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

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (shouldForceLogout(result?.error)) {
    console.warn("Session expired/invalid. Logging out...");
    document.cookie =
      "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    clearAuthTokens();
    localStorage.removeItem("login_status");
    window.location.href = "/auth/login";
  }

  return result;
};

export default baseQueryWithReauth;
