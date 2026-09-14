/**
 * Shared API error classification for the admin panel.
 * Used by the RTK baseQuery so every query/mutation inherits the same copy.
 */

export const API_ERROR_CODES = {
  TIMEOUT: "TIMEOUT",
  NETWORK: "NETWORK",
  OFFLINE: "OFFLINE",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
  CONFLICT: "CONFLICT",
  RATE_LIMIT: "RATE_LIMIT",
  SERVER: "SERVER",
  UNAVAILABLE: "UNAVAILABLE",
  UNKNOWN: "UNKNOWN",
};

export const API_ERROR_MESSAGES = {
  TIMEOUT: "The request timed out. Please try again.",
  NETWORK: "Unable to reach the server. Check your connection and try again.",
  OFFLINE: "You're offline. Reconnect to load the latest data.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "The requested record was not found.",
  VALIDATION: "Please check the form and try again.",
  CONFLICT: "This change conflicts with existing data.",
  RATE_LIMIT: "Too many requests. Please wait a moment and try again.",
  SERVER: "Something went wrong on our side. Please try again.",
  UNAVAILABLE: "The service is temporarily unavailable. Please try again shortly.",
  UNKNOWN: "Something went wrong. Please try again.",
};

const DUMP_HINTS = /(?:<!DOCTYPE|<html|at\s+\S+\s+\(|Error:\s+Error|Internal Server Error)/i;

function firstString(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value.length) return firstString(value[0]);
  if (value && typeof value === "object") {
    return firstString(value.msg || value.message || value.error);
  }
  return "";
}

export function pickServerMessage(data) {
  if (data == null) return "";
  if (typeof data === "string") {
    return DUMP_HINTS.test(data) ? "" : data.trim();
  }
  if (typeof data !== "object") return "";

  const direct = firstString(data.message || data.error || data.msg || data.detail);
  if (direct && !DUMP_HINTS.test(direct) && direct.length < 280) return direct;

  if (Array.isArray(data.errors) && data.errors.length) {
    const fromList = firstString(data.errors[0]);
    if (fromList && !DUMP_HINTS.test(fromList)) return fromList;
  }

  if (data.errors && typeof data.errors === "object" && !Array.isArray(data.errors)) {
    const first = Object.values(data.errors)[0];
    const fromMap = firstString(first);
    if (fromMap && !DUMP_HINTS.test(fromMap)) return fromMap;
  }

  return "";
}

export function classifyApiError(error) {
  const status = error?.status;

  if (status === "TIMEOUT_ERROR") {
    return { code: API_ERROR_CODES.TIMEOUT, httpStatus: null };
  }

  if (status === "FETCH_ERROR") {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { code: API_ERROR_CODES.OFFLINE, httpStatus: null };
    }
    return { code: API_ERROR_CODES.NETWORK, httpStatus: null };
  }

  const httpStatus = Number(status);
  if (httpStatus === 401) return { code: API_ERROR_CODES.UNAUTHORIZED, httpStatus };
  if (httpStatus === 403) return { code: API_ERROR_CODES.FORBIDDEN, httpStatus };
  if (httpStatus === 404) return { code: API_ERROR_CODES.NOT_FOUND, httpStatus };
  if (httpStatus === 400 || httpStatus === 422) {
    return { code: API_ERROR_CODES.VALIDATION, httpStatus };
  }
  if (httpStatus === 409) return { code: API_ERROR_CODES.CONFLICT, httpStatus };
  if (httpStatus === 429) return { code: API_ERROR_CODES.RATE_LIMIT, httpStatus };
  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
    return { code: API_ERROR_CODES.UNAVAILABLE, httpStatus };
  }
  if (Number.isFinite(httpStatus) && httpStatus >= 500) {
    return { code: API_ERROR_CODES.SERVER, httpStatus };
  }

  return { code: API_ERROR_CODES.UNKNOWN, httpStatus: Number.isFinite(httpStatus) ? httpStatus : null };
}

/**
 * Retry-After may be delta-seconds or an HTTP-date.
 * @returns {number|null} whole seconds, or null if the header is missing/invalid
 */
export function parseRetryAfterSeconds(retryAfter) {
  if (retryAfter == null || retryAfter === "") return null;
  const raw = String(retryAfter).trim();
  if (/^\d+$/.test(raw)) {
    return Number.parseInt(raw, 10);
  }
  const when = Date.parse(raw);
  if (Number.isNaN(when)) return null;
  return Math.max(0, Math.ceil((when - Date.now()) / 1000));
}

export function getRateLimitMessage(retryAfterSeconds) {
  if (retryAfterSeconds == null || retryAfterSeconds <= 0) {
    return API_ERROR_MESSAGES.RATE_LIMIT;
  }
  const seconds = Math.ceil(retryAfterSeconds);
  return `Too many requests. Please wait ${seconds} second${seconds === 1 ? "" : "s"} and try again.`;
}

function readRetryAfterSeconds(error) {
  const data = error?.data;
  if (data && typeof data === "object") {
    if (Number.isFinite(data.retryAfterSeconds)) return data.retryAfterSeconds;
    const fromData = parseRetryAfterSeconds(data.retryAfter);
    if (fromData != null) return fromData;
  }
  return parseRetryAfterSeconds(error?.retryAfter);
}

export function getApiErrorMessage(error, fallback = API_ERROR_MESSAGES.UNKNOWN) {
  if (error == null || error === false) return fallback;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error === true) return fallback;

  const { code } = classifyApiError(error);
  const storedServer = firstString(error?.data?.serverMessage);
  const serverMsg = storedServer || pickServerMessage(error?.data);
  const canned = API_ERROR_MESSAGES[code] || fallback;

  if (code === API_ERROR_CODES.VALIDATION || code === API_ERROR_CODES.CONFLICT) {
    return serverMsg || canned;
  }

  if (code === API_ERROR_CODES.UNAUTHORIZED) {
    if (serverMsg && /invalid|credential|password|email|incorrect|not found|wrong/i.test(serverMsg)) {
      return serverMsg;
    }
    if (serverMsg && !/jwt|token|session|expired|unauthoriz/i.test(serverMsg)) {
      return serverMsg;
    }
    return canned;
  }

  if (code === API_ERROR_CODES.FORBIDDEN && serverMsg && serverMsg.length < 180) {
    return serverMsg;
  }

  if (code === API_ERROR_CODES.NOT_FOUND && serverMsg && serverMsg.length < 180) {
    return serverMsg;
  }

  if (code === API_ERROR_CODES.RATE_LIMIT) {
    return getRateLimitMessage(readRetryAfterSeconds(error));
  }

  return canned;
}

export function normalizeApiError(error) {
  if (!error) return error;

  const originalData = error.data;
  const serverMessage = pickServerMessage(originalData);
  const { code } = classifyApiError(error);
  const retryAfterSeconds = readRetryAfterSeconds(error);
  const dataForMessage =
    originalData && typeof originalData === "object" && !Array.isArray(originalData)
      ? { ...originalData, retryAfterSeconds }
      : { retryAfterSeconds, original: originalData };
  const message = getApiErrorMessage({
    ...error,
    data: dataForMessage,
  });
  const data =
    originalData && typeof originalData === "object" && !Array.isArray(originalData)
      ? { ...originalData, message, code, serverMessage, retryAfterSeconds }
      : { message, code, serverMessage, retryAfterSeconds, original: originalData };

  return {
    ...error,
    data,
    error: message,
  };
}

export function getRequestMethod(args) {
  if (typeof args === "string") return "GET";
  return String(args?.method || "GET").toUpperCase();
}

/**
 * Retry only idempotent GETs on transport failure or gateway errors.
 * Never retry 401/403 or write methods.
 */
export function isRetryableGetError(error, method) {
  if (String(method || "GET").toUpperCase() !== "GET") return false;
  const status = error?.status;
  if (status === 401 || status === 403) return false;
  if (status === "FETCH_ERROR") return true;
  return status === 502 || status === 503 || status === 504;
}
