import {
  fetchWithTimeout,
  getHttpResponseErrorMessage,
} from "../store/services/fetchWithTimeout";
import { BASE_URL } from "./URL";
import { LS_ACCESS_TOKEN } from "./authStorage";

/**
 * Blog assistant goes through POST /admin/gemini/generate.
 * The Gemini key (GEMINI_API_KEY / LAUNDRY_GEMINI_API_KEY) must live on the
 * API host. Do not put it in Vite env — those values are bundled into the SPA
 * and show up in the browser (query strings and Network tab).
 */

function apiRoot() {
  return String(BASE_URL || "").replace(/\/$/, "");
}

export async function generateWithGemini(prompt) {
  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  if (typeof localStorage !== "undefined") {
    const accessToken = localStorage.getItem(LS_ACCESS_TOKEN);
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetchWithTimeout(`${apiRoot()}/admin/gemini/generate`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ prompt }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || payload?.status === "0") {
    throw new Error(
      getHttpResponseErrorMessage(
        res,
        payload,
        payload?.message || "AI generation failed"
      )
    );
  }

  const text = payload?.data?.text;
  if (!text) throw new Error("No text in response");
  return String(text).trim();
}
