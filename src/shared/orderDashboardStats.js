/**
 * Normalizes GET /admin/ordersCount for dashboard StatCards.
 *
 * Definitions (backend):
 * - newOrders: bookingStatusId 1 (Order Created)
 * - activeOrders: in pipeline — not new, completed, cancelled, or on-hold
 * - repeatOrders: bookings whose customer has more than one order
 *
 * Legacy API (stage before deploy): only pendingOrders, completedOrders, etc.
 * - activeOrders falls back to pendingOrders (open pipeline incl. new)
 * - newOrders / repeatOrders need backend fields (show 0 until deployed)
 */
export function getOrderDashboardStats(orderCountsResponse) {
  const d = orderCountsResponse?.data ?? {};
  const has = (key) => Object.prototype.hasOwnProperty.call(d, key);

  const total = toCount(d.allOrderCount);
  const pending = toCount(d.pendingOrders);
  const completed = toCount(d.completedOrders);
  const cancelled = toCount(d.cancelledOrders);
  const onHold = toCount(d.onHoldOrders);

  const hasExtended = !d.ordersCountLegacy;

  let newOrders = toCount(d.newOrders ?? d.NewOrders);
  let activeOrders = toCount(d.activeOrders);
  let repeatOrders = toCount(d.repeatOrders);

  if (d.ordersCountLegacy) {
    if (!has("newOrders") && !has("NewOrders")) {
      newOrders = 0;
    }
    if (!has("activeOrders")) {
      activeOrders = pending;
    }
    if (!has("repeatOrders")) {
      repeatOrders = 0;
    }
  }

  return {
    total,
    newOrders,
    activeOrders,
    repeatOrders,
    pending,
    completed,
    cancelled,
    onHold,
    actionRequired: toCount(d.actionRequiredCount),
    hasExtended,
    /** Sanity: terminal + open buckets (on-hold counted separately on backend) */
    openPipeline: pending,
  };
}

function toCount(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}
