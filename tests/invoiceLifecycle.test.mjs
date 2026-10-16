import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INVOICE_PHASE,
  invoicePhaseLabel,
  isInvoiceIssued,
  resolveInvoicePhase,
} from "../src/shared/invoiceLifecycle.js";

describe("invoice lifecycle", () => {
  it("treats a new booking as invoice pending", () => {
    assert.equal(resolveInvoicePhase({}), INVOICE_PHASE.PENDING);
    assert.equal(isInvoiceIssued({ invoiceStatus: null }), false);
    assert.equal(invoicePhaseLabel(INVOICE_PHASE.PENDING), "Pending");
  });

  it("treats draft and finalized as issued invoices", () => {
    assert.equal(resolveInvoicePhase({ invoiceStatus: "draft" }), INVOICE_PHASE.DRAFT);
    assert.equal(resolveInvoicePhase({ invoiceStatus: "finalized" }), INVOICE_PHASE.FINALIZED);
    assert.equal(isInvoiceIssued({ invoiceStatus: "draft" }), true);
    assert.equal(isInvoiceIssued({ invoiceStatus: "finalized" }), true);
    assert.equal(invoicePhaseLabel(INVOICE_PHASE.DRAFT), "Draft");
    assert.equal(invoicePhaseLabel(INVOICE_PHASE.FINALIZED), "Finalized");
  });
});

import { invoiceTotals } from "../src/utilities/invoiceTotals.js";

describe("printed invoice totals", () => {
  it("shows before and after discount when there is one (order 1819-892557)", () => {
    assert.deepEqual(invoiceTotals({ totalOrderAmount: 78.75, discount: 30 }), {
      hasDiscount: true, before: 78.75, discount: 30, after: 48.75,
    });
  });
  it("keeps one total without a discount, and never goes below zero", () => {
    assert.equal(invoiceTotals({ totalOrderAmount: 50, discount: 0 }).hasDiscount, false);
    assert.equal(invoiceTotals({ totalOrderAmount: 50, discount: 0 }).after, 50);
    assert.equal(invoiceTotals({ totalOrderAmount: 20, discount: 35 }).after, 0);
  });
});
