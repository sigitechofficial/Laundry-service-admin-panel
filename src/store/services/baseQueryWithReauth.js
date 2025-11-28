import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../../utilities/URL";

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');

    // Don't set Content-Type here - let RTK Query handle it
    // RTK Query automatically detects FormData and won't set Content-Type for it
    // We'll only add it in fetchFn for non-FormData requests

    headers.set('ngrok-skip-browser-warning', 'true');

    // Add Bearer token if available
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
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

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  // check for 403
  if (result?.error?.status === 403) {
    console.warn("Access denied. Logging out...");

    document.cookie =
      "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem("login_status");

    window.location.href = "/auth/login";
  }

  return result;
};

export default baseQueryWithReauth;
