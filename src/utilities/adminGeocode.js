import { BASE_URL } from "./URL";
import { LS_ACCESS_TOKEN } from "./authStorage";
import {
  fetchWithTimeout,
  getHttpResponseErrorMessage,
} from "../store/services/fetchWithTimeout";

function apiRoot() {
  return String(BASE_URL || "").replace(/\/$/, "");
}

function adminAuthHeaders() {
  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  if (typeof localStorage !== "undefined") {
    const accessToken = localStorage.getItem(LS_ACCESS_TOKEN);
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

/**
 * Authenticated Geocoding via the admin API (server key). Do not call
 * maps.googleapis.com Geocoding REST from the browser.
 *
 * @param {{ latlng?: string, address?: string }} query
 * @returns {Promise<{ results: Array, status: string }>}
 */
export async function adminGeocode({ latlng, address } = {}) {
  const params = new URLSearchParams();
  if (latlng) params.set("latlng", String(latlng));
  if (address) params.set("address", String(address));

  const res = await fetchWithTimeout(
    `${apiRoot()}/admin/maps/geocode?${params.toString()}`,
    {
      method: "GET",
      headers: adminAuthHeaders(),
      credentials: "include",
    }
  );

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || payload?.status === "0") {
    const err = new Error(
      getHttpResponseErrorMessage(
        res,
        payload,
        payload?.message || "Geocode request failed"
      )
    );
    err.status = res.status;
    err.data = payload;
    throw err;
  }

  return payload?.data || { results: [], status: "UNKNOWN" };
}
