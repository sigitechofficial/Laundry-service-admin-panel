import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignActionLabel,
  isReassignBooking,
} from "../src/shared/adminAssignGate.js";

describe("isReassignBooking", () => {
  it("shows Assign while the order is still created / not accepted", () => {
    assert.equal(
      isReassignBooking({ bookingStatusId: 1, laundryShopId: 88 }),
      false
    );
    assert.equal(assignActionLabel({ bookingStatusId: 1 }), "Assign");
  });

  it("shows Reassign after a shop has accepted", () => {
    assert.equal(
      isReassignBooking({ bookingStatusId: 3, laundryShopId: 88 }),
      true
    );
    assert.equal(assignActionLabel({ bookingStatusId: 3 }), "Reassign");
  });

  it("does not treat a broadcast shop id as already accepted", () => {
    assert.equal(
      isReassignBooking({
        bookingStatusId: 1,
        laundryShopId: 12,
        adminAssignedShopId: 12,
      }),
      false
    );
  });
});
