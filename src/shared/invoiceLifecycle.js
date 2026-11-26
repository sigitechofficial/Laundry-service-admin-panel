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

/**
 * Why there is no invoice to show yet, in words for admin. Only the shop app
 * creates the invoice (as a draft or final) after it has counted the items.
 * @returns {{ title: string, body: string, status: string }}
 */
export function invoiceNotReadyReason(booking) {
  const id = Number(booking?.bookingStatusId);
  const status =
    booking?.bookingStatus?.title || booking?.statusTitle || "";
  const shopStep =
    "The shop creates the invoice in the shop app once it has checked and counted the items. It shows here as soon as they save it as a draft or finish it.";
  let body;
  if (id === 19) {
    body = "This order was cancelled before the shop made an invoice, so there is none to show.";
  } else if (id === 1 || id === 2) {
    body = `The items haven't been collected yet. ${shopStep}`;
  } else if (id >= 3 && id <= 7) {
    body = `The items are still on their way to the shop. ${shopStep}`;
  } else if (id === 8) {
    body = `The items have reached the shop, but the shop hasn't added the services yet. ${shopStep}`;
  } else if (id >= 9) {
    body = `The shop has added the services but hasn't saved the invoice yet (not even as a draft). ${shopStep}`;
  } else {
    body = shopStep;
  }
  return { title: "Invoice not created yet", body, status };
}
