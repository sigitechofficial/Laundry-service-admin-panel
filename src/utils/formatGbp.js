/** Format amount as GBP with exactly two decimal places (e.g. £2.50). */
export function formatGbp(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "£0.00";
  return `£${n.toFixed(2)}`;
}
