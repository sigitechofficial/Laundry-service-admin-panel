import {
  API_ERROR_CODES,
  classifyApiError,
  getApiErrorMessage,
  normalizeApiError,
} from "./apiErrors";
import { API_REQUEST_TIMEOUT_MS } from "./baseQueryWithReauth";

function toTransportError(err, parentAborted) {
  if (err?.name === "AbortError") {
    if (parentAborted) {
      return Object.assign(new Error("Request was cancelled."), {
        name: "AbortError",
        status: "TIMEOUT_ERROR",
      });
    }
    return normalizeApiError({ status: "TIMEOUT_ERROR" });
  }
  if (err?.status === "TIMEOUT_ERROR" || err?.status === "FETCH_ERROR") {
    return normalizeApiError(err);
  }
  return normalizeApiError({
    status: "FETCH_ERROR",
    error: err?.message,
  });
}

function throwNormalized(normalized) {
  const message = getApiErrorMessage(normalized);
  const error = new Error(message);
  error.status = normalized.status;
  error.data = normalized.data;
  error.normalized = normalized;
  throw error;
}

/**
 * Drop-in fetch wrapper: same URL/payload, shared 30s timeout + apiErrors copy
 * on timeout / offline / network failure. Callers still check response.ok.
 */
export async function fetchWithTimeout(
  input,
  init = {},
  timeoutMs = API_REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const parentSignal = init.signal;
  const onParentAbort = () => controller.abort();

  if (parentSignal) {
    if (parentSignal.aborted) {
      clearTimeout(timeoutId);
      throwNormalized(toTransportError(new DOMException("Aborted", "AbortError"), true));
    }
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    throwNormalized(toTransportError(err, Boolean(parentSignal?.aborted)));
  } finally {
    clearTimeout(timeoutId);
    if (parentSignal) {
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  }
}

/** Build a normalized RTK-shaped error from a raw Response (incl. 429 Retry-After). */
export function normalizeHttpResponseError(response, data) {
  return normalizeApiError({
    status: response?.status,
    data,
    retryAfter: response?.headers?.get?.("Retry-After"),
  });
}

export function getHttpResponseErrorMessage(response, data, fallback) {
  return getApiErrorMessage(normalizeHttpResponseError(response, data), fallback);
}

export function isTransportOrRateLimitError(error) {
  const { code } = classifyApiError(error);
  return (
    code === API_ERROR_CODES.TIMEOUT ||
    code === API_ERROR_CODES.NETWORK ||
    code === API_ERROR_CODES.OFFLINE ||
    code === API_ERROR_CODES.RATE_LIMIT
  );
}
