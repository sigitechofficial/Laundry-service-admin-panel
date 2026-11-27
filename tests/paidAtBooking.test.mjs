import test from "node:test";
import assert from "node:assert/strict";
import { paidAtBooking } from "../src/shared/paidAtBooking.js";

test("card: minimum + service fee + booking tip", () => {
  assert.deepEqual(
    paidAtBooking({ paymentType: "card" }, { upfrontAmount: "20.00", serviceCharge: "10.00", prepaidTipAmount: "2.50" }),
    { cash: false, amount: 32.5 }
  );
  assert.deepEqual(paidAtBooking({}, { upfrontAmount: 20, serviceCharge: 10 }), { cash: false, amount: 30 }, "no type = card, no tip");
});

test("cash pays nothing at booking", () => {
  assert.deepEqual(paidAtBooking({ paymentType: "Cash" }, { upfrontAmount: 20, serviceCharge: 10 }), { cash: true, amount: 0 });
});

test("no billing yet", () => {
  assert.equal(paidAtBooking({ paymentType: "card" }, null), null);
});
