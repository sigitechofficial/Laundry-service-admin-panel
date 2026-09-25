/**
 * Returning-customer / order-history helpers for the admin order UI.
 *
 * The backend is the single source of truth for the "Returning customer"
 * threshold (a customer counts as returning at a shop after
 * RETURNING_CUSTOMER_MIN_COMPLETED completed orders there — see
 * constants/bookingStatusIds.js). The frontend only renders the flags/counts
 * it receives, so we never duplicate the threshold logic here.
 *
 * This helper turns a (completed, total, isReturning) triple into a single,
 * human-readable stat used by both the order-detail Customer card and the
 * assign/reassign shop modal, so the wording stays consistent everywhere.
 */

/**
 * @param {object} input
 * @param {number} input.completed - completed orders this customer has at the shop
 * @param {number} input.total     - total orders (any status) at the shop
 * @param {boolean} input.isReturning - backend-computed returning flag
 * @returns {{ tone: 'brand'|'neutral', isReturning: boolean, count: string } | null}
 *   Returns null when the customer has no order history at the shop (nothing to show).
 */
export function customerShopStat({ completed = 0, total = 0, isReturning = false } = {}) {
  const c = Math.max(0, Number(completed) || 0);
  const t = Math.max(0, Number(total) || 0);

  // No prior orders here → caller shows nothing ("first-time at this shop").
  if (t <= 0) return null;

  let count;
  if (c > 0 && t > c) {
    count = `${c} completed · ${t} total`;
  } else if (c > 0) {
    count = `${c} completed order${c === 1 ? "" : "s"}`;
  } else {
    count = `${t} order${t === 1 ? "" : "s"} · none completed yet`;
  }

  return {
    isReturning: Boolean(isReturning),
    tone: isReturning ? "brand" : "neutral",
    count,
  };
}
