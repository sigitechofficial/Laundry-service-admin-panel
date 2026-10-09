/**
 * Small helpers for the money-moving settlement modals (Cash Settlement list
 * and the shop settlement detail page). Display arithmetic only — the live
 * figures themselves always come from the server.
 */

export const NO_STRIPE_REASON = "This shop has not connected Stripe yet";

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

/** Parsed amount from an input value, or null when it is not a positive number. */
export function parseSettlementAmount(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? round2(n) : null;
}

/** Live figure minus the typed amount (never below 0), or null when the amount is invalid. */
export function figureAfter(current, amount) {
  if (amount == null) return null;
  return Math.max(0, round2(Number(current || 0) - amount));
}

/** Cash the admin can still record: cash due minus what the shop already submitted. */
export function cashStillToRecord(cashDue, pending) {
  return Math.max(0, round2(Number(cashDue || 0) - Number(pending || 0)));
}

/** The server's own message (e.g. lock / duplicate guards), shown verbatim. */
export function settlementErrorMessage(err, fallback = "Action failed") {
  return (
    err?.data?.serverMessage ||
    err?.data?.message ||
    (typeof err?.message === "string" ? err.message : "") ||
    fallback
  );
}
