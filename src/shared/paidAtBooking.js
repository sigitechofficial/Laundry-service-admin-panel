/**
 * What the customer pays when booking (the "Upfront" figure on order lists).
 *
 * Card: minimum order + service fee + booking tip, the amount held on the card
 * (same sum the shop settlement report uses). Cash: nothing until the invoice.
 * null when the order has no billing yet.
 */
function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function paidAtBooking(booking, billing) {
  const type = String(booking?.paymentType || "card").toLowerCase();
  if (type === "cash") return { cash: true, amount: 0 };
  const minimum = num(billing?.upfrontAmount);
  if (minimum == null) return null;
  const fee = num(billing?.serviceCharge) ?? 0;
  const tip = num(billing?.prepaidTipAmount) ?? 0;
  return { cash: false, amount: Math.round((minimum + fee + tip) * 100) / 100 };
}
