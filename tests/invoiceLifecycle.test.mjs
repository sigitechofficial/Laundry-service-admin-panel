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
