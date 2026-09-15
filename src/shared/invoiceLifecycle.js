'use strict';

/** Booking invoiceStatus: null/none until the shop drafts or finalizes the invoice. */

export const INVOICE_PHASE = Object.freeze({
  PENDING: "pending",
  DRAFT: "draft",
  FINALIZED: "finalized",
});

export function resolveInvoicePhase(booking) {
  const key = String(booking?.invoiceStatus || "")
    .toLowerCase()
    .trim();
  if (key === "finalized") return INVOICE_PHASE.FINALIZED;
  if (key === "draft") return INVOICE_PHASE.DRAFT;
  return INVOICE_PHASE.PENDING;
}

export function isInvoiceIssued(booking) {
  const phase = resolveInvoicePhase(booking);
  return phase === INVOICE_PHASE.DRAFT || phase === INVOICE_PHASE.FINALIZED;
}

export function invoicePhaseLabel(phase) {
  if (phase === INVOICE_PHASE.FINALIZED) return "Finalized";
  if (phase === INVOICE_PHASE.DRAFT) return "Draft";
  return "Pending";
}
