import { useEffect, useMemo, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { googleApiKey } from "./URL";
import {
  GOOGLE_CLOUD_MAPS_SETUP,
  GOOGLE_MAPS_LIBRARIES,
  GoogleMapsContext,
  classifyMapsError,
  useGoogleMaps,
} from "./googleMapsConfig";

function GoogleMapsScriptLoader({ children }) {
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => {
      setAuthError("AuthFailure");
      if (typeof previous === "function") previous();
    };
    return () => {
      window.gm_authFailure = previous;
    };
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "justdry-admin-google-maps",
    googleMapsApiKey: googleApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const mapsError = useMemo(
    () => classifyMapsError(loadError, authError),
    [loadError, authError]
  );

  const value = useMemo(
    () => ({
      hasApiKey: true,
      isLoaded: Boolean(isLoaded) && !mapsError,
      loadError: loadError || null,
      authError,
      mapsError,
      mapsErrorCode: mapsError?.code ?? null,
    }),
    [isLoaded, loadError, authError, mapsError]
  );

  return (
    <GoogleMapsContext.Provider value={value}>{children}</GoogleMapsContext.Provider>
  );
}

export function GoogleMapsProvider({ children }) {
  const missingValue = useMemo(
    () => ({
      hasApiKey: false,
      isLoaded: false,
      loadError: null,
      authError: null,
      mapsError: {
        code: "MissingKey",
        message:
          "Google Maps is not configured. Set VITE_GOOGLE_MAPS_KEY in admin-panel/.env (see .env.example) and restart the Vite dev server. Do not commit the key.",
      },
      mapsErrorCode: "MissingKey",
    }),
    []
  );

  if (!googleApiKey) {
    return (
      <GoogleMapsContext.Provider value={missingValue}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  return <GoogleMapsScriptLoader>{children}</GoogleMapsScriptLoader>;
}

export function MapsUnavailableNotice({ minHeight = 400 }) {
  const { mapsError, mapsErrorCode } = useGoogleMaps();
  const title =
    mapsErrorCode === "MissingKey"
      ? "Google Maps is not configured"
      : mapsErrorCode
        ? `Google Maps error: ${mapsErrorCode}`
        : "Google Maps is unavailable";

  return (
    <div
      role="alert"
      style={{
        minHeight,
        height: minHeight,
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
        <strong>{title}</strong>
        <p className="jd-field__hint" style={{ margin: 0 }}>
          {mapsError?.message || GOOGLE_CLOUD_MAPS_SETUP}
        </p>
      </div>
    </div>
  );
}
