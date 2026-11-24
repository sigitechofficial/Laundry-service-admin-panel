// A shop's address needs a full UK postcode (the backend refuses an outward code).
import test from "node:test";
import assert from "node:assert/strict";
import { isFullUkPostcode } from "../src/utilities/postalCodeValidation.js";

test("full UK postcodes pass in any case or spacing", () => {
  for (const pc of ["EC1A 1BB", "ec1a1bb", "  M1   1AE ", "GIR 0AA", "SW1A1AA"]) {
    assert.equal(isFullUkPostcode(pc), true, pc);
  }
});

test("an outward code, a US ZIP or nothing is not an address postcode", () => {
  for (const pc of ["NW1", "EC1A", "12345", "", null, "EC1A 1B"]) {
    assert.equal(isFullUkPostcode(pc), false, String(pc));
  }
});
