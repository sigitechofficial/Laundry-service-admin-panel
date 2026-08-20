import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  API_ERROR_CODES,
  classifyApiError,
} from "../src/store/services/apiErrors.js";
import { isAccessTokenValid } from "../src/utilities/authStorage.js";

function unsignedJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url"
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("classifyApiError", () => {
  it("classifies 403 as FORBIDDEN", () => {
    assert.deepEqual(classifyApiError({ status: 403 }), {
      code: API_ERROR_CODES.FORBIDDEN,
      httpStatus: 403,
    });
  });

  it("classifies 401 as UNAUTHORIZED", () => {
    assert.deepEqual(classifyApiError({ status: 401 }), {
      code: API_ERROR_CODES.UNAUTHORIZED,
      httpStatus: 401,
    });
  });

  it("classifies transport timeout", () => {
    assert.equal(
      classifyApiError({ status: "TIMEOUT_ERROR" }).code,
      API_ERROR_CODES.TIMEOUT
    );
  });
});

describe("isAccessTokenValid", () => {
  it("rejects an expired JWT", () => {
    const token = unsignedJwt({ exp: Math.floor(Date.now() / 1000) - 30 });
    assert.equal(isAccessTokenValid(token), false);
  });

  it("accepts a JWT that has not expired", () => {
    const token = unsignedJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    assert.equal(isAccessTokenValid(token), true);
  });

  it("rejects empty or placeholder tokens", () => {
    assert.equal(isAccessTokenValid(""), false);
    assert.equal(isAccessTokenValid(null), false);
    assert.equal(isAccessTokenValid("undefined"), false);
  });
});
