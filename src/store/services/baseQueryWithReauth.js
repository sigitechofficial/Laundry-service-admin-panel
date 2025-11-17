import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../../utilities/URL";

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');

    // Set default headers
    headers.set('Content-Type', 'application/json');
    headers.set('ngrok-skip-browser-warning', 'true');

    // Add Bearer token if available
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
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
