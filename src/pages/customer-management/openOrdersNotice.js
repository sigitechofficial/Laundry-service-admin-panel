/**
 * Message for open orders after a customer is moved / excluded / unlinked:
 * waiting orders are routed again by the server; orders a shop already
 * accepted are listed so the admin can reassign them from the order page.
 */
export function openOrdersNotice(openOrders) {
  if (!openOrders) return null;
  const still = Array.isArray(openOrders.stillWithOtherShop) ? openOrders.stillWithOtherShop : [];
  const rerouted = Array.isArray(openOrders.rerouted) ? openOrders.rerouted : [];
  const parts = [];
  if (rerouted.length) {
    parts.push(`${rerouted.length} waiting order${rerouted.length > 1 ? "s were" : " was"} offered again.`);
  }
  if (still.length) {
    const ids = still.map((o) => `#${o.orderTrackId || o.bookingId}`).join(", ");
    parts.push(
      `${still.length} accepted order${still.length > 1 ? "s are" : " is"} still with the previous shop (${ids}). Open ${still.length > 1 ? "them" : "it"} in Orders → Assign shop to move.`
    );
  }
  return parts.length ? parts.join(" ") : null;
}
