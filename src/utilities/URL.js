function pickEnv(...keys) {
  for (const key of keys) {
    const value = import.meta.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function isLoopbackHttpUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(String(url || ""));
}

function resolveApiBaseUrl() {
  const configured = pickEnv("VITE_API_BASE_URL", "LAUNDRY_API_BASE_URL");

  // Vite DEV: empty env or loopback → same-origin /api proxy.
  // Empty env must never fall back to a hosted production API.
  if (import.meta.env.DEV && (!configured || isLoopbackHttpUrl(configured))) {
    return "/api/";
  }

  return configured;
}

export const BASE_URL = resolveApiBaseUrl();

/** Maps JavaScript API only (browser-restricted). Geocoding REST goes through /admin/maps/geocode. */
export const googleApiKey = pickEnv(
  "VITE_GOOGLE_MAPS_KEY",
  "LAUNDRY_GOOGLE_MAPS_KEY"
);
