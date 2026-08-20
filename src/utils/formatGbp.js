import { formatAmount } from "../utilities/formatters";

/** @deprecated Prefer formatAmount / formatMoney with zone→country resolution. */
export function formatGbp(amount) {
  return formatAmount(amount, null, { applyDefault: true });
}
