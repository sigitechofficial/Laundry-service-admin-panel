import { createContext, useContext } from "react";

export const GOOGLE_MAPS_LIBRARIES = ["places", "drawing"];

export const GOOGLE_CLOUD_MAPS_SETUP = [
  "Google Cloud Console → APIs & Services → Library: enable Maps JavaScript API (includes the Drawing library) and Places API. Geocoding REST uses GOOGLE_MAPS_KEY on the API host, not this browser key.",
  "Enable billing on the Cloud project. A key without billing shows “For development purposes only” or AuthFailure.",
  "Credentials → your browser key → Application restrictions → HTTP referrers must include http://localhost:5174/*, http://127.0.0.1:5174/*, and http://<LAN-IP>:5174/*.",
  "API restrictions on the browser key must allow Maps JavaScript API and Places API.",
  "Vite reads VITE_GOOGLE_MAPS_KEY at startup — restart npm run dev after changing .env. Do not commit the key.",
].join(" ");

export function classifyMapsError(loadError, authError) {
  if (authError) {
    const code = String(authError);
    return {
      code,
      message: `Google Maps rejected the API key (${code}). ${GOOGLE_CLOUD_MAPS_SETUP}`,
    };
  }
  if (!loadError) return null;
  const text = String(loadError.message || loadError);
  if (/InvalidKey/i.test(text)) {
    return { code: "InvalidKey", message: `InvalidKey: ${text}. ${GOOGLE_CLOUD_MAPS_SETUP}` };
  }
  if (/RefererNotAllowed/i.test(text)) {
    return {
      code: "RefererNotAllowed",
      message: `RefererNotAllowed: this origin is not on the key’s HTTP referrer list. Add http://localhost:5174/* and http://<LAN-IP>:5174/*. ${text}`,
    };
  }
  if (/BillingNotEnabled/i.test(text)) {
    return {
      code: "BillingNotEnabled",
      message: `BillingNotEnabled: enable billing on the Google Cloud project that owns VITE_GOOGLE_MAPS_KEY. ${text}`,
    };
  }
  if (/ApiNotActivated|ApiNotEnabled|not authorized/i.test(text)) {
    return {
      code: "ApiNotActivated",
      message: `A required Maps API is not enabled. Enable Maps JavaScript API, Places API, and Geocoding API. ${text}`,
    };
  }
  return { code: "LoadFailed", message: text };
}

export const GoogleMapsContext = createContext({
  hasApiKey: false,
  isLoaded: false,
  loadError: null,
  authError: null,
  mapsError: null,
  mapsErrorCode: null,
});

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}

export function triggerGoogleMapResize(mapInstance, centerPoint) {
  if (!mapInstance || typeof window === "undefined") return;
  const maps = window.google?.maps;
  if (!maps?.event?.trigger) return;
  maps.event.trigger(mapInstance, "resize");
  if (centerPoint?.lat != null && centerPoint?.lng != null) {
    mapInstance.setCenter(centerPoint);
  }
}
